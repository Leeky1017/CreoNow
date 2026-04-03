import { describe, expect, it, vi } from "vitest";

import { createToolUseHandler } from "../toolUseHandler";
import { buildTool, createToolRegistry, type ToolContext } from "../toolRegistry";

describe("ToolUseHandler", () => {
  it("执行工具时透传 AgenticToolContext.args，而不是旧的 arguments 顶层字段", async () => {
    const registry = createToolRegistry();
    const execute = vi.fn().mockResolvedValue({ success: true, data: { ok: true } });
    registry.register(
      buildTool({
        name: "docTool",
        description: "read document",
        isConcurrencySafe: true,
        execute,
      }),
    );

    const handler = createToolUseHandler(registry, {
      maxToolRounds: 5,
      toolTimeoutMs: 10_000,
      maxConcurrentTools: 4,
      agenticLoop: true,
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

    it("多个 isConcurrencySafe=false tools 严格串行执行（F5：spec 并发分区）", async () => {
      // Two unsafe tools — the second must not start until the first finishes
      const executionOrder: string[] = [];

      registry.register(buildTool({
        name: "unsafeA",
        description: "Unsafe tool A",
        isConcurrencySafe: false,
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push("unsafeA-start");
          await new Promise((r) => setTimeout(r, 100));
          executionOrder.push("unsafeA-end");
          return { success: true, data: { tool: "A" } };
        }),
      }));

      registry.register(buildTool({
        name: "unsafeB",
        description: "Unsafe tool B",
        isConcurrencySafe: false,
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push("unsafeB-start");
          await new Promise((r) => setTimeout(r, 50));
          executionOrder.push("unsafeB-end");
          return { success: true, data: { tool: "B" } };
        }),
      }));

      const calls: ParsedToolCall[] = [
        { callId: "c1", toolName: "unsafeA", arguments: {} },
        { callId: "c2", toolName: "unsafeB", arguments: {} },
      ];

      const resultPromise = handler.executeToolBatch(calls, makeToolContext());
      await vi.advanceTimersByTimeAsync(200);
      const results = await resultPromise;

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Serial: A must fully complete before B starts
      expect(executionOrder.indexOf("unsafeA-start")).toBeLessThan(
        executionOrder.indexOf("unsafeA-end"),
      );
      expect(executionOrder.indexOf("unsafeA-end")).toBeLessThan(
        executionOrder.indexOf("unsafeB-start"),
      );
      expect(executionOrder.indexOf("unsafeB-start")).toBeLessThan(
        executionOrder.indexOf("unsafeB-end"),
      );
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
          callId: "call-1",
          toolName: "docTool",
          arguments: { documentId: "doc-2", query: "前情" },
        },
      ],
      {
        documentId: "doc-1",
        requestId: "req-1",
      },
    );

    const ctx = execute.mock.calls[0]?.[0] as ToolContext & { args?: Record<string, unknown>; arguments?: unknown };
    expect(ctx.args).toEqual({ documentId: "doc-2", query: "前情" });
    expect("arguments" in ctx).toBe(false);
  });

  it("all-failed 摘要不阻止注入：失败结果仍保留给后续消息流", () => {
    const registry = createToolRegistry();
    const handler = createToolUseHandler(registry, {
      maxToolRounds: 5,
      toolTimeoutMs: 10_000,
      maxConcurrentTools: 4,
      agenticLoop: true,
    });

    const injected = handler.injectResults(
      [{ role: "assistant", content: "部分结果" }],
      [
        {
          callId: "call-1",
          toolName: "unknownTool",
          success: false,
          error: { code: "TOOL_USE_TOOL_NOT_FOUND", message: "unknownTool 未注册" },
          durationMs: 0,
        },
      ],
    );

    expect(injected).toHaveLength(2);
    expect(injected[1]).toMatchObject({ role: "tool", toolCallId: "call-1" });
    expect(injected[1]?.content).toContain("TOOL_USE_TOOL_NOT_FOUND");
  });
});
