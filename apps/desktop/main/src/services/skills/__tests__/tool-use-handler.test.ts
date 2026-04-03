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

    await handler.executeToolBatch(
      [
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
