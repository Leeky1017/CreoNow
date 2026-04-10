/**
 * WritingOrchestrator P1 测试
 * Spec: openspec/specs/skill-system/spec.md — P1 Pipeline Engine
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 9 阶段管线、中止链路、权限门禁、错误恢复、任务状态机。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// ─── helpers ────────────────────────────────────────────────────────

/** Collect all events from an async generator */
async function collectEvents(
  gen: AsyncGenerator<WritingEvent>,
): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

/** Extract event types in order */
function eventTypes(events: WritingEvent[]): string[] {
  return events.map((e) => e.type);
}

/** Build a minimal WritingRequest */
function makeRequest(overrides: Partial<WritingRequest> = {}): WritingRequest {
  return {
    requestId: "req-001",
    skillId: "polish",
    input: { selectedText: "这是一段需要润色的文字。" },
    documentId: "doc-001",
    selection: { from: 0, to: 12, text: "这是一段需要润色的文字。", selectionTextHash: "abc123" },
    ...overrides,
  };
}

/** Create mock AIServiceAdapter */
function createMockAIService() {
  const chunks = [
    { delta: "润色", finishReason: null, accumulatedTokens: 2 } as const,
    { delta: "后的", finishReason: null, accumulatedTokens: 4 } as const,
    { delta: "文字。", finishReason: "stop", accumulatedTokens: 6 } as const,
  ];

  async function* mockStreamChat() {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  return {
    streamChat: vi.fn().mockImplementation(() => mockStreamChat()),
    estimateTokens: vi.fn().mockReturnValue(10),
    abort: vi.fn(),
  };
}

/** Create mock PermissionGate */
function createMockPermissionGate(autoGrant = true) {
  return {
    evaluate: vi.fn().mockResolvedValue(
      autoGrant ? { level: "preview-confirm", granted: true } : { level: "must-confirm-snapshot", granted: false },
    ),
    requestPermission: vi.fn().mockResolvedValue(autoGrant),
    releasePendingPermission: vi.fn(),
  };
}

function createTrackablePermissionGate() {
  const pending = new Map<string, (granted: boolean) => void>();

  return {
    pending,
    evaluate: vi.fn().mockResolvedValue({
      level: "must-confirm-snapshot",
      granted: false,
    }),
    requestPermission: vi.fn().mockImplementation((request: { requestId?: string }) => {
      const requestId = request.requestId ?? "";
      return new Promise<boolean>((resolve) => {
        pending.set(requestId, resolve);
      });
    }),
    releasePendingPermission: vi.fn().mockImplementation((requestId: string) => {
      pending.delete(requestId);
    }),
    settle(requestId: string, granted: boolean) {
      const resolver = pending.get(requestId);
      pending.delete(requestId);
      resolver?.(granted);
    },
  };
}

/** Create mock post-writing hook */
function createMockHook(name: string) {
  return {
    name,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockCostTracker(
  overrides: Partial<CostTracker> = {},
): CostTracker {
  return {
    recordUsage: vi.fn().mockReturnValue({
      requestId: "req-001",
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
    updatePricingTable: vi.fn().mockImplementation((_table: ModelPricingTable) => {}),
    updateBudgetPolicy: vi.fn().mockImplementation((_policy: BudgetPolicy) => {}),
    resetSession: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  };
}

/** Build OrchestratorConfig with mocks */
function buildConfig(
  overrides: Partial<OrchestratorConfig> = {},
): OrchestratorConfig {
  const toolRegistry = createToolRegistry();
  // Register V1 built-in tools
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
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "snap-accept-001" } }),
  });
  toolRegistry.register({
    name: "versionSnapshot",
    description: "Create version snapshot",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "snap-prewrite-001" } }),
  });

  return {
    aiService: createMockAIService(),
    toolRegistry,
    permissionGate: createMockPermissionGate(),
    postWritingHooks: [createMockHook("auto-save-version")],
    defaultTimeoutMs: 30_000,
    costTracker: createMockCostTracker(),
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("WritingOrchestrator", () => {
  let orchestrator: WritingOrchestrator;
  let config: OrchestratorConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    config = buildConfig();
    orchestrator = createWritingOrchestrator(config);
  });

  afterEach(() => {
    orchestrator.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── 管线全链路 ──────────────────────────────────────────────────

  describe("Pipeline — 全链路", () => {
    it("execute(润色请求) → 依次产出完整事件序列直至 complete", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));

      const types = eventTypes(events);
      expect(types).toEqual([
        "intent-resolved",
        "context-assembled",
        "model-selected",
        "ai-chunk",
        "ai-chunk",
        "ai-chunk",
        "ai-done",
        "cost-recorded",
        "permission-requested",
        "permission-granted",
        "write-back-done",
        "hooks-done",
      ]);
    });

    it("intent-resolved 事件包含正确的 skillId", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const intentEvent = events.find((e) => e.type === "intent-resolved");

      expect(intentEvent).toBeDefined();
      expect(intentEvent).toMatchObject({
        type: "intent-resolved",
        skillId: "polish",
      });
    });

    it("context-assembled 事件包含 tokenCount", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const ctxEvent = events.find((e) => e.type === "context-assembled");

      expect(ctxEvent).toBeDefined();
      expect(ctxEvent).toHaveProperty("tokenCount");
      expect((ctxEvent as unknown as { tokenCount: number }).tokenCount).toBeGreaterThan(0);
    });

    it("ai-done 事件包含完整文本和 usage", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const doneEvent = events.find((e) => e.type === "ai-done") as
        | (WritingEvent & { type: "ai-done" })
        | undefined;

      expect(doneEvent).toBeDefined();
      expect(doneEvent!.fullText).toBe("润色后的文字。");
      expect(doneEvent!.usage).toMatchObject({
        promptTokens: expect.any(Number),
        completionTokens: expect.any(Number),
        totalTokens: expect.any(Number),
      });
    });

    it("ai-done 后记录费用并产出 cost-recorded", async () => {
      const tracker = createMockCostTracker();
      orchestrator = createWritingOrchestrator(
        buildConfig({ costTracker: tracker }),
      );

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const costEvent = events.find((event) => event.type === "cost-recorded");

      expect(tracker.recordUsage).toHaveBeenCalledWith(
        { promptTokens: 10, completionTokens: 6, totalTokens: 16 },
        "default",
        "req-001",
        "polish",
      );
      expect(costEvent).toMatchObject({
        type: "cost-recorded",
        requestCost: 0.012,
        sessionTotalCost: 0.012,
      });
    });

    it("write-back-done 事件包含 versionId", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const writeEvent = events.find((e) => e.type === "write-back-done") as
        | (WritingEvent & { type: "write-back-done" })
        | undefined;

      expect(writeEvent).toBeDefined();
      expect(writeEvent!.versionId).toBe("snap-accept-001");
    });

    it("调用 aiService.streamChat 时透传 skillId/requestId/sessionId", async () => {
      const aiService = createMockAIService();
      orchestrator = createWritingOrchestrator(
        buildConfig({
          aiService,
        }),
      );

      await collectEvents(
        orchestrator.execute(
          makeRequest({
            requestId: "req-stream-context-001",
            skillId: "builtin:summarize",
            sessionId: "session-ctx-001",
          }),
        ),
      );

      const streamCall = aiService.streamChat.mock.calls[0];
      expect(streamCall?.[1]).toMatchObject({
        skillId: "builtin:summarize",
        requestId: "req-stream-context-001",
        sessionId: "session-ctx-001",
      });
    });

    it("写回前先创建 pre-write 快照，再执行 documentWrite", async () => {
      await collectEvents(orchestrator.execute(makeRequest()));

      const versionTool = config.toolRegistry.get("versionSnapshot") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;
      const writeTool = config.toolRegistry.get("documentWrite") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;

      expect(versionTool?.execute).toHaveBeenCalledTimes(1);
      expect(writeTool?.execute).toHaveBeenCalledTimes(1);
      expect(versionTool?.execute.mock.invocationCallOrder[0]).toBeLessThan(
        writeTool?.execute.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
      );
      expect(versionTool?.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-001",
          actor: "auto",
          reason: "pre-write",
        }),
      );
      expect(writeTool?.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-001",
          content: "润色后的文字。",
          selection: expect.objectContaining({
            from: 0,
            to: 12,
            selectionTextHash: "abc123",
          }),
        }),
      );
    });

    it("预算硬停时在 call-ai 前 fail-closed，并产出 budget-exceeded", async () => {
      const tracker = createMockCostTracker({
        checkBudget: vi.fn().mockReturnValue({
          kind: "hard-stop",
          currentCost: 5.01,
          threshold: 5,
          message: "budget exceeded",
          timestamp: Date.now(),
        } satisfies BudgetAlert),
      });
      const aiService = createMockAIService();
      orchestrator = createWritingOrchestrator(
        buildConfig({
          aiService,
          costTracker: tracker,
        }),
      );

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      expect(eventTypes(events)).toContain("budget-exceeded");
      expect(eventTypes(events)).toContain("error");
      expect(aiService.streamChat).not.toHaveBeenCalled();
    });

    it("continue 无 selection 但有 cursorPosition 时，会把光标位置透传给 documentWrite", async () => {
      await collectEvents(
        orchestrator.execute(
          makeRequest({
            skillId: "continue",
            input: { selectedText: "甲乙丙丁" },
            selection: undefined,
            cursorPosition: 3,
          }),
        ),
      );

      const writeTool = config.toolRegistry.get("documentWrite") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;

      expect(writeTool?.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-001",
          content: "润色后的文字。",
          cursorPosition: 3,
          selection: undefined,
        }),
      );
    });

    it("hooks-done 事件列出已执行的 hook 名称", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const hooksEvent = events.find((e) => e.type === "hooks-done") as
        | (WritingEvent & { type: "hooks-done" })
        | undefined;

      expect(hooksEvent).toBeDefined();
      expect(hooksEvent!.executed).toContain("auto-save-version");
    });

    it("每个事件都包含 timestamp 且单调递增", async () => {
      const events = await collectEvents(orchestrator.execute(makeRequest()));

      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
      }
    });

    it("generateText 路径也会实时产出 ai-chunk 事件", async () => {
      const cfg = buildConfig({
        generateText: async ({ emitChunk }) => {
          emitChunk("润色", 2);
          await Promise.resolve();
          emitChunk("后的", 4);
          await Promise.resolve();
          emitChunk("文字。", 6);
          return {
            fullText: "润色后的文字。",
            usage: {
              promptTokens: 10,
              completionTokens: 6,
              totalTokens: 16,
            },
          };
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const chunkEvents = events.filter((event) => event.type === "ai-chunk");

      expect(chunkEvents).toHaveLength(3);
      expect(chunkEvents.map((event) => event.delta)).toEqual([
        "润色",
        "后的",
        "文字。",
      ]);
      expect(eventTypes(events)).toContain("ai-done");
      orch.dispose();
    });
  });

  // ── 中止链路 ──────────────────────────────────────────────────

  describe("Abort — 中止链路", () => {
    it("execute 执行中调用 abort → 产出 aborted 事件", async () => {
      const gen = orchestrator.execute(makeRequest());
      // Consume first event then abort
      const first = await gen.next();
      expect(first.done).toBe(false);

      orchestrator.abort("req-001");

      const remaining: WritingEvent[] = [];
      let result = await gen.next();
      while (!result.done) {
        remaining.push(result.value);
        result = await gen.next();
      }

      const lastEvent = remaining[remaining.length - 1];
      expect(lastEvent.type).toBe("aborted");
    });

    it("abort 不存在的 requestId → 静默忽略（不抛异常）", () => {
      expect(() => orchestrator.abort("non-existent-id")).not.toThrow();
    });

    it("abort 后 AI 服务的 abort 被调用", async () => {
      const gen = orchestrator.execute(makeRequest());
      await gen.next();

      orchestrator.abort("req-001");
      // Drain generator
      while (!(await gen.next()).done) { /* drain */ }

      expect(config.aiService.abort).toHaveBeenCalled();
    });
  });

  // ── 权限门禁 ──────────────────────────────────────────────────

  describe("Permission Gate — 权限门禁", () => {
    it("auto-allow 类型不产出 permission-requested 事件", async () => {
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "auto-allow", granted: true }),
          requestPermission: vi.fn(),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const permEvents = events.filter((e) => e.type === "permission-requested");

      expect(permEvents).toHaveLength(0);
      orch.dispose();
    });

    it("must-confirm-snapshot 类型产出 permission-requested 事件", async () => {
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "must-confirm-snapshot", granted: false }),
          requestPermission: vi.fn().mockResolvedValue(true),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const permEvent = events.find((e) => e.type === "permission-requested") as
        | (WritingEvent & { type: "permission-requested" })
        | undefined;

      expect(permEvent).toBeDefined();
      expect(permEvent!.level).toBe("must-confirm-snapshot");
      orch.dispose();
    });

    it("权限被拒绝 → 产出 permission-denied，不执行 write-back", async () => {
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "preview-confirm", granted: false }),
          requestPermission: vi.fn().mockResolvedValue(false),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const types = eventTypes(events);

      expect(types).toContain("permission-denied");
      expect(types).not.toContain("write-back-done");
      orch.dispose();
    });

    it("权限请求 120 秒超时 → permission-denied → 管线终止", async () => {
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "must-confirm-snapshot", granted: false }),
          requestPermission: vi.fn().mockImplementation(() => new Promise(() => {})),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events: WritingEvent[] = [];
      const gen = orch.execute(makeRequest({ requestId: "req-timeout" }));

      // Consume events until we hit permission-requested
      let result = await gen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        events.push(result.value);
        result = await gen.next();
      }
      if (!result.done) events.push(result.value);

      // Advance 120 seconds
      await vi.advanceTimersByTimeAsync(120_000);

      // Drain remaining events
      result = await gen.next();
      while (!result.done) {
        events.push(result.value);
        result = await gen.next();
      }

      const types = eventTypes(events);
      expect(types).toContain("permission-denied");
      expect(types).not.toContain("write-back-done");
      orch.dispose();
    });

    it("preview-confirm 被授权后 → 正常完成写回", async () => {
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "preview-confirm", granted: false }),
          requestPermission: vi.fn().mockResolvedValue(true),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const types = eventTypes(events);

      expect(types).toContain("permission-requested");
      expect(types).toContain("permission-granted");
      expect(types).toContain("write-back-done");
      orch.dispose();
    });

    it("权限请求 120 秒超时后会显式释放 pending resolver", async () => {
      const permissionGate = createTrackablePermissionGate();
      const cfg = buildConfig({ permissionGate });
      const orch = createWritingOrchestrator(cfg);
      const events: WritingEvent[] = [];
      const gen = orch.execute(makeRequest({ requestId: "req-timeout-release" }));

      let result = await gen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        events.push(result.value);
        result = await gen.next();
      }
      expect(result.done).toBe(false);
      events.push(result.value);
      expect(permissionGate.pending.size).toBe(1);

      const waitForPermissionResolution = gen.next();
      await vi.advanceTimersByTimeAsync(120_000);

      result = await waitForPermissionResolution;
      while (!result.done) {
        events.push(result.value);
        result = await gen.next();
      }

      expect(eventTypes(events)).toContain("permission-denied");
      expect(permissionGate.pending.size).toBe(0);
      expect(permissionGate.releasePendingPermission).toHaveBeenCalledWith(
        "req-timeout-release",
      );
      orch.dispose();
    });

    it("paused preview 在 teardown 时会释放 pending resolver", async () => {
      const permissionGate = createTrackablePermissionGate();
      const cfg = buildConfig({ permissionGate });
      const orch = createWritingOrchestrator(cfg);
      const gen = orch.execute(makeRequest({ requestId: "req-teardown-release" }));

      let result = await gen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        result = await gen.next();
      }
      expect(result.done).toBe(false);
      expect(permissionGate.pending.size).toBe(1);

      const waiting = gen.next();
      await Promise.resolve();
      orch.dispose();
      await Promise.resolve();

      expect(permissionGate.pending.size).toBe(0);
      expect(permissionGate.releasePendingPermission).toHaveBeenCalledWith(
        "req-teardown-release",
      );

      await vi.advanceTimersByTimeAsync(120_000);
      await waiting;
    });

    it("正常 grant / reject 路径都会清空 pending resolver", async () => {
      const grantGate = createTrackablePermissionGate();
      const grantCfg = buildConfig({ permissionGate: grantGate });
      const grantOrch = createWritingOrchestrator(grantCfg);
      const grantGen = grantOrch.execute(makeRequest({ requestId: "req-grant-release" }));

      let result = await grantGen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        result = await grantGen.next();
      }
      expect(result.done).toBe(false);
      expect(grantGate.pending.size).toBe(1);
      const grantWait = grantGen.next();
      await Promise.resolve();
      grantGate.settle("req-grant-release", true);
      await grantWait;
      while (!(await grantGen.next()).done) {
        // drain
      }
      expect(grantGate.pending.size).toBe(0);
      grantOrch.dispose();

      const rejectGate = createTrackablePermissionGate();
      const rejectCfg = buildConfig({ permissionGate: rejectGate });
      const rejectOrch = createWritingOrchestrator(rejectCfg);
      const rejectGen = rejectOrch.execute(makeRequest({ requestId: "req-reject-release" }));

      result = await rejectGen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        result = await rejectGen.next();
      }
      expect(result.done).toBe(false);
      expect(rejectGate.pending.size).toBe(1);
      const rejectWait = rejectGen.next();
      await Promise.resolve();
      rejectGate.settle("req-reject-release", false);
      await rejectWait;
      while (!(await rejectGen.next()).done) {
        // drain
      }
      expect(rejectGate.pending.size).toBe(0);
      rejectOrch.dispose();
    });

    it("paused 状态调用 abort → pending.size===0 且 releasePendingPermission 被调用", async () => {
      const permissionGate = createTrackablePermissionGate();
      const cfg = buildConfig({ permissionGate });
      const orch = createWritingOrchestrator(cfg);
      const gen = orch.execute(makeRequest({ requestId: "req-abort-paused" }));

      // Advance until permission-requested (task enters paused state)
      let result = await gen.next();
      while (!result.done && result.value.type !== "permission-requested") {
        result = await gen.next();
      }
      expect(result.done).toBe(false);
      expect(permissionGate.pending.size).toBe(1);

      // Abort while task is paused waiting for permission
      const waiting = gen.next();
      await Promise.resolve();
      orch.abort("req-abort-paused");
      await Promise.resolve();

      expect(permissionGate.pending.size).toBe(0);
      expect(permissionGate.releasePendingPermission).toHaveBeenCalledWith(
        "req-abort-paused",
      );

      await vi.advanceTimersByTimeAsync(120_000);
      await waiting;
      orch.dispose();
    });
  });

  // ── 错误恢复 ──────────────────────────────────────────────────

  describe("Error Recovery — 错误恢复", () => {
    it("AI 调用失败(retryable) → 重试后成功 → 正常完成", async () => {
      const aiService = createMockAIService();
      let callCount = 0;
      aiService.streamChat.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw { kind: "retryable", message: "network error", retryCount: 0 };
        }
        return (async function* () {
          yield { delta: "重试成功", finishReason: "stop" as const, accumulatedTokens: 3 };
        })();
      });

      const cfg = buildConfig({ aiService });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const types = eventTypes(events);

      expect(types).toContain("ai-done");
      expect(types).not.toContain("error");
      orch.dispose();
    });

    it("AI 调用最终失败 → 产出 error 事件 + 原文未被修改", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() => {
        throw { kind: "retryable", message: "persistent error", retryCount: 3 };
      });

      const writeToolExecute = vi.fn();
      const cfg = buildConfig({ aiService });
      const writeTool = cfg.toolRegistry.get("documentWrite");
      if (writeTool) {
        (writeTool as unknown as { execute: ReturnType<typeof vi.fn> }).execute = writeToolExecute;
      }

      const orch = createWritingOrchestrator(cfg);
      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((e) => e.type === "error");

      expect(errorEvent).toBeDefined();
      expect(writeToolExecute).not.toHaveBeenCalled();
      orch.dispose();
    });

    it("non-retryable 错误 → 立即失败，不重试", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() => {
        throw { kind: "non-retryable", message: "auth error", retryCount: 0 };
      });

      const cfg = buildConfig({ aiService });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));

      expect(aiService.streamChat).toHaveBeenCalledTimes(1);
      expect(eventTypes(events)).toContain("error");
      orch.dispose();
    });

    it("aborted 错误 → 立即终止且不重试", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() => {
        throw { kind: "aborted", message: "request canceled", retryCount: 0 };
      });
      const tracker = createMockCostTracker();

      const cfg = buildConfig({ aiService, costTracker: tracker });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));

      expect(aiService.streamChat).toHaveBeenCalledTimes(1);
      expect(eventTypes(events)).toContain("aborted");
      expect(eventTypes(events)).not.toContain("error");
      expect(tracker.recordUsage).toHaveBeenCalledWith(
        { promptTokens: 10, completionTokens: 0, totalTokens: 10 },
        "default",
        "req-001",
        "polish",
      );
      orch.dispose();
    });

    it("partial-result 错误 → 返回 PARTIAL_RESULT 且保留已流式输出片段", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() =>
        (async function* () {
          yield { delta: "半截", finishReason: null, accumulatedTokens: 2 };
          throw { kind: "partial-result", message: "stream interrupted", retryCount: 0 };
        })(),
      );
      const tracker = createMockCostTracker();

      const cfg = buildConfig({ aiService, costTracker: tracker });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((e) => e.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(aiService.streamChat).toHaveBeenCalledTimes(1);
      expect(eventTypes(events)).toContain("ai-chunk");
      expect(eventTypes(events)).not.toContain("ai-done");
      expect(errorEvent).toBeDefined();
      expect(
        (errorEvent as unknown as { error: { code: string; message: string } }).error,
      ).toMatchObject({
        code: "PARTIAL_RESULT",
        message: "stream interrupted",
      });
      expect(
        (errorEvent as unknown as { error: { details?: { partialContent?: string } } }).error
          .details?.partialContent,
      ).toBe("半截");
      expect(tracker.recordUsage).toHaveBeenCalledWith(
        { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
        "default",
        "req-001",
        "polish",
      );
      orch.dispose();
    });

    it("无效的 skillId → 产出 error 事件，code=SKILL_INPUT_INVALID", async () => {
      const events = await collectEvents(
        orchestrator.execute(makeRequest({ skillId: "nonexistent-skill" })),
      );
      const errorEvent = events.find((e) => e.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(errorEvent).toBeDefined();
      expect((errorEvent as unknown as { error: { code: string; retryable: boolean } }).error.code).toBe("SKILL_INPUT_INVALID");
      expect((errorEvent as unknown as { error: { code: string; retryable: boolean } }).error.retryable).toBe(false);
    });

    it("缺少 versionSnapshot tool → 立刻失败且不进入 write-back-done/hooks-done", async () => {
      const cfg = buildConfig();
      cfg.toolRegistry.unregister("versionSnapshot");
      const writeTool = cfg.toolRegistry.get("documentWrite") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((event) => event.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(errorEvent).toBeDefined();
      expect(
        (errorEvent as unknown as { error: { code: string } }).error,
      ).toMatchObject({
        code: "VERSION_SNAPSHOT_FAILED",
      });
      expect(eventTypes(events)).not.toContain("write-back-done");
      expect(eventTypes(events)).not.toContain("hooks-done");
      expect(writeTool?.execute).not.toHaveBeenCalled();
      orch.dispose();
    });

    it("versionSnapshot 失败 → 立刻失败且不执行 documentWrite", async () => {
      const cfg = buildConfig();
      const versionTool = cfg.toolRegistry.get("versionSnapshot") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;
      const writeTool = cfg.toolRegistry.get("documentWrite") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;
      versionTool?.execute.mockResolvedValue({
        success: false,
        error: { code: "VERSION_SNAPSHOT_FAILED", message: "snapshot broken" },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((event) => event.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(
        (errorEvent as unknown as { error: { code: string; message: string } })
          .error,
      ).toMatchObject({
        code: "VERSION_SNAPSHOT_FAILED",
        message: "snapshot broken",
      });
      expect(writeTool?.execute).not.toHaveBeenCalled();
      expect(eventTypes(events)).not.toContain("write-back-done");
      expect(eventTypes(events)).not.toContain("hooks-done");
      orch.dispose();
    });

    it("缺少 documentWrite tool → accept 后硬失败，不得伪装 completed", async () => {
      const cfg = buildConfig();
      cfg.toolRegistry.unregister("documentWrite");
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((event) => event.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(
        (errorEvent as unknown as { error: { code: string } }).error,
      ).toMatchObject({
        code: "WRITE_BACK_FAILED",
      });
      expect(eventTypes(events)).not.toContain("write-back-done");
      expect(eventTypes(events)).not.toContain("hooks-done");
      orch.dispose();
    });

    it("documentWrite 失败时透传 selection mismatch 细节并停止", async () => {
      const cfg = buildConfig();
      const writeTool = cfg.toolRegistry.get("documentWrite") as
        | { execute: ReturnType<typeof vi.fn> }
        | undefined;
      writeTool?.execute.mockResolvedValue({
        success: false,
        error: {
          code: "WRITE_BACK_FAILED",
          message: "Selection changed before AI writeback",
          details: { currentText: "用户已改动" },
        },
      });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const errorEvent = events.find((event) => event.type === "error") as
        | (WritingEvent & { type: "error" })
        | undefined;

      expect(
        (errorEvent as unknown as {
          error: {
            code: string;
            message: string;
            details: { currentText: string };
          };
        }).error,
      ).toMatchObject({
        code: "WRITE_BACK_FAILED",
        message: "Selection changed before AI writeback",
        details: { currentText: "用户已改动" },
      });
      expect(eventTypes(events)).not.toContain("write-back-done");
      expect(eventTypes(events)).not.toContain("hooks-done");
      orch.dispose();
    });
  });

  // ── 任务状态机 ──────────────────────────────────────────────────

  describe("Task State Machine — 任务状态机", () => {
    it("pending → running → completed（正常流程）", async () => {
      const states: string[] = [];
      const request = makeRequest();

      // Check initial state
      const gen = orchestrator.execute(request);
      states.push(orchestrator.getTaskState(request.requestId));

      await collectEvents(gen);
      states.push(orchestrator.getTaskState(request.requestId));

      expect(states).toEqual(["running", "completed"]);
    });

    it("pending → running → failed（AI 失败）", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() => {
        throw { kind: "non-retryable", message: "fail", retryCount: 0 };
      });
      const cfg = buildConfig({ aiService });
      const orch = createWritingOrchestrator(cfg);
      const request = makeRequest();

      await collectEvents(orch.execute(request));

      expect(orch.getTaskState(request.requestId)).toBe("failed");
      orch.dispose();
    });

    it("killed 是终态，不可恢复", async () => {
      const gen = orchestrator.execute(makeRequest());
      await gen.next();

      orchestrator.abort("req-001");
      // Drain
      while (!(await gen.next()).done) { /* drain */ }

      expect(orchestrator.getTaskState("req-001")).toBe("killed");

      // Attempting to re-execute same request should fail or start fresh
      await collectEvents(
        orchestrator.execute(makeRequest({ requestId: "req-001" })),
      );
      // Either error or new execution — the key assertion is that killed is terminal
      expect(orchestrator.getTaskState("req-001")).not.toBe("running");
    });

    it("running → paused（权限门禁等待）→ running → completed", async () => {
      let resolvePermission: (granted: boolean) => void;
      const permissionPromise = new Promise<boolean>((resolve) => {
        resolvePermission = resolve;
      });
      const cfg = buildConfig({
        permissionGate: {
          evaluate: vi.fn().mockResolvedValue({ level: "must-confirm-snapshot", granted: false }),
          requestPermission: vi.fn().mockReturnValue(permissionPromise),
          releasePendingPermission: vi.fn(),
        },
      });
      const orch = createWritingOrchestrator(cfg);
      const request = makeRequest({ requestId: "req-pause" });

      const events: WritingEvent[] = [];
      const gen = orch.execute(request);

      // Consume until permission-requested
      let result = await gen.next();
      while (!result.done) {
        events.push(result.value);
        if (result.value.type === "permission-requested") {
          // At this point task should be paused
          expect(orch.getTaskState("req-pause")).toBe("paused");
          // Grant permission to resume
          resolvePermission!(true);
        }
        result = await gen.next();
      }

      expect(orch.getTaskState("req-pause")).toBe("completed");
      orch.dispose();
    });

    it("completed 状态不可转换为 running → 抛 InvalidStateTransitionError", async () => {
      const request = makeRequest({ requestId: "req-completed" });
      await collectEvents(orchestrator.execute(request));

      expect(orchestrator.getTaskState("req-completed")).toBe("completed");

      const events = await collectEvents(
        orchestrator.execute(makeRequest({ requestId: "req-completed" })),
      );
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent as unknown as { error: { code: string } }).error.code).toBe("INVALID_STATE_TRANSITION");
    });

    it("failed 状态不可转换为 running → 抛 InvalidStateTransitionError", async () => {
      const aiService = createMockAIService();
      aiService.streamChat.mockImplementation(() => {
        throw { kind: "non-retryable", message: "fail", retryCount: 0 };
      });
      const cfg = buildConfig({ aiService });
      const orch = createWritingOrchestrator(cfg);
      const request = makeRequest({ requestId: "req-failed" });

      await collectEvents(orch.execute(request));
      expect(orch.getTaskState("req-failed")).toBe("failed");

      const events = await collectEvents(
        orch.execute(makeRequest({ requestId: "req-failed" })),
      );
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent as unknown as { error: { code: string } }).error.code).toBe("INVALID_STATE_TRANSITION");
      orch.dispose();
    });
  });

  // ── Post-Writing Hooks ──────────────────────────────────────────

  describe("Post-Writing Hooks", () => {
    it("写入完成后触发 auto-save-version hook", async () => {
      const hook = createMockHook("auto-save-version");
      const cfg = buildConfig({ postWritingHooks: [hook] });
      const orch = createWritingOrchestrator(cfg);

      await collectEvents(orch.execute(makeRequest()));

      expect(hook.execute).toHaveBeenCalledTimes(1);
      orch.dispose();
    });

    it("hook 失败不影响主流程完成", async () => {
      const failingHook = {
        name: "failing-hook",
        execute: vi.fn().mockRejectedValue(new Error("hook failed")),
      };
      const cfg = buildConfig({ postWritingHooks: [failingHook] });
      const orch = createWritingOrchestrator(cfg);

      const events = await collectEvents(orch.execute(makeRequest()));
      const types = eventTypes(events);

      // Pipeline should still complete even if hook fails
      expect(types).toContain("hooks-done");
      expect(types).not.toContain("error");
      orch.dispose();
    });

    it("多个 hook 按注册顺序依次执行", async () => {
      const order: string[] = [];
      const hook1 = {
        name: "hook-a",
        execute: vi.fn().mockImplementation(async () => { order.push("a"); }),
      };
      const hook2 = {
        name: "hook-b",
        execute: vi.fn().mockImplementation(async () => { order.push("b"); }),
      };

      const cfg = buildConfig({ postWritingHooks: [hook1, hook2] });
      const orch = createWritingOrchestrator(cfg);

      await collectEvents(orch.execute(makeRequest()));

      expect(order).toEqual(["a", "b"]);
      orch.dispose();
    });

    it("enabled: false 的 hook 不被执行", async () => {
      const activeHook = createMockHook("active-hook");
      const disabledHook = {
        name: "disabled-hook",
        enabled: false,
        execute: vi.fn().mockResolvedValue(undefined),
      };
      const cfg = buildConfig({
        postWritingHooks: [activeHook, disabledHook],
      });
      const orch = createWritingOrchestrator(cfg);

      await collectEvents(orch.execute(makeRequest()));

      expect(activeHook.execute).toHaveBeenCalledTimes(1);
      expect(disabledHook.execute).not.toHaveBeenCalled();
      orch.dispose();
    });
  });
});
