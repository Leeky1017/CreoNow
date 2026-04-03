/**
 * ToolUseHandler P2 测试 — Agentic Loop
 * Spec: openspec/specs/skill-system/spec.md — P2: Agentic Loop
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 tool call 解析、并发分区执行、结果注入、轮次限制、
 * 错误处理、只读约束、上下文预算检查。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type {
  ToolUseHandler,
  ParsedToolCall,
  ToolCallResult,
  ToolUseConfig,
  ToolUseRoundState,
} from "../toolUseHandler";
import { createToolUseHandler } from "../toolUseHandler";
import type { ToolRegistry, WritingTool, ToolContext } from "../toolRegistry";
import { createToolRegistry, buildTool } from "../toolRegistry";
import type { ToolCallInfo } from "../../ai/streaming";

// ─── helpers ────────────────────────────────────────────────────────

/** Create a mock tool registry with standard P2 tools */
function createP2ToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();

  registry.register(buildTool({
    name: "kgTool",
    description: "Query knowledge graph",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { name: "林远", traits: ["冷静", "理性"] },
    }),
  }));

  registry.register(buildTool({
    name: "memTool",
    description: "Query writing memory",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { memories: [] },
    }),
  }));

  registry.register(buildTool({
    name: "docTool",
    description: "Read document content",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { content: "第三章内容..." },
    }),
  }));

  registry.register(buildTool({
    name: "documentRead",
    description: "Read document (P1 built-in)",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
  }));

  // documentWrite is NOT exposed to agentic loop
  registry.register(buildTool({
    name: "documentWrite",
    description: "Write to document (blocked in agentic loop)",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true }),
  }));

  return registry;
}

/** Create a standard ToolUseConfig */
function makeConfig(overrides: Partial<ToolUseConfig> = {}): ToolUseConfig {
  return {
    maxToolRounds: 5,
    toolTimeoutMs: 10_000,
    maxConcurrentTools: 4,
    ...overrides,
  };
}

/** Create a mock tool context */
function makeToolContext(): ToolContext {
  return {
    documentId: "doc-001",
    requestId: "req-001",
  };
}

/** Create raw ToolCallInfo (as returned by streaming layer) */
function makeToolCallInfo(
  name: string,
  args: Record<string, unknown> = {},
  id?: string,
): ToolCallInfo {
  return {
    id: id ?? `call-${name}-${Date.now()}`,
    name,
    arguments: args,
  };
}

/** Minimal LLMMessage for injectResults testing */
interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ToolUseHandler — Agentic Loop", () => {
  let handler: ToolUseHandler;
  let registry: ToolRegistry;
  let config: ToolUseConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = createP2ToolRegistry();
    config = makeConfig();
    handler = createToolUseHandler(registry, config);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── parseToolCalls ──────────────────────────────────────────────

  describe("parseToolCalls — 解析 AI tool calls", () => {
    it("从 ToolCallInfo[] 解析出 ParsedToolCall[]", () => {
      const raw: ToolCallInfo[] = [
        makeToolCallInfo("kgTool", { query: "林远的性格特点" }, "call-001"),
      ];

      const parsed = handler.parseToolCalls(raw);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].callId).toBe("call-001");
      expect(parsed[0].toolName).toBe("kgTool");
      expect(parsed[0].arguments).toEqual({ query: "林远的性格特点" });
    });

    it("解析多个 tool calls", () => {
      const raw: ToolCallInfo[] = [
        makeToolCallInfo("kgTool", { query: "角色" }, "call-001"),
        makeToolCallInfo("memTool", { query: "风格" }, "call-002"),
        makeToolCallInfo("docTool", { query: "第三章" }, "call-003"),
      ];

      const parsed = handler.parseToolCalls(raw);
      expect(parsed).toHaveLength(3);
      expect(parsed.map((p) => p.toolName)).toEqual(["kgTool", "memTool", "docTool"]);
    });

    it("空 tool calls 数组返回空数组", () => {
      const parsed = handler.parseToolCalls([]);
      expect(parsed).toHaveLength(0);
    });

    it("参数格式非法时抛出 TOOL_USE_PARSE_FAILED", () => {
      // Simulate malformed arguments
      const raw = [{ id: "call-001", name: "kgTool", arguments: null as unknown as Record<string, unknown> }];

      expect(() => handler.parseToolCalls(raw as ToolCallInfo[])).toThrow(
        expect.objectContaining({ code: "TOOL_USE_PARSE_FAILED" }),
      );
    });
  });

  // ── executeToolBatch ────────────────────────────────────────────

  describe("executeToolBatch — 批量执行 tools", () => {
    it("isConcurrencySafe tools 并行执行", async () => {
      const executionOrder: string[] = [];
      const kgTool = registry.get("kgTool") as WritingTool;
      const memTool = registry.get("memTool") as WritingTool;

      // Track execution order
      (kgTool.execute as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        executionOrder.push("kgTool-start");
        await new Promise((r) => setTimeout(r, 100));
        executionOrder.push("kgTool-end");
        return { success: true, data: {} };
      });
      (memTool.execute as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        executionOrder.push("memTool-start");
        await new Promise((r) => setTimeout(r, 100));
        executionOrder.push("memTool-end");
        return { success: true, data: {} };
      });

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
        { callId: "c2", toolName: "memTool", arguments: { query: "test" } },
      ];

      const resultPromise = handler.executeToolBatch(calls, makeToolContext());
      await vi.advanceTimersByTimeAsync(200);
      const results = await resultPromise;

      expect(results).toHaveLength(2);
      // Both should start before either ends (parallel execution)
      expect(executionOrder.indexOf("kgTool-start")).toBeLessThan(
        executionOrder.indexOf("memTool-end"),
      );
      expect(executionOrder.indexOf("memTool-start")).toBeLessThan(
        executionOrder.indexOf("kgTool-end"),
      );
    });

    it("isConcurrencySafe=false tools 串行执行", async () => {
      // Register a non-concurrent-safe tool
      registry.register(buildTool({
        name: "unsafeTool",
        description: "Not safe for concurrent execution",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({ success: true }),
      }));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "unsafeTool", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it("结果按原始顺序返回", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "first" } },
        { callId: "c2", toolName: "memTool", arguments: { query: "second" } },
        { callId: "c3", toolName: "docTool", arguments: { query: "third" } },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results).toHaveLength(3);
      expect(results[0].callId).toBe("c1");
      expect(results[1].callId).toBe("c2");
      expect(results[2].callId).toBe("c3");
    });

    it("每个结果包含 durationMs", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results[0].durationMs).toEqual(expect.any(Number));
      expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── injectResults ───────────────────────────────────────────────

  describe("injectResults — 注入 tool 结果到消息流", () => {
    it("为每个 tool result 添加 role=tool 消息", () => {
      const currentMessages: LLMMessage[] = [
        { role: "system", content: "system prompt" },
        { role: "user", content: "续写第十章" },
        { role: "assistant", content: "让我查询角色设定..." },
      ];

      const results: ToolCallResult[] = [
        {
          callId: "call-001",
          toolName: "kgTool",
          success: true,
          data: { traits: ["冷静", "理性"] },
          durationMs: 150,
        },
      ];

      const updated = handler.injectResults(
        currentMessages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );

      const toolMessages = updated.filter((m) => m.role === "tool");
      expect(toolMessages).toHaveLength(1);
      expect(toolMessages[0].content).toContain("冷静");
    });

    it("tool 消息包含 toolCallId", () => {
      const currentMessages: LLMMessage[] = [
        { role: "user", content: "test" },
      ];

      const results: ToolCallResult[] = [
        {
          callId: "call-xyz",
          toolName: "kgTool",
          success: true,
          data: "result data",
          durationMs: 50,
        },
      ];

      const updated = handler.injectResults(
        currentMessages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );

      const toolMsg = updated.find((m) => m.role === "tool");
      expect(toolMsg).toBeDefined();
      expect((toolMsg as LLMMessage & { toolCallId?: string }).toolCallId).toBe("call-xyz");
    });

    it("tool 消息位置在 assistant 消息之后", () => {
      const currentMessages: LLMMessage[] = [
        { role: "system", content: "sys" },
        { role: "user", content: "usr" },
        { role: "assistant", content: "ast" },
      ];

      const results: ToolCallResult[] = [
        { callId: "c1", toolName: "kgTool", success: true, data: {}, durationMs: 10 },
      ];

      const updated = handler.injectResults(
        currentMessages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );

      const lastAssistantIdx = updated.map((m) => m.role).lastIndexOf("assistant");
      const toolIdx = updated.findIndex((m) => m.role === "tool");

      expect(toolIdx).toBeGreaterThan(lastAssistantIdx);
    });

    it("失败的 tool result 也注入消息流（告知 AI）", () => {
      const currentMessages: LLMMessage[] = [
        { role: "user", content: "test" },
      ];

      const results: ToolCallResult[] = [
        {
          callId: "c1",
          toolName: "unknownTool",
          success: false,
          error: { code: "TOOL_USE_TOOL_NOT_FOUND", message: "unknownTool 未注册" },
          durationMs: 0,
        },
      ];

      const updated = handler.injectResults(
        currentMessages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );

      const toolMsg = updated.find((m) => m.role === "tool");
      expect(toolMsg).toBeDefined();
      expect(toolMsg!.content).toContain("TOOL_USE_TOOL_NOT_FOUND");
    });
  });

  // ── Max Rounds 限制 ─────────────────────────────────────────────

  describe("Max Rounds — 最大轮次限制", () => {
    it("超过 maxToolRounds 后，handler 返回 TOOL_USE_MAX_ROUNDS_EXCEEDED", async () => {
      const limitedConfig = makeConfig({ maxToolRounds: 3 });
      const limitedHandler = createToolUseHandler(registry, limitedConfig);
      const ctx = makeToolContext();

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
      ];

      // Simulate 4 rounds of tool execution (exceeding maxToolRounds=3)
      for (let round = 0; round < 3; round++) {
        await limitedHandler.executeToolBatch(calls, ctx);
      }

      // 4th round should be rejected
      const results = await limitedHandler.executeToolBatch(calls, ctx);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_MAX_ROUNDS_EXCEEDED");
    });

    it("超过 maxToolRounds 后，使用 partial content 作为 fallback", async () => {
      const limitedConfig = makeConfig({ maxToolRounds: 2 });
      const limitedHandler = createToolUseHandler(registry, limitedConfig);
      const ctx = makeToolContext();

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
      ];

      // Exhaust rounds
      for (let round = 0; round < 2; round++) {
        await limitedHandler.executeToolBatch(calls, ctx);
      }

      // Exceeding round should contain partial data from last successful round
      const results = await limitedHandler.executeToolBatch(calls, ctx);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_MAX_ROUNDS_EXCEEDED");
      // Partial content should be available in the error message
      expect(results[0].error?.message).toEqual(expect.any(String));
    });
  });

  // ── All Tools Fail — 快速退出 ──────────────────────────────────

  describe("All Tools Fail — 全部失败快速退出", () => {
    it("单轮中所有 tool call 均失败 → 返回全失败结果", async () => {
      const failRegistry = createToolRegistry();
      failRegistry.register(buildTool({
        name: "failTool",
        description: "Always fails",
        isConcurrencySafe: true,
        execute: vi.fn().mockRejectedValue(new Error("tool error")),
      }));

      const failHandler = createToolUseHandler(failRegistry, config);

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "failTool", arguments: {} },
      ];

      const results = await failHandler.executeToolBatch(calls, makeToolContext());

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_EXECUTION_FAILED");
    });

    it("多个 tool 全部失败时，所有 results 都是 success=false", async () => {
      const failRegistry = createToolRegistry();
      failRegistry.register(buildTool({
        name: "fail1",
        description: "Fails",
        isConcurrencySafe: true,
        execute: vi.fn().mockRejectedValue(new Error("err1")),
      }));
      failRegistry.register(buildTool({
        name: "fail2",
        description: "Fails too",
        isConcurrencySafe: true,
        execute: vi.fn().mockRejectedValue(new Error("err2")),
      }));

      const failHandler = createToolUseHandler(failRegistry, config);
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "fail1", arguments: {} },
        { callId: "c2", toolName: "fail2", arguments: {} },
      ];

      const results = await failHandler.executeToolBatch(calls, makeToolContext());

      const allFailed = results.every((r) => !r.success);
      expect(allFailed).toBe(true);
    });

    it("全部失败时返回 TOOL_USE_ALL_FAILED 错误码", async () => {
      const failRegistry = createToolRegistry();
      failRegistry.register(buildTool({
        name: "failA",
        description: "Fails",
        isConcurrencySafe: true,
        execute: vi.fn().mockRejectedValue(new Error("errA")),
      }));
      failRegistry.register(buildTool({
        name: "failB",
        description: "Fails",
        isConcurrencySafe: true,
        execute: vi.fn().mockRejectedValue(new Error("errB")),
      }));

      const failHandler = createToolUseHandler(failRegistry, config);
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "failA", arguments: {} },
        { callId: "c2", toolName: "failB", arguments: {} },
      ];

      const results = await failHandler.executeToolBatch(calls, makeToolContext());
      const allFailed = results.every((r) => !r.success);
      expect(allFailed).toBe(true);

      // Batch-level summary should indicate all failed
      const batchSummary = failHandler.getBatchSummary(results);
      expect(batchSummary.allFailed).toBe(true);
      expect(batchSummary.errorCode).toBe("TOOL_USE_ALL_FAILED");
    });

    it("全部失败时提前退出循环（不再继续下一轮）", async () => {
      const executeSpy = vi.fn().mockRejectedValue(new Error("fail"));
      const failRegistry = createToolRegistry();
      failRegistry.register(buildTool({
        name: "failTool",
        description: "Fails",
        isConcurrencySafe: true,
        execute: executeSpy,
      }));

      const failHandler = createToolUseHandler(failRegistry, config);
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "failTool", arguments: {} },
      ];

      const results = await failHandler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(false);
      // shouldContinueLoop should return false when all tools fail
      const batchSummary = failHandler.getBatchSummary(results);
      expect(batchSummary.shouldContinueLoop).toBe(false);
    });
  });

  // ── Tool Not Found ─────────────────────────────────────────────

  describe("Tool Not Found — 工具未注册", () => {
    it("AI 请求不存在的 tool → result.error.code === TOOL_USE_TOOL_NOT_FOUND", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "unknownTool", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_TOOL_NOT_FOUND");
    });

    it("部分 tool 不存在时，存在的 tool 仍正常执行", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
        { callId: "c2", toolName: "nonExistent", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.code).toBe("TOOL_USE_TOOL_NOT_FOUND");
    });
  });

  // ── Timeout 处理 ──────────────────────────────────────────────

  describe("Timeout — tool 执行超时", () => {
    it("tool 执行超过 toolTimeoutMs → result 标记失败", async () => {
      const slowRegistry = createToolRegistry();
      slowRegistry.register(buildTool({
        name: "slowTool",
        description: "Very slow tool",
        isConcurrencySafe: true,
        execute: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 20_000)),
        ),
      }));

      const shortTimeoutConfig = makeConfig({ toolTimeoutMs: 5_000 });
      const timeoutHandler = createToolUseHandler(slowRegistry, shortTimeoutConfig);

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "slowTool", arguments: {} },
      ];

      const resultPromise = timeoutHandler.executeToolBatch(calls, makeToolContext());

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(6_000);

      const results = await resultPromise;

      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_TIMEOUT");
    });
  });

  // ── Read-Only 约束 ────────────────────────────────────────────

  describe("Read-Only Constraint — documentWrite 不可用", () => {
    it("AI 请求 documentWrite（未注册到 agentic loop）→ 返回 TOOL_USE_TOOL_NOT_FOUND", async () => {
      // Create a clean registry WITHOUT documentWrite
      const readOnlyRegistry = createToolRegistry();
      readOnlyRegistry.register(buildTool({
        name: "documentRead",
        description: "Read document (P1 built-in)",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
      }));
      // documentWrite is intentionally NOT registered — "not exposed" = not registered

      const readOnlyHandler = createToolUseHandler(readOnlyRegistry, config);

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "documentWrite", arguments: { content: "hack" } },
      ];

      const results = await readOnlyHandler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_TOOL_NOT_FOUND");
    });

    it("documentRead 在 agentic loop 中可用", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "documentRead", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(true);
    });
  });

  // ── Context Budget Check ──────────────────────────────────────

  describe("Context Budget — 上下文预算检查", () => {
    it("injectResults 后消息总内容增加", () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "short" },
      ];

      const results: ToolCallResult[] = [
        {
          callId: "c1",
          toolName: "kgTool",
          success: true,
          data: { info: "大量角色信息..." },
          durationMs: 10,
        },
      ];

      const updated = handler.injectResults(
        messages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );

      const totalContentBefore = messages.reduce((s, m) => s + m.content.length, 0);
      const totalContentAfter = updated.reduce((s, m) => s + m.content.length, 0);

      expect(totalContentAfter).toBeGreaterThan(totalContentBefore);
    });
  });

  // ── AgenticToolContext — 参数传递 ──────────────────────────────

  describe("AgenticToolContext — args 字段", () => {
    it("tool 执行时收到的 context 包含来自 AI 的 arguments", async () => {
      const executeSpy = vi.fn().mockResolvedValue({ success: true, data: {} });
      const argRegistry = createToolRegistry();
      argRegistry.register(buildTool({
        name: "testTool",
        description: "Test",
        isConcurrencySafe: true,
        execute: executeSpy,
      }));

      const argHandler = createToolUseHandler(argRegistry, config);
      const toolArgs = { query: "林远", entityType: "character" };

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "testTool", arguments: toolArgs },
      ];

      await argHandler.executeToolBatch(calls, makeToolContext());

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-001",
          requestId: "req-001",
        }),
      );
      // Verify AI-provided arguments are forwarded via AgenticToolContext.args
      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: { query: "林远", entityType: "character" },
        }),
      );
    });
  });

  // ── 混合安全/不安全 tools ─────────────────────────────────────

  describe("Mixed Safety — 混合安全/不安全 tools 的执行", () => {
    it("安全和不安全 tools 混合时，策略正确分区执行", async () => {
      registry.register(buildTool({
        name: "unsafeTool",
        description: "Unsafe",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({ success: true }),
      }));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: {} },
        { callId: "c2", toolName: "unsafeTool", arguments: {} },
        { callId: "c3", toolName: "memTool", arguments: {} },
      ];

      const results = await handler.executeToolBatch(calls, makeToolContext());

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  // ── Event Emission ────────────────────────────────────────────

  describe("Event Emission — 事件发射", () => {
    it("tool-use-started 事件包含 type, timestamp, requestId, round, toolNames", async () => {
      const events: unknown[] = [];
      handler.on("tool-use-started", (e: unknown) => events.push(e));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
        { callId: "c2", toolName: "memTool", arguments: { query: "test" } },
      ];

      await handler.executeToolBatch(calls, makeToolContext());

      expect(events.length).toBeGreaterThanOrEqual(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe("tool-use-started");
      expect(event.timestamp).toEqual(expect.any(Number));
      expect(event.requestId).toBe("req-001");
      expect(event.round).toEqual(expect.any(Number));
      expect(event.toolNames).toEqual(expect.arrayContaining(["kgTool", "memTool"]));
    });

    it("tool-use-completed 事件包含 type, timestamp, requestId, results, hasNextRound", async () => {
      const events: unknown[] = [];
      handler.on("tool-use-completed", (e: unknown) => events.push(e));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: {} },
      ];

      await handler.executeToolBatch(calls, makeToolContext());

      expect(events.length).toBeGreaterThanOrEqual(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe("tool-use-completed");
      expect(event.timestamp).toEqual(expect.any(Number));
      expect(event.requestId).toBe("req-001");
      expect(Array.isArray(event.results)).toBe(true);
      expect(typeof event.hasNextRound).toBe("boolean");
    });

    it("tool-use-failed 事件包含 type, timestamp, requestId, error.code", async () => {
      const events: unknown[] = [];
      handler.on("tool-use-failed", (e: unknown) => events.push(e));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "nonExistentTool", arguments: {} },
      ];

      await handler.executeToolBatch(calls, makeToolContext());

      expect(events.length).toBeGreaterThanOrEqual(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe("tool-use-failed");
      expect(event.timestamp).toEqual(expect.any(Number));
      expect(event.requestId).toBe("req-001");
      expect(event.error).toEqual(expect.objectContaining({ code: expect.any(String) }));
    });
  });

  // ── Non-Agentic Skill ─────────────────────────────────────────

  describe("Non-Agentic Skill — 非 agentic 技能忽略 tool_use", () => {
    it("agenticLoop=false 时 AI 返回 tool_use → 工具调用被丢弃并发出警告", async () => {
      const nonAgenticConfig = makeConfig({ agenticLoop: false } as Partial<ToolUseConfig>);
      const nonAgenticHandler = createToolUseHandler(registry, nonAgenticConfig);

      const warnings: unknown[] = [];
      nonAgenticHandler.on("tool-use-warning", (e: unknown) => warnings.push(e));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
      ];

      const results = await nonAgenticHandler.executeToolBatch(calls, makeToolContext());

      // Tool calls should be discarded
      expect(results).toHaveLength(0);
      // Warning event should be yielded
      expect(warnings.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Batch Failure ─────────────────────────────────────────────

  describe("Batch Failure — 批量执行器同步抛出", () => {
    it("批量执行器同步抛出 → TOOL_USE_BATCH_FAILED", async () => {
      const throwRegistry = createToolRegistry();
      throwRegistry.register(buildTool({
        name: "throwTool",
        description: "Throws synchronously",
        isConcurrencySafe: true,
        execute: vi.fn().mockImplementation(() => {
          throw new Error("Synchronous batch failure");
        }),
      }));

      const throwHandler = createToolUseHandler(throwRegistry, config);

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "throwTool", arguments: {} },
      ];

      const results = await throwHandler.executeToolBatch(calls, makeToolContext());

      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe("TOOL_USE_BATCH_FAILED");
    });
  });

  // ── maxConcurrentTools ────────────────────────────────────────

  describe("maxConcurrentTools — 并发限制", () => {
    it("maxConcurrentTools=4 时最多 4 个并行执行", async () => {
      let activeConcurrent = 0;
      let maxObservedConcurrent = 0;

      const concurrentRegistry = createToolRegistry();
      for (let i = 0; i < 6; i++) {
        concurrentRegistry.register(buildTool({
          name: `concTool${i}`,
          description: `Concurrent tool ${i}`,
          isConcurrencySafe: true,
          execute: vi.fn().mockImplementation(async () => {
            activeConcurrent++;
            maxObservedConcurrent = Math.max(maxObservedConcurrent, activeConcurrent);
            await new Promise((r) => setTimeout(r, 100));
            activeConcurrent--;
            return { success: true, data: {} };
          }),
        }));
      }

      const concConfig = makeConfig({ maxConcurrentTools: 4 });
      const concHandler = createToolUseHandler(concurrentRegistry, concConfig);

      const calls: ParsedToolCall[] = Array.from({ length: 6 }, (_, i) => ({
        callId: `c${i}`,
        toolName: `concTool${i}`,
        arguments: {},
      }));

      const resultPromise = concHandler.executeToolBatch(calls, makeToolContext());
      await vi.advanceTimersByTimeAsync(300);
      const results = await resultPromise;

      expect(results).toHaveLength(6);
      expect(maxObservedConcurrent).toBeLessThanOrEqual(4);
    });
  });

  // ── Null/Undefined Tool Result Data ───────────────────────────

  describe("Null/Undefined Data — 工具返回空数据", () => {
    it("injectResults 处理 data: undefined 不抛出", () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "test" },
      ];

      const results: ToolCallResult[] = [
        { callId: "c1", toolName: "kgTool", success: true, data: undefined, durationMs: 10 },
      ];

      expect(() =>
        handler.injectResults(
          messages as Parameters<ToolUseHandler["injectResults"]>[0],
          results,
        ),
      ).not.toThrow();

      const updated = handler.injectResults(
        messages as Parameters<ToolUseHandler["injectResults"]>[0],
        results,
      );
      const toolMsg = updated.find((m) => m.role === "tool");
      expect(toolMsg).not.toBeUndefined();
    });

    it("injectResults 处理 data: null 不抛出", () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "test" },
      ];

      const results: ToolCallResult[] = [
        { callId: "c2", toolName: "kgTool", success: true, data: null, durationMs: 5 },
      ];

      expect(() =>
        handler.injectResults(
          messages as Parameters<ToolUseHandler["injectResults"]>[0],
          results,
        ),
      ).not.toThrow();
    });
  });

  // ── ToolUseRoundState 追踪 ────────────────────────────────────

  describe("ToolUseRoundState — 轮次状态追踪", () => {
    it("每轮执行后记录 round number、toolCalls 和 results", async () => {
      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "kgTool", arguments: { query: "test" } },
      ];

      await handler.executeToolBatch(calls, makeToolContext());

      const roundState: ToolUseRoundState = handler.getLastRoundState();
      expect(roundState.round).toEqual(expect.any(Number));
      expect(roundState.round).toBeGreaterThanOrEqual(1);
      expect(roundState.toolCalls).toHaveLength(1);
      expect(roundState.toolCalls[0].toolName).toBe("kgTool");
      expect(roundState.results).toHaveLength(1);
      expect(roundState.results[0].success).toBe(true);
    });
  });
});
