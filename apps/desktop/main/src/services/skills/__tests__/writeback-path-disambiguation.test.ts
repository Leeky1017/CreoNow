/**
 * Write-back path disambiguation tests (Issue #109)
 *
 * Verifies that the WritingOrchestrator is the SINGLE canonical path for
 * AI-output write-back to documents.  These tests enforce:
 *
 *   INV-1 — Permission Gate + pre-write snapshot before every write
 *   INV-6 — All write-back uses the registered `documentWrite` tool
 *   INV-7 — Unified entry through IPC → orchestrator pipeline
 *
 * The tests prove that:
 *   1. Only `documentWrite` tool performs the actual write
 *   2. The orchestrator enforces `auto-allow → preview-confirm` independently
 *   3. Pre-write snapshot always precedes documentWrite
 *   4. Removing the IPC-level override does not change observable behaviour
 */

import { describe, it, expect, vi, afterEach } from "vitest";

import type {
  WritingOrchestrator,
  WritingRequest,
  WritingEvent,
  OrchestratorConfig,
} from "../orchestrator";
import { createWritingOrchestrator } from "../orchestrator";
import { createToolRegistry } from "../toolRegistry";
import type {
  BudgetAlert,
  BudgetPolicy,
  CostTracker,
  ModelPricingTable,
  RequestCost,
  SessionCostSummary,
} from "../../ai/costTracker";

// ─── helpers (mirrors writing-orchestrator.test.ts) ─────────────────

async function collectEvents(
  gen: AsyncGenerator<WritingEvent>,
): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

function eventTypes(events: WritingEvent[]): string[] {
  return events.map((e) => e.type);
}

function makeRequest(overrides: Partial<WritingRequest> = {}): WritingRequest {
  return {
    requestId: "req-wb-001",
    skillId: "polish",
    input: { selectedText: "需要润色的文字。" },
    documentId: "doc-wb-001",
    selection: {
      from: 0,
      to: 8,
      text: "需要润色的文字。",
      selectionTextHash: "wb-hash-001",
    },
    ...overrides,
  };
}

function createMockAIService() {
  const chunks = [
    { delta: "润色", finishReason: null, accumulatedTokens: 2 } as const,
    { delta: "后的", finishReason: null, accumulatedTokens: 4 } as const,
    { delta: "文字。", finishReason: "stop", accumulatedTokens: 6 } as const,
  ];

  async function* mockStreamChat(options?: { onApiCallStarted?: () => void }) {
    options?.onApiCallStarted?.();
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  return {
    streamChat: vi
      .fn()
      .mockImplementation((_messages: unknown, options: { onApiCallStarted?: () => void }) =>
        mockStreamChat(options),
      ),
    estimateTokens: vi.fn().mockReturnValue(10),
    abort: vi.fn(),
  };
}

function createMockCostTracker(
  overrides: Partial<CostTracker> = {},
): CostTracker {
  return {
    recordUsage: vi.fn().mockReturnValue({
      requestId: "req-wb-001",
      modelId: "default",
      inputTokens: 10,
      outputTokens: 6,
      cachedTokens: 0,
      cost: 0.012,
      skillId: "polish",
      timestamp: Date.now(),
    } satisfies RequestCost),
    getSessionCost: vi.fn().mockReturnValue({
      totalCost: 0.012,
      totalRequests: 1,
      totalInputTokens: 10,
      totalOutputTokens: 6,
      totalCachedTokens: 0,
      costByModel: { default: { cost: 0.012, requests: 1 } },
      costBySkill: { polish: { cost: 0.012, requests: 1 } },
      sessionStartedAt: 1000,
    } satisfies SessionCostSummary),
    getRequestCost: vi.fn().mockReturnValue(null),
    getPricingTable: vi.fn().mockReturnValue({
      currency: "USD",
      lastUpdated: "2025-01-01T00:00:00.000Z",
      prices: {},
    } satisfies ModelPricingTable),
    getBudgetPolicy: vi.fn().mockReturnValue({
      warningThreshold: 1,
      hardStopLimit: 5,
      enabled: true,
    } satisfies BudgetPolicy),
    listRecords: vi.fn().mockReturnValue([]),
    checkBudget: vi.fn().mockReturnValue(null as BudgetAlert | null),
    estimateCost: vi.fn().mockReturnValue(0.012),
    onBudgetAlert: vi.fn().mockReturnValue(() => {}),
    onCostRecorded: vi.fn().mockReturnValue(() => {}),
    updatePricingTable: vi
      .fn()
      .mockImplementation((_table: ModelPricingTable) => {}),
    updateBudgetPolicy: vi
      .fn()
      .mockImplementation((_policy: BudgetPolicy) => {}),
    resetSession: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  };
}

/** Build OrchestratorConfig with call-order tracking on key tools */
function buildTrackedConfig(
  overrides: Omit<Partial<OrchestratorConfig>, "permissionGate"> & {
    permissionGate?: Partial<OrchestratorConfig["permissionGate"]>;
  } = {},
) {
  const { permissionGate: permissionGateOverride, ...restOverrides } =
    overrides;
  const callOrder: string[] = [];

  const toolRegistry = createToolRegistry();

  const documentWriteExecute = vi.fn().mockImplementation(async () => {
    callOrder.push("documentWrite");
    return { success: true, data: { versionId: "snap-accept-wb-001" } };
  });
  const versionSnapshotExecute = vi.fn().mockImplementation(async () => {
    callOrder.push("versionSnapshot");
    return { success: true, data: { versionId: "snap-prewrite-wb-001" } };
  });

  toolRegistry.register({
    name: "documentRead",
    description: "Read document text",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
  });
  toolRegistry.register({
    name: "documentWrite",
    description: "Write text to document",
    isConcurrencySafe: false,
    execute: documentWriteExecute,
  });
  toolRegistry.register({
    name: "versionSnapshot",
    description: "Create version snapshot",
    isConcurrencySafe: false,
    execute: versionSnapshotExecute,
  });

  const requestPermission = vi.fn().mockImplementation(async () => {
    callOrder.push("requestPermission");
    return true;
  });
  const evaluate = vi.fn().mockResolvedValue({
    level: "preview-confirm",
    granted: false,
  });

  const config: OrchestratorConfig = {
    aiService: createMockAIService(),
    toolRegistry,
    permissionGate: {
      confirmTimeoutMs: 120_000,
      evaluate,
      requestPermission,
      releasePendingPermission: vi.fn(),
      ...(permissionGateOverride ?? {}),
    },
    postWritingHooks: [],
    defaultTimeoutMs: 30_000,
    costTracker: createMockCostTracker(),
    ...restOverrides,
  };

  return {
    config,
    callOrder,
    mocks: {
      documentWriteExecute,
      versionSnapshotExecute,
      requestPermission,
      evaluate,
    },
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("Write-back Path Disambiguation (Issue #109)", () => {
  let orchestrator: WritingOrchestrator;

  afterEach(() => {
    orchestrator?.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── INV-1: Single canonical write-back path ────────────────────

  describe("INV-1: documentWrite is the single write-back tool", () => {
    it("only documentWrite.execute is called for the write — no other write occurs", async () => {
      vi.useFakeTimers();
      const { config, mocks } = buildTrackedConfig();
      orchestrator = createWritingOrchestrator(config);

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // documentWrite was called exactly once
      expect(mocks.documentWriteExecute).toHaveBeenCalledTimes(1);

      // write-back-done event is present
      expect(types).toContain("write-back-done");

      // The write-back-done event has the versionId from documentWrite
      const wbEvent = events.find((e) => e.type === "write-back-done") as
        | (WritingEvent & { type: "write-back-done" })
        | undefined;
      expect(wbEvent).toBeDefined();
      expect(wbEvent!.versionId).toBe("snap-accept-wb-001");
    });

    it("without documentWrite registered, write-back fails gracefully (no silent fallback)", async () => {
      vi.useFakeTimers();
      const { config } = buildTrackedConfig();
      // Remove the documentWrite tool
      const toolRegistry = createToolRegistry();
      toolRegistry.register({
        name: "documentRead",
        description: "Read document text",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
      });
      toolRegistry.register({
        name: "versionSnapshot",
        description: "Create version snapshot",
        isConcurrencySafe: false,
        execute: vi
          .fn()
          .mockResolvedValue({
            success: true,
            data: { versionId: "snap-001" },
          }),
      });
      config.toolRegistry = toolRegistry;

      orchestrator = createWritingOrchestrator(config);
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // No write-back-done event — the pipeline failed
      expect(types).not.toContain("write-back-done");
      // An error event should be present
      expect(types).toContain("error");

      // Error mentions missing documentWrite tool
      const errorEvent = events.find((e) => e.type === "error") as
        | (WritingEvent & { type: "error"; error: { message: string } })
        | undefined;
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.error.message).toMatch(/documentWrite/);
    });
  });

  // ── INV-1: Pre-write snapshot ordering ─────────────────────────

  describe("INV-1: Pre-write snapshot precedes documentWrite", () => {
    it("versionSnapshot is called BEFORE documentWrite", async () => {
      vi.useFakeTimers();
      const { config, callOrder } = buildTrackedConfig();
      orchestrator = createWritingOrchestrator(config);

      await collectEvents(orchestrator.execute(makeRequest()));

      const snapshotIndex = callOrder.indexOf("versionSnapshot");
      const writeIndex = callOrder.indexOf("documentWrite");

      expect(snapshotIndex).toBeGreaterThanOrEqual(0);
      expect(writeIndex).toBeGreaterThan(snapshotIndex);
    });

    it("permission is requested BEFORE documentWrite", async () => {
      vi.useFakeTimers();
      const { config, callOrder } = buildTrackedConfig();
      orchestrator = createWritingOrchestrator(config);

      await collectEvents(orchestrator.execute(makeRequest()));

      const permIndex = callOrder.indexOf("requestPermission");
      const writeIndex = callOrder.indexOf("documentWrite");

      expect(permIndex).toBeGreaterThanOrEqual(0);
      expect(writeIndex).toBeGreaterThan(permIndex);
    });

    it("full invariant ordering: snapshot → permission → write", async () => {
      vi.useFakeTimers();
      const { config, callOrder } = buildTrackedConfig();
      orchestrator = createWritingOrchestrator(config);

      await collectEvents(orchestrator.execute(makeRequest()));

      expect(callOrder).toEqual([
        "versionSnapshot",
        "requestPermission",
        "documentWrite",
      ]);
    });
  });

  // ── INV-1: Orchestrator as single permission authority ─────────

  describe("INV-1: Orchestrator enforces permission independently of IPC", () => {
    it("auto-allow level is escalated to preview-confirm by the orchestrator", async () => {
      vi.useFakeTimers();
      const { config, mocks } = buildTrackedConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({
            level: "auto-allow",
            granted: true,
          }),
        },
      });
      orchestrator = createWritingOrchestrator(config);

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // Even though evaluate returned auto-allow + granted, the orchestrator
      // should still emit permission-requested (because it escalates)
      expect(types).toContain("permission-requested");

      // requestPermission should still have been called
      expect(mocks.requestPermission).toHaveBeenCalled();
    });

    it("permission denied → no documentWrite, no write-back-done", async () => {
      vi.useFakeTimers();
      const { config, mocks } = buildTrackedConfig({
        permissionGate: {
          requestPermission: vi.fn().mockResolvedValue(false),
        },
      });
      orchestrator = createWritingOrchestrator(config);

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      expect(types).toContain("permission-denied");
      expect(types).not.toContain("write-back-done");
      expect(mocks.documentWriteExecute).not.toHaveBeenCalled();
    });

    it("request.level=auto-allow passed from IPC is still escalated by orchestrator", async () => {
      vi.useFakeTimers();
      // Simulate IPC passing auto-allow (as if IPC did NOT override it)
      const { config } = buildTrackedConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({
            level: "auto-allow",
            granted: true,
          }),
        },
      });
      orchestrator = createWritingOrchestrator(config);

      const events = await collectEvents(
        orchestrator.execute(makeRequest({ level: "auto-allow" as never })),
      );
      const permEvent = events.find(
        (e) => e.type === "permission-requested",
      ) as (WritingEvent & { type: "permission-requested"; level: string }) | undefined;

      // The orchestrator should have escalated auto-allow → preview-confirm
      expect(permEvent).toBeDefined();
      expect(permEvent!.level).not.toBe("auto-allow");
    });
  });

  // ── INV-6: Write-back uses registered tool ─────────────────────

  describe("INV-6: All write-back goes through tool registry", () => {
    it("documentWrite tool receives the correct parameters", async () => {
      vi.useFakeTimers();
      const { config, mocks } = buildTrackedConfig();
      orchestrator = createWritingOrchestrator(config);

      const request = makeRequest({
        projectId: "proj-001",
        documentId: "doc-wb-001",
      });
      await collectEvents(orchestrator.execute(request));

      expect(mocks.documentWriteExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-wb-001",
          requestId: "req-wb-001",
        }),
      );
    });

    it("documentWrite failure produces failure event (no silent swallow)", async () => {
      vi.useFakeTimers();
      const { config } = buildTrackedConfig();

      // Override documentWrite to fail
      const failingToolRegistry = createToolRegistry();
      failingToolRegistry.register({
        name: "documentRead",
        description: "Read document text",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
      });
      failingToolRegistry.register({
        name: "documentWrite",
        description: "Write text to document",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: {
            code: "DB_ERROR",
            message: "Database write failed",
            retryable: true,
          },
        }),
      });
      failingToolRegistry.register({
        name: "versionSnapshot",
        description: "Create version snapshot",
        isConcurrencySafe: false,
        execute: vi
          .fn()
          .mockResolvedValue({
            success: true,
            data: { versionId: "snap-001" },
          }),
      });
      config.toolRegistry = failingToolRegistry;

      orchestrator = createWritingOrchestrator(config);
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      expect(types).not.toContain("write-back-done");
      expect(types).toContain("error");

      const errorEvent = events.find((e) => e.type === "error") as
        | (WritingEvent & { type: "error"; error: { code: string } })
        | undefined;
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.error.code).toBe("DB_ERROR");
    });
  });

  // ── No snapshot → no write ─────────────────────────────────────

  describe("INV-1: No snapshot → no write", () => {
    it("if versionSnapshot fails, documentWrite is never called", async () => {
      vi.useFakeTimers();
      const { config, mocks } = buildTrackedConfig();

      // Override versionSnapshot to fail
      const failingToolRegistry = createToolRegistry();
      failingToolRegistry.register({
        name: "documentRead",
        description: "Read document text",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
      });
      failingToolRegistry.register({
        name: "documentWrite",
        description: "Write text to document",
        isConcurrencySafe: false,
        execute: mocks.documentWriteExecute,
      });
      failingToolRegistry.register({
        name: "versionSnapshot",
        description: "Create version snapshot",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: {
            code: "SNAPSHOT_FAILED",
            message: "Could not create snapshot",
            retryable: false,
          },
        }),
      });
      config.toolRegistry = failingToolRegistry;

      orchestrator = createWritingOrchestrator(config);
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // Write never happened
      expect(mocks.documentWriteExecute).not.toHaveBeenCalled();
      expect(types).not.toContain("write-back-done");
      expect(types).toContain("error");
    });
  });
});
