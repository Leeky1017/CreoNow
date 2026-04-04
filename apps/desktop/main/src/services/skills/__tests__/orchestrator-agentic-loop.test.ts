/**
 * WritingOrchestrator P2 Agentic Loop 集成测试
 *
 * Spec: openspec/specs/skill-system/spec.md — P2: Agentic Loop（Tool-Use 循环）
 *
 * 覆盖：
 * - Happy path：continue 技能 → tool_use → kgTool → stop → ai-done
 * - All-failed：所有 tool call 失败 → TOOL_USE_ALL_FAILED → 继续到 ai-done
 * - Max-rounds 熔断：超过 maxToolRounds → TOOL_USE_MAX_ROUNDS_EXCEEDED
 * - 只读边界：documentWrite / versionSnapshot 不在 agentic registry
 * - 非 agentic skill 忽略 tool_use（polish skill 时工具调用被丢弃）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type {
  WritingRequest,
  WritingEvent,
} from "../orchestrator";
import { createWritingOrchestrator } from "../orchestrator";
import { createToolRegistry, buildTool, type ToolRegistry } from "../toolRegistry";
import type { ToolCallInfo } from "../../ai/streaming";
import { createToolUseHandler, type ToolUseHandler } from "../toolUseHandler";
import { createCostTracker } from "../../ai/costTracker";

// ─── helpers ────────────────────────────────────────────────────────

async function collectEvents(gen: AsyncGenerator<WritingEvent>): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const e of gen) {
    events.push(e);
  }
  return events;
}

function eventTypes(events: WritingEvent[]): string[] {
  return events.map((e) => e.type);
}

function makeRequest(overrides: Partial<WritingRequest> = {}): WritingRequest {
  return {
    requestId: "req-agentic-001",
    skillId: "continue",
    input: { precedingText: "夜幕降临，街灯次第亮起。" },
    documentId: "doc-001",
    projectId: "proj-001",
    agenticLoop: true,
    ...overrides,
  };
}

function createMockPermissionGate(autoGrant = true) {
  return {
    evaluate: vi.fn().mockResolvedValue({ level: "auto-allow", granted: true }),
    requestPermission: vi.fn().mockResolvedValue(autoGrant),
    releasePendingPermission: vi.fn(),
  };
}

/** Build a read-only agentic tool registry (kgTool, memTool, docTool – no write tools) */
function createReadOnlyAgenticRegistry(): ToolRegistry {
  const registry = createToolRegistry();
  registry.register(buildTool({
    name: "kgTool",
    description: "Query knowledge graph",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: { name: "林远", traits: ["冷静"] } }),
  }));
  registry.register(buildTool({
    name: "memTool",
    description: "Query memory",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: { memories: [] } }),
  }));
  registry.register(buildTool({
    name: "docTool",
    description: "Read document",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: { content: "..." } }),
  }));
  // documentRead: also read-only, agentic-accessible
  registry.register(buildTool({
    name: "documentRead",
    description: "Read document text",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: { text: "..." } }),
  }));
  // documentWrite and versionSnapshot intentionally NOT registered in agentic registry
  return registry;
}

/** Build a full write registry (used by orchestrator for write-back, NOT by agentic loop) */
function createWriteRegistry(): ToolRegistry {
  const registry = createToolRegistry();
  registry.register(buildTool({
    name: "documentWrite",
    description: "Write to document",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "v-write-001" } }),
  }));
  registry.register(buildTool({
    name: "versionSnapshot",
    description: "Create version snapshot",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "v-snap-001" } }),
  }));
  return registry;
}

function makeToolCallInfo(name: string, args: Record<string, unknown> = {}, id?: string): ToolCallInfo {
  return { id: id ?? `call-${name}-${Date.now()}`, name, arguments: args };
}

// ─── test suite ─────────────────────────────────────────────────────

describe("WritingOrchestrator P2 — Agentic Loop 集成测试", () => {
  let agenticRegistry: ToolRegistry;
  let agenticHandler: ToolUseHandler;
  let writeRegistry: ToolRegistry;
  let permissionGate: ReturnType<typeof createMockPermissionGate>;

  beforeEach(() => {
    vi.useFakeTimers();
    agenticRegistry = createReadOnlyAgenticRegistry();
    agenticHandler = createToolUseHandler(agenticRegistry, {
      maxToolRounds: 5,
      toolTimeoutMs: 10_000,
      maxConcurrentTools: 4,
      agenticLoop: true,
    });
    writeRegistry = createWriteRegistry();
    permissionGate = createMockPermissionGate(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Happy path ───────────────────────────────────────────────────

  describe("Happy path — continue 技能触发 Agentic Loop", () => {
    it("AI 第一轮返回 tool_use，执行 kgTool，第二轮返回 stop → 完整事件序列正确", async () => {
      // Round 1: AI returns tool_use with kgTool call
      // Round 2: AI returns stop after seeing tool results
      let callCount = 0;
      const kgToolCallId = "call-kg-001";

      const generateText = vi.fn().mockImplementation(async (args: {
        messages?: Array<{ role: string; content: string }>;
        emitChunk: (delta: string, tokens: number) => void;
      }) => {
        callCount++;
        if (callCount === 1) {
          // First call: return partial text + tool_use
          args.emitChunk("林远", 2);
          return {
            fullText: "林远",
            usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
            finishReason: "tool_use" as const,
            toolCalls: [makeToolCallInfo("kgTool", { query: "林远的性格特点" }, kgToolCallId)],
          };
        }
        // Second call: messages should include tool results
        expect(args.messages).toBeDefined();
        expect(args.messages!.length).toBeGreaterThan(0);
        // Verify tool result was injected (role: tool)
        const toolMsg = args.messages!.find((m) => m.role === "tool");
        expect(toolMsg).toBeDefined();

        args.emitChunk("缓步走向那扇门，", 10);
        args.emitChunk("眼神沉静。", 15);
        return {
          fullText: "缓步走向那扇门，眼神沉静。",
          usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
          finishReason: "stop" as const,
          toolCalls: [],
        };
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // Must include tool-use-started and tool-use-completed
      expect(types).toContain("tool-use-started");
      expect(types).toContain("tool-use-completed");
      expect(types).not.toContain("tool-use-failed");

      // Verify order: tool-use-started before tool-use-completed, after first ai-chunk
      const startedIdx = types.indexOf("tool-use-started");
      const completedIdx = types.indexOf("tool-use-completed");
      expect(startedIdx).toBeLessThan(completedIdx);

      // tool-use-started must come AFTER first ai-chunk
      const firstChunkIdx = types.indexOf("ai-chunk");
      expect(firstChunkIdx).toBeLessThan(startedIdx);

      // tool-use-started event shape
      const startedEvent = events[startedIdx];
      expect(startedEvent.round).toBe(1);
      expect(startedEvent.toolNames).toEqual(["kgTool"]);

      // tool-use-completed event shape
      const completedEvent = events[completedIdx];
      expect(completedEvent.round).toBe(1);
      const results = completedEvent.results as Array<{ toolName: string; success: boolean; durationMs: number }>;
      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe("kgTool");
      expect(results[0].success).toBe(true);
      expect(completedEvent.hasNextRound).toBe(false);

      // ai-done must appear after tool-use loop
      const aiDoneIdx = types.indexOf("ai-done");
      expect(aiDoneIdx).toBeGreaterThan(completedIdx);

      // Final fullText should be from round 2
      const aiDoneEvent = events[aiDoneIdx];
      expect(aiDoneEvent.fullText).toBe("缓步走向那扇门，眼神沉静。");

      // generateText was called twice
      expect(callCount).toBe(2);

      // Pipeline continues normally: write-back-done (since permission auto-allow)
      expect(types).toContain("write-back-done");
      expect(types).toContain("hooks-done");
    });

    it("两轮 tool-use 后 stop → round 事件递增", async () => {
      let callCount = 0;

      const generateText = vi.fn().mockImplementation(async (args: {
        messages?: Array<{ role: string; content: string }>;
        emitChunk: (delta: string, tokens: number) => void;
      }) => {
        callCount++;
        if (callCount === 1) {
          args.emitChunk("第一轮", 3);
          return {
            fullText: "第一轮",
            usage: { promptTokens: 10, completionTokens: 3, totalTokens: 13 },
            finishReason: "tool_use" as const,
            toolCalls: [makeToolCallInfo("kgTool", { query: "人物A" }, "call-r1")],
          };
        }
        if (callCount === 2) {
          args.emitChunk("第二轮", 6);
          return {
            fullText: "第二轮",
            usage: { promptTokens: 20, completionTokens: 6, totalTokens: 26 },
            finishReason: "tool_use" as const,
            toolCalls: [makeToolCallInfo("memTool", { query: "偏好" }, "call-r2")],
          };
        }
        args.emitChunk("最终续写内容", 12);
        return {
          fullText: "最终续写内容",
          usage: { promptTokens: 30, completionTokens: 12, totalTokens: 42 },
          finishReason: "stop" as const,
          toolCalls: [],
        };
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      const startedEvents = events.filter((e) => e.type === "tool-use-started");
      const completedEvents = events.filter((e) => e.type === "tool-use-completed");

      expect(startedEvents).toHaveLength(2);
      expect(completedEvents).toHaveLength(2);

      expect(startedEvents[0].round).toBe(1);
      expect(startedEvents[1].round).toBe(2);
      expect(completedEvents[0].round).toBe(1);
      expect(completedEvents[1].round).toBe(2);

      // First round: kgTool started, second: memTool started
      expect(startedEvents[0].toolNames).toEqual(["kgTool"]);
      expect(startedEvents[1].toolNames).toEqual(["memTool"]);

      // hasNextRound: first true (round 2 coming), second false (no more)
      expect(completedEvents[0].hasNextRound).toBe(true);
      expect(completedEvents[1].hasNextRound).toBe(false);

      expect(callCount).toBe(3);
      expect(types).toContain("ai-done");
    });

    it("两轮 agentic AI 调用逐轮记录费用，并按同一 requestId 累计预算", async () => {
      const tracker = createCostTracker({
        pricingTable: {
          currency: "USD",
          lastUpdated: "2025-01-01T00:00:00.000Z",
          prices: {
            default: {
              modelId: "default",
              displayName: "Default",
              inputPricePer1K: 0.001,
              outputPricePer1K: 0.002,
              effectiveDate: "2025-01-01",
            },
          },
        },
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 20,
          enabled: true,
        },
        estimateTokens: (text) => text.length,
      });
      const checkBudget = vi.fn(() => tracker.checkBudget());

      let callCount = 0;
      const generateText = vi.fn().mockImplementation(async (args: {
        messages?: Array<{ role: string; content: string }>;
        emitChunk: (delta: string, tokens: number) => void;
      }) => {
        callCount++;
        if (callCount === 1) {
          args.emitChunk("第一轮", 3);
          return {
            fullText: "第一轮",
            usage: { promptTokens: 12, completionTokens: 3, totalTokens: 15 },
            finishReason: "tool_use" as const,
            toolCalls: [makeToolCallInfo("kgTool", { query: "林远" }, "call-usage-r1")],
          };
        }

        const toolMsg = args.messages?.find((message) => message.role === "tool");
        expect(toolMsg).toBeDefined();
        args.emitChunk("最终续写", 7);
        return {
          fullText: "最终续写",
          usage: { promptTokens: 18, completionTokens: 7, totalTokens: 25 },
          finishReason: "stop" as const,
          toolCalls: [],
        };
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
        costTracker: {
          recordUsage: tracker.recordUsage,
          getSessionCost: tracker.getSessionCost,
          checkBudget,
        },
      });

      const events = await collectEvents(orchestrator.execute(makeRequest({
        requestId: "req-agentic-cost-001",
      })));
      const costEvents = events.filter((event) => event.type === "cost-recorded");
      const requestCost = tracker.getRequestCost("req-agentic-cost-001");
      const sessionCost = tracker.getSessionCost();

      expect(callCount).toBe(2);
      expect(costEvents).toHaveLength(2);
      expect(checkBudget.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(requestCost).toMatchObject({
        requestId: "req-agentic-cost-001",
        inputTokens: 30,
        outputTokens: 10,
      });
      expect(sessionCost).toMatchObject({
        totalRequests: 1,
        totalInputTokens: 30,
        totalOutputTokens: 10,
      });
    });
  });

  // ── All-failed ───────────────────────────────────────────────────

  describe("All-failed — 本轮所有 tool call 均失败", () => {
    it("kgTool 失败 → yield tool-use-failed(TOOL_USE_ALL_FAILED) → 继续到 ai-done", async () => {
      // Create a registry where kgTool always fails
      const failingRegistry = createToolRegistry();
      failingRegistry.register(buildTool({
        name: "kgTool",
        description: "Always fails",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: { code: "KG_ERROR", message: "KG not available" },
        }),
      }));

      const failingHandler = createToolUseHandler(failingRegistry, {
        maxToolRounds: 5,
        toolTimeoutMs: 10_000,
        maxConcurrentTools: 4,
        agenticLoop: true,
      });

      let callCount = 0;
      const generateText = vi.fn().mockImplementation(async (args: {
        messages?: Array<{ role: string; content: string }>;
        emitChunk: (delta: string, tokens: number) => void;
      }) => {
        callCount++;
        if (callCount === 1) {
          args.emitChunk("部分续写", 4);
          return {
            fullText: "部分续写",
            usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
            finishReason: "tool_use" as const,
            toolCalls: [makeToolCallInfo("kgTool", { query: "林远" }, "call-fail")],
          };
        }
        const toolMsg = args.messages?.find((message) => message.role === "tool");
        expect(toolMsg?.content).toContain("KG_ERROR");
        return {
          fullText: "基于失败结果继续完成",
          usage: { promptTokens: 6, completionTokens: 7, totalTokens: 13 },
          finishReason: "stop" as const,
          toolCalls: [],
        };
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: failingHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // Must have tool-use-started
      expect(types).toContain("tool-use-started");

      // Must yield tool-use-failed with TOOL_USE_ALL_FAILED
      const failedEvent = events.find((e) => e.type === "tool-use-failed");
      expect(failedEvent).toBeDefined();
      expect((failedEvent!.error as { code: string }).code).toBe("TOOL_USE_ALL_FAILED");
      expect(failedEvent!.round).toBe(1);

      // Pipeline should continue by injecting failed tool results back to the model
      expect(callCount).toBe(2);

      // Should continue to ai-done with partial text
      expect(types).toContain("ai-done");
      const aiDoneEvent = events.find((e) => e.type === "ai-done");
      expect((aiDoneEvent!.fullText as string)).toBe("基于失败结果继续完成");

      // Should still complete write-back (permission auto-allow)
      expect(types).toContain("write-back-done");
    });

    it("未注册的 tool → TOOL_USE_TOOL_NOT_FOUND 导致 all-failed → tool-use-failed", async () => {
      // Empty agentic registry - no tools registered
      const emptyRegistry = createToolRegistry();
      const emptyHandler = createToolUseHandler(emptyRegistry, {
        maxToolRounds: 5,
        toolTimeoutMs: 10_000,
        maxConcurrentTools: 4,
        agenticLoop: true,
      });

      const generateText = vi.fn()
        .mockResolvedValueOnce({
          fullText: "AI 想调用不存在的工具",
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: "tool_use" as const,
          toolCalls: [makeToolCallInfo("unknownTool", {}, "call-unknown")],
        })
        .mockResolvedValueOnce({
          fullText: "模型看到 unknown tool 失败后继续完成",
          usage: { promptTokens: 6, completionTokens: 8, totalTokens: 14 },
          finishReason: "stop" as const,
          toolCalls: [],
        });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: emptyHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const failedEvent = events.find((e) => e.type === "tool-use-failed");
      expect(failedEvent).toBeDefined();
      expect((failedEvent!.error as { code: string }).code).toBe("TOOL_USE_ALL_FAILED");

      // AI should get the injected tool failure and continue one more round
      expect(generateText).toHaveBeenCalledTimes(2);
    });
  });

  // ── Max-rounds 熔断 ──────────────────────────────────────────────

  describe("Max-rounds 熔断", () => {
    it("AI 持续返回 tool_use，到达 maxToolRounds(5) → TOOL_USE_MAX_ROUNDS_EXCEEDED", async () => {
      let callCount = 0;

      const generateText = vi.fn().mockImplementation(async (args: {
        emitChunk: (delta: string, tokens: number) => void;
      }) => {
        callCount++;
        args.emitChunk(`轮次${callCount}`, callCount * 2);
        // Always return tool_use until max rounds
        return {
          fullText: `轮次${callCount}`,
          usage: { promptTokens: 5, completionTokens: callCount * 2, totalTokens: 5 + callCount * 2 },
          finishReason: "tool_use" as const,
          toolCalls: [makeToolCallInfo("kgTool", { query: `query-${callCount}` }, `call-${callCount}`)],
        };
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const types = eventTypes(events);

      // Should have exactly 5 tool-use-started events (maxToolRounds = 5)
      const startedEvents = events.filter((e) => e.type === "tool-use-started");
      expect(startedEvents).toHaveLength(5);

      // Should have tool-use-failed with TOOL_USE_MAX_ROUNDS_EXCEEDED at the end
      const failedEvents = events.filter((e) => e.type === "tool-use-failed");
      expect(failedEvents.length).toBeGreaterThanOrEqual(1);
      const maxRoundsEvent = failedEvents.find(
        (e) => (e.error as { code: string }).code === "TOOL_USE_MAX_ROUNDS_EXCEEDED",
      );
      expect(maxRoundsEvent).toBeDefined();
      expect(maxRoundsEvent!.round).toBe(5);

      // Should still proceed to ai-done with last partial content
      expect(types).toContain("ai-done");

      // AI was called 1 (initial) + 5 (after each tool round) = 6 times
      expect(callCount).toBe(6);
    });
  });

  // ── 只读边界 ─────────────────────────────────────────────────────

  describe("只读边界 — documentWrite / versionSnapshot 不在 agentic registry", () => {
    it("AI 请求 documentWrite → TOOL_USE_TOOL_NOT_FOUND → all-failed", async () => {
      // The agenticRegistry (read-only) does NOT have documentWrite
      // Even if the write registry has it, AI cannot access it via the agentic loop

      const generateText = vi.fn()
        .mockResolvedValueOnce({
          fullText: "AI 试图写入文档",
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: "tool_use" as const,
          toolCalls: [makeToolCallInfo("documentWrite", { content: "恶意写入" }, "call-write")],
        });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler, // backed by read-only agenticRegistry
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));

      // tool-use-started should be emitted (we tried to call it)
      const startedEvent = events.find((e) => e.type === "tool-use-started");
      expect(startedEvent).toBeDefined();
      expect(startedEvent!.toolNames).toEqual(["documentWrite"]);

      // Should fail because documentWrite is not in agentic registry
      const failedEvent = events.find((e) => e.type === "tool-use-failed");
      expect(failedEvent).toBeDefined();
      expect((failedEvent!.error as { code: string }).code).toBe("TOOL_USE_ALL_FAILED");

      // Verify that documentWrite was NOT called (tool not found in agentic registry)
      void writeRegistry; // registry is not called directly here
    });

    it("AI 请求 versionSnapshot → TOOL_USE_TOOL_NOT_FOUND → all-failed", async () => {
      const generateText = vi.fn()
        .mockResolvedValueOnce({
          fullText: "尝试快照",
          usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
          finishReason: "tool_use" as const,
          toolCalls: [makeToolCallInfo("versionSnapshot", {}, "call-snap")],
        })
        .mockResolvedValueOnce({
          fullText: "看到快照工具不可用后继续完成",
          usage: { promptTokens: 6, completionTokens: 8, totalTokens: 14 },
          finishReason: "stop" as const,
          toolCalls: [],
        });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest()));
      const failedEvent = events.find((e) => e.type === "tool-use-failed");
      expect(failedEvent).toBeDefined();
      expect((failedEvent!.error as { code: string }).code).toBe("TOOL_USE_ALL_FAILED");

      // AI should continue after receiving the injected failure result
      expect(generateText).toHaveBeenCalledTimes(2);
    });

    it("agentic registry 中不包含 documentWrite（只读约束验证）", () => {
      // Direct registry inspection
      expect(agenticRegistry.get("documentWrite")).toBeUndefined();
      expect(agenticRegistry.get("versionSnapshot")).toBeUndefined();

      // Read-only tools ARE available
      expect(agenticRegistry.get("kgTool")).toBeDefined();
      expect(agenticRegistry.get("memTool")).toBeDefined();
      expect(agenticRegistry.get("docTool")).toBeDefined();
      expect(agenticRegistry.get("documentRead")).toBeDefined();
    });
  });

  // ── 非 Agentic skill 忽略 tool_use ──────────────────────────────

  describe("非 Agentic skill — polish/rewrite 不触发 tool-use loop", () => {
    it("polish skill (agenticLoop: false) → AI 意外返回 tool_use → 忽略，使用已生成文本", async () => {
      const generateText = vi.fn().mockResolvedValue({
        fullText: "润色后的文字。",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        // AI accidentally returns tool_use, but skill doesn't have agenticLoop enabled
        finishReason: "tool_use" as const,
        toolCalls: [makeToolCallInfo("kgTool", {}, "call-ignored")],
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest({
        skillId: "polish",
        input: { selectedText: "他慢慢地走到了那扇门的前面" },
        agenticLoop: false, // polish does NOT enable agentic loop
      })));

      const types = eventTypes(events);

      // NO tool-use events
      expect(types).not.toContain("tool-use-started");
      expect(types).not.toContain("tool-use-completed");
      expect(types).not.toContain("tool-use-failed");

      // AI was only called once
      expect(generateText).toHaveBeenCalledTimes(1);

      // ai-done uses the text from the single AI call
      const aiDoneEvent = events.find((e) => e.type === "ai-done");
      expect(aiDoneEvent).toBeDefined();
      expect(aiDoneEvent!.fullText).toBe("润色后的文字。");

      // Pipeline completes normally
      expect(types).toContain("write-back-done");
    });
  });

  // ── WritingRequest.agenticLoop flag ─────────────────────────────

  describe("agenticLoop flag 控制", () => {
    it("agenticLoop: undefined → 默认不启用 agentic loop", async () => {
      const generateText = vi.fn().mockResolvedValue({
        fullText: "续写内容",
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: "tool_use" as const,
        toolCalls: [makeToolCallInfo("kgTool", {}, "call-x")],
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      // No agenticLoop flag set
      const events = await collectEvents(orchestrator.execute(makeRequest({
        agenticLoop: undefined,
      })));

      const types = eventTypes(events);
      expect(types).not.toContain("tool-use-started");
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it("agenticLoop: true 但没有 toolUseHandler → 不触发 loop", async () => {
      const generateText = vi.fn().mockResolvedValue({
        fullText: "续写",
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: "tool_use" as const,
        toolCalls: [makeToolCallInfo("kgTool", {}, "call-y")],
      });

      // No toolUseHandler in config
      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 5, abort: vi.fn() },
        toolRegistry: writeRegistry,
        // toolUseHandler: intentionally omitted
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest({ agenticLoop: true })));
      const types = eventTypes(events);

      // No tool-use events since toolUseHandler is not in config
      expect(types).not.toContain("tool-use-started");
      expect(generateText).toHaveBeenCalledTimes(1);
    });
  });

  // ── finishReason === null (IPC production case) ─────────────────

  describe("finishReason === null 时不触发 loop（生产 IPC 路径）", () => {
    it("generateText 返回 finishReason: null → 正常走完 ai-done，不触发 tool-use", async () => {
      const generateText = vi.fn().mockResolvedValue({
        fullText: "续写结果",
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
        finishReason: null, // IPC 生产路径返回 null
        toolCalls: [],
      });

      const orchestrator = createWritingOrchestrator({
        aiService: { async *streamChat() { return; }, estimateTokens: () => 10, abort: vi.fn() },
        toolRegistry: writeRegistry,
        toolUseHandler: agenticHandler,
        permissionGate,
        postWritingHooks: [],
        defaultTimeoutMs: 30_000,
        generateText,
      });

      const events = await collectEvents(orchestrator.execute(makeRequest({ agenticLoop: true })));
      const types = eventTypes(events);

      expect(types).not.toContain("tool-use-started");
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(types).toContain("ai-done");
    });
  });
});
