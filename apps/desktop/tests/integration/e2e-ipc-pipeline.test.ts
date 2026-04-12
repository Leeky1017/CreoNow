/**
 * E2E IPC Pipeline Integration Tests — P1-07 closure proof
 *
 * Verifies the complete pipeline from skill invocation through AI execution,
 * permission gate, version snapshot, and document write-back.
 *
 * Tests exercise the WritingOrchestrator directly (the canonical write-back path)
 * using real `createPermissionGate`, real `createToolRegistry`, and mock
 * AI / version-workflow services.
 *
 * INV-1: pre-write snapshot → permission gate → documentWrite → confirmCommit
 * INV-6: all write-back goes through registered tools
 * INV-10: errors produce structured { code, message, retryable } events
 *
 * @see orchestrator.ts — the 9-stage pipeline under test
 * @see permissionGate.ts — real gate used here (not mocked)
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWritingOrchestrator,
  type WritingEvent,
  type WritingRequest,
  type OrchestratorConfig,
} from "../../main/src/services/skills/orchestrator";
import {
  createPermissionGate,
} from "../../main/src/services/skills/permissionGate";
import {
  createToolRegistry,
  buildTool,
  type ToolResult,
} from "../../main/src/services/skills/toolRegistry";
import type { VersionWorkflowService } from "../../main/src/services/documents/versionService";

// ── Helpers ────────────────────────────────────────────────────────────

/** Collect all events from the async generator until it finishes. */
async function drainEvents(
  gen: AsyncGenerator<WritingEvent>,
): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const ev of gen) {
    events.push(ev);
  }
  return events;
}

/** Build a minimal WritingRequest with sensible defaults. */
function makeRequest(overrides: Partial<WritingRequest> = {}): WritingRequest {
  return {
    requestId: overrides.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    skillId: overrides.skillId ?? "builtin:polish",
    documentId: overrides.documentId ?? "doc-e2e-001",
    projectId: overrides.projectId ?? "proj-e2e",
    input: overrides.input ?? { selectedText: "Draft paragraph for testing." },
    ...overrides,
  };
}

/**
 * Create a mock AIService WITHOUT streamChat so the orchestrator
 * falls through to the `generateText` config option.
 *
 * The orchestrator checks `typeof config.aiService.streamChat === "function"`
 * at runtime — when it's undefined the generateText path is selected.
 */
function createMockAiService(): OrchestratorConfig["aiService"] {
  return {
    streamChat: undefined,
    estimateTokens: vi.fn((_text: string) => 42),
    abort: vi.fn(),
  } as unknown as OrchestratorConfig["aiService"];
}

/**
 * Create a mock generateText that resolves with the given fullText.
 * Also calls emitChunk to simulate streaming progress.
 */
function createMockGenerateText(fullText: string) {
  return vi.fn(
    async (args: {
      request: WritingRequest;
      signal: AbortSignal;
      emitChunk: (delta: string, accumulatedTokens: number) => void;
      onApiCallStarted?: () => void;
    }) => {
      args.onApiCallStarted?.();
      // Emit chunks to simulate streaming
      const words = fullText.split(" ");
      let accumulated = 0;
      for (const word of words) {
        const delta = accumulated === 0 ? word : ` ${word}`;
        accumulated += 1;
        args.emitChunk(delta, accumulated);
      }
      return {
        fullText,
        usage: {
          promptTokens: 100,
          completionTokens: words.length,
          totalTokens: 100 + words.length,
          cachedTokens: 0,
        },
        finishReason: "stop" as const,
      };
    },
  );
}

/**
 * Create a mock VersionWorkflowService that tracks calls.
 * Returns success for all operations by default.
 */
function createMockVersionWorkflow(): {
  service: Pick<
    VersionWorkflowService,
    "createPreWriteSnapshot" | "markAiWriting" | "confirmCommit" | "rejectCommit" | "cancelCommit"
  >;
  calls: {
    createPreWriteSnapshot: Array<{ projectId: string; documentId: string; executionId: string }>;
    markAiWriting: string[];
    confirmCommit: Array<{ executionId: string; projectId: string }>;
    rejectCommit: Array<{ executionId: string; projectId: string }>;
    cancelCommit: string[];
  };
} {
  const calls = {
    createPreWriteSnapshot: [] as Array<{ projectId: string; documentId: string; executionId: string }>,
    markAiWriting: [] as string[],
    confirmCommit: [] as Array<{ executionId: string; projectId: string }>,
    rejectCommit: [] as Array<{ executionId: string; projectId: string }>,
    cancelCommit: [] as string[],
  };

  const service: Pick<
    VersionWorkflowService,
    "createPreWriteSnapshot" | "markAiWriting" | "confirmCommit" | "rejectCommit" | "cancelCommit"
  > = {
    createPreWriteSnapshot(args) {
      calls.createPreWriteSnapshot.push(args);
      return {
        ok: true,
        data: {
          stage: "snapshot-created" as const,
          preWriteSnapshotId: `snap-${args.executionId}`,
          documentId: args.documentId,
          executionId: args.executionId,
        },
      };
    },
    markAiWriting(executionId) {
      calls.markAiWriting.push(executionId);
      return {
        ok: true,
        data: {
          stage: "ai-writing" as const,
          preWriteSnapshotId: `snap-${executionId}`,
          documentId: "doc-e2e-001",
          executionId,
        },
      };
    },
    confirmCommit(args) {
      calls.confirmCommit.push(args);
      return {
        ok: true,
        data: {
          stage: "user-confirmed" as const,
          preWriteSnapshotId: `snap-${args.executionId}`,
          documentId: "doc-e2e-001",
          executionId: args.executionId,
        },
      };
    },
    rejectCommit(args) {
      calls.rejectCommit.push(args);
      return {
        ok: true,
        data: {
          stage: "user-rejected" as const,
          preWriteSnapshotId: `snap-${args.executionId}`,
          documentId: "doc-e2e-001",
          executionId: args.executionId,
        },
      };
    },
    cancelCommit(executionId) {
      calls.cancelCommit.push(executionId);
    },
  };

  return { service, calls };
}

/**
 * Build a documentWrite tool that records calls and returns success.
 */
function createMockDocumentWriteTool(
  writeCalls: Array<Record<string, unknown>>,
  options?: { fail?: boolean; failCode?: string },
) {
  return buildTool({
    name: "documentWrite",
    description: "Mock document write for E2E testing",
    isConcurrencySafe: false,
    execute: async (ctx): Promise<ToolResult> => {
      writeCalls.push({ ...ctx });
      if (options?.fail) {
        return {
          success: false,
          error: {
            code: options.failCode ?? "WRITE_BACK_FAILED",
            message: "Mock write failure",
          },
        };
      }
      return {
        success: true,
        data: { versionId: `ver-${ctx.requestId}` },
      };
    },
  });
}

// ── Test Suite ──────────────────────────────────────────────────────────

describe("E2E IPC Pipeline — WritingOrchestrator closed-loop", () => {
  let orchestrator: ReturnType<typeof createWritingOrchestrator>;

  afterEach(() => {
    orchestrator?.dispose();
  });

  // ────────────────────────────────────────────────────────────────────
  // T1: Happy path — full pipeline completes with versionId
  // ────────────────────────────────────────────────────────────────────
  it("happy path: full pipeline produces all 9 stages and returns versionId", async () => {
    const AI_OUTPUT = "Polished paragraph with improved clarity.";
    const request = makeRequest({ requestId: "req-happy-001" });

    // Permission gate — pre-resolve so it grants immediately
    const gate = createPermissionGate();
    gate.resolve(request.requestId, true);

    // Tool registry with mock documentWrite
    const writeCalls: Array<Record<string, unknown>> = [];
    const registry = createToolRegistry();
    registry.register(createMockDocumentWriteTool(writeCalls));

    // Version workflow
    const { service: versionWorkflow, calls: versionCalls } = createMockVersionWorkflow();

    const config: OrchestratorConfig = {
      aiService: createMockAiService(),
      toolRegistry: registry,
      permissionGate: gate,
      postWritingHooks: [
        {
          name: "index-update",
          execute: async () => {},
        },
      ],
      defaultTimeoutMs: 30_000,
      versionWorkflow,
      generateText: createMockGenerateText(AI_OUTPUT),
    };

    orchestrator = createWritingOrchestrator(config);
    const events = await drainEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // ── Stage ordering (INV-1 pipeline) ──
    expect(types).toContain("intent-resolved");
    expect(types).toContain("context-assembled");
    expect(types).toContain("model-selected");
    expect(types).toContain("ai-done");
    expect(types).toContain("permission-requested");
    expect(types).toContain("permission-granted");
    expect(types).toContain("write-back-done");
    expect(types).toContain("hooks-done");

    // Verify stage ordering: permission-requested BEFORE write-back-done
    const permIdx = types.indexOf("permission-requested");
    const wbIdx = types.indexOf("write-back-done");
    expect(permIdx).toBeLessThan(wbIdx);

    // Verify ai-done BEFORE permission-requested
    const aiDoneIdx = types.indexOf("ai-done");
    expect(aiDoneIdx).toBeLessThan(permIdx);

    // Verify write-back-done has versionId
    const wbEvent = events.find((e) => e.type === "write-back-done");
    expect(wbEvent).toBeDefined();
    expect(wbEvent!.versionId).toBe("ver-req-happy-001");

    // ── Version workflow calls (INV-1 snapshot → write → confirm) ──
    expect(versionCalls.createPreWriteSnapshot).toHaveLength(1);
    expect(versionCalls.createPreWriteSnapshot[0]!.executionId).toBe(request.requestId);
    expect(versionCalls.markAiWriting).toHaveLength(1);
    expect(versionCalls.confirmCommit).toHaveLength(1);
    expect(versionCalls.confirmCommit[0]!.executionId).toBe(request.requestId);

    // ── documentWrite tool was called exactly once ──
    expect(writeCalls).toHaveLength(1);
    expect(writeCalls[0]!.documentId).toBe(request.documentId);
    expect(writeCalls[0]!.content).toBe(AI_OUTPUT);

    // ── AI output captured in ai-done event ──
    const aiDoneEvent = events.find((e) => e.type === "ai-done");
    expect(aiDoneEvent).toBeDefined();
    expect(aiDoneEvent!.fullText).toBe(AI_OUTPUT);

    // ── Task state is completed ──
    expect(orchestrator.getTaskState(request.requestId)).toBe("completed");
  });

  // ────────────────────────────────────────────────────────────────────
  // T2: Permission denied — no write, no version commit
  // ────────────────────────────────────────────────────────────────────
  it("permission denied: no document write, no version commit", async () => {
    const request = makeRequest({ requestId: "req-denied-002" });

    // Permission gate — pre-resolve as denied
    const gate = createPermissionGate();
    gate.resolve(request.requestId, false);

    // Tool registry — documentWrite should NOT be called
    const writeCalls: Array<Record<string, unknown>> = [];
    const registry = createToolRegistry();
    registry.register(createMockDocumentWriteTool(writeCalls));

    const { service: versionWorkflow, calls: versionCalls } = createMockVersionWorkflow();

    const config: OrchestratorConfig = {
      aiService: createMockAiService(),
      toolRegistry: registry,
      permissionGate: gate,
      postWritingHooks: [],
      defaultTimeoutMs: 30_000,
      versionWorkflow,
      generateText: createMockGenerateText("This should never be written."),
    };

    orchestrator = createWritingOrchestrator(config);
    const events = await drainEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // Should emit permission-denied
    expect(types).toContain("permission-requested");
    expect(types).toContain("permission-denied");

    // Should NOT emit write-back-done or hooks-done
    expect(types).not.toContain("permission-granted");
    expect(types).not.toContain("write-back-done");
    expect(types).not.toContain("hooks-done");

    // documentWrite was never called (INV-1: fail-closed)
    expect(writeCalls).toHaveLength(0);

    // Pre-write snapshot was created (happens before permission request),
    // but confirmCommit was NOT called
    expect(versionCalls.createPreWriteSnapshot).toHaveLength(1);
    expect(versionCalls.confirmCommit).toHaveLength(0);
    expect(versionCalls.rejectCommit).toHaveLength(0);

    // cancelCommit is called in finally
    expect(versionCalls.cancelCommit).toHaveLength(1);
  });

  // ────────────────────────────────────────────────────────────────────
  // T3: AI error → structured error event, no partial writes
  // ────────────────────────────────────────────────────────────────────
  it("AI error: yields structured error event with no partial writes (INV-10)", async () => {
    const request = makeRequest({ requestId: "req-ai-err-003" });

    const gate = createPermissionGate();
    // No pre-resolve — gate should never be reached

    const writeCalls: Array<Record<string, unknown>> = [];
    const registry = createToolRegistry();
    registry.register(createMockDocumentWriteTool(writeCalls));

    const { service: versionWorkflow, calls: versionCalls } = createMockVersionWorkflow();

    // generateText that throws an error on all retries
    const failingGenerateText = vi.fn(async () => {
      throw Object.assign(new Error("Model unavailable — rate limit exceeded"), {
        code: "AI_RATE_LIMIT",
      });
    });

    const config: OrchestratorConfig = {
      aiService: createMockAiService(),
      toolRegistry: registry,
      permissionGate: gate,
      postWritingHooks: [],
      defaultTimeoutMs: 30_000,
      versionWorkflow,
      generateText: failingGenerateText,
    };

    orchestrator = createWritingOrchestrator(config);
    const events = await drainEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // Pipeline should reach intent-resolved, context-assembled, model-selected, then error
    expect(types).toContain("intent-resolved");
    expect(types).toContain("context-assembled");
    expect(types).toContain("model-selected");

    // Error event must be present (INV-10)
    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.error).toBeDefined();
    const err = errorEvent!.error as { code: string; message: string; retryable: boolean };
    expect(typeof err.code).toBe("string");
    expect(err.code.length).toBeGreaterThan(0);
    expect(typeof err.message).toBe("string");
    expect(err.message.length).toBeGreaterThan(0);
    expect(typeof err.retryable).toBe("boolean");

    // No writes occurred (fail-closed)
    expect(writeCalls).toHaveLength(0);
    expect(types).not.toContain("permission-requested");
    expect(types).not.toContain("write-back-done");

    // Version workflow was never called (AI failed before snapshot)
    expect(versionCalls.createPreWriteSnapshot).toHaveLength(0);
    expect(versionCalls.confirmCommit).toHaveLength(0);

    // Task state is failed
    expect(orchestrator.getTaskState(request.requestId)).toBe("failed");
  });

  // ────────────────────────────────────────────────────────────────────
  // T4: Event ordering — permission-requested comes BEFORE write-back-done
  // ────────────────────────────────────────────────────────────────────
  it("permission-requested is emitted BEFORE write-back-done (INV-1 ordering)", async () => {
    const request = makeRequest({ requestId: "req-order-004" });

    // Use onPermissionRequested callback to resolve gate asynchronously
    // This simulates the real IPC flow where user grants permission
    const gate = createPermissionGate({
      onPermissionRequested: async (req) => {
        // Resolve after the permission-requested event has been yielded
        // (onPermissionRequested fires after the event)
        gate.resolve(req.requestId, true);
      },
    });

    const writeCalls: Array<Record<string, unknown>> = [];
    const registry = createToolRegistry();
    registry.register(createMockDocumentWriteTool(writeCalls));
    const { service: versionWorkflow } = createMockVersionWorkflow();

    const config: OrchestratorConfig = {
      aiService: createMockAiService(),
      toolRegistry: registry,
      permissionGate: gate,
      postWritingHooks: [],
      defaultTimeoutMs: 30_000,
      versionWorkflow,
      generateText: createMockGenerateText("Result text"),
    };

    orchestrator = createWritingOrchestrator(config);

    // Collect events one by one to verify exact ordering
    const eventTypes: string[] = [];
    const gen = orchestrator.execute(request);
    for await (const ev of gen) {
      eventTypes.push(ev.type);
    }

    // The canonical INV-1 ordering:
    // intent-resolved → context-assembled → model-selected → ai-chunk* →
    // ai-done → permission-requested → permission-granted → write-back-done → hooks-done
    const coreSequence = eventTypes.filter((t) =>
      [
        "intent-resolved",
        "context-assembled",
        "model-selected",
        "ai-done",
        "permission-requested",
        "permission-granted",
        "write-back-done",
        "hooks-done",
      ].includes(t),
    );

    expect(coreSequence).toEqual([
      "intent-resolved",
      "context-assembled",
      "model-selected",
      "ai-done",
      "permission-requested",
      "permission-granted",
      "write-back-done",
      "hooks-done",
    ]);

    // Verify documentWrite was called (proving the pipeline completed)
    expect(writeCalls).toHaveLength(1);
  });

  // ────────────────────────────────────────────────────────────────────
  // T5: Pipeline enforcement — all events in correct order, INV-1 snapshot-before-gate
  // ────────────────────────────────────────────────────────────────────
  it("pipeline enforcement: version snapshot created BEFORE permission gate", async () => {
    const request = makeRequest({ requestId: "req-enforce-005", projectId: "proj-enforce" });

    // Track exact call ordering across version workflow + permission gate
    const callOrder: string[] = [];

    const gate = createPermissionGate({
      onPermissionRequested: async (req) => {
        callOrder.push("permission-requested");
        gate.resolve(req.requestId, true);
      },
    });

    const writeCalls: Array<Record<string, unknown>> = [];
    const registry = createToolRegistry();
    registry.register(
      buildTool({
        name: "documentWrite",
        description: "Tracking documentWrite",
        isConcurrencySafe: false,
        execute: async (ctx): Promise<ToolResult> => {
          callOrder.push("documentWrite");
          writeCalls.push({ ...ctx });
          return { success: true, data: { versionId: `ver-${ctx.requestId}` } };
        },
      }),
    );

    // Create version workflow that tracks call order
    const versionWorkflow: OrchestratorConfig["versionWorkflow"] = {
      createPreWriteSnapshot(args) {
        callOrder.push("createPreWriteSnapshot");
        return {
          ok: true,
          data: {
            stage: "snapshot-created" as const,
            preWriteSnapshotId: `snap-${args.executionId}`,
            documentId: args.documentId,
            executionId: args.executionId,
          },
        };
      },
      markAiWriting(executionId) {
        callOrder.push("markAiWriting");
        return {
          ok: true,
          data: {
            stage: "ai-writing" as const,
            preWriteSnapshotId: `snap-${executionId}`,
            documentId: "doc-e2e-001",
            executionId,
          },
        };
      },
      confirmCommit(args) {
        callOrder.push("confirmCommit");
        return {
          ok: true,
          data: {
            stage: "user-confirmed" as const,
            preWriteSnapshotId: `snap-${args.executionId}`,
            documentId: "doc-e2e-001",
            executionId: args.executionId,
          },
        };
      },
      rejectCommit(args) {
        callOrder.push("rejectCommit");
        return {
          ok: true,
          data: {
            stage: "user-rejected" as const,
            preWriteSnapshotId: `snap-${args.executionId}`,
            documentId: "doc-e2e-001",
            executionId: args.executionId,
          },
        };
      },
      cancelCommit(_executionId) {
        callOrder.push("cancelCommit");
      },
    };

    const config: OrchestratorConfig = {
      aiService: createMockAiService(),
      toolRegistry: registry,
      permissionGate: gate,
      postWritingHooks: [
        {
          name: "search-reindex",
          execute: async () => {
            callOrder.push("hook:search-reindex");
          },
        },
      ],
      defaultTimeoutMs: 30_000,
      versionWorkflow,
      generateText: createMockGenerateText("Enforced pipeline output"),
    };

    orchestrator = createWritingOrchestrator(config);
    const events = await drainEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // ── INV-1 call ordering: snapshot → permission → markAiWriting → documentWrite → confirmCommit ──
    const snapshotIdx = callOrder.indexOf("createPreWriteSnapshot");
    const permissionIdx = callOrder.indexOf("permission-requested");
    const markIdx = callOrder.indexOf("markAiWriting");
    const writeIdx = callOrder.indexOf("documentWrite");
    const confirmIdx = callOrder.indexOf("confirmCommit");

    expect(snapshotIdx).toBeGreaterThanOrEqual(0);
    expect(permissionIdx).toBeGreaterThanOrEqual(0);
    expect(markIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(confirmIdx).toBeGreaterThanOrEqual(0);

    // Snapshot MUST be created before permission is requested
    expect(snapshotIdx).toBeLessThan(permissionIdx);

    // markAiWriting happens after permission is granted
    expect(markIdx).toBeGreaterThan(permissionIdx);

    // documentWrite happens after markAiWriting
    expect(writeIdx).toBeGreaterThan(markIdx);

    // confirmCommit happens after documentWrite
    expect(confirmIdx).toBeGreaterThan(writeIdx);

    // Post-writing hook runs after confirmCommit
    const hookIdx = callOrder.indexOf("hook:search-reindex");
    expect(hookIdx).toBeGreaterThan(confirmIdx);

    // cancelCommit is called in finally block (cleanup)
    expect(callOrder).toContain("cancelCommit");

    // Pipeline completed successfully
    expect(types).toContain("hooks-done");
    const hooksEvent = events.find((e) => e.type === "hooks-done");
    expect(hooksEvent).toBeDefined();
    expect((hooksEvent as WritingEvent & { executed: string[] }).executed).toContain("search-reindex");
  });
});
