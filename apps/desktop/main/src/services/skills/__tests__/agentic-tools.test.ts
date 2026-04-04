import { beforeEach, describe, expect, it, vi } from "vitest";

import { estimateTokens } from "../../context/tokenEstimation";
import { createToolRegistry } from "../toolRegistry";
import type { ToolRegistry } from "../toolRegistry";
import {
  AGENTIC_TOOL_NAMES,
  isToolBlocked,
  registerAgenticTools,
} from "../agenticTools";
import type { AgenticToolDeps } from "../agenticTools";

function makeDeps(overrides: Partial<AgenticToolDeps> = {}): AgenticToolDeps {
  return {
    kgTool: {
      query: vi.fn().mockResolvedValue({
        name: "林远",
        traits: ["冷静", "理性"],
      }),
    },
    memTool: {
      query: vi.fn().mockResolvedValue({
        memories: [{ id: "mem-1", text: "偏爱冷静克制的动作描写" }],
      }),
    },
    documentReader: {
      readDocument: vi.fn().mockResolvedValue({
        documentId: "doc-1",
        text: "林远先观察门缝里的光，再听见门后的脚步声。随后他没有立刻推门，而是退半步让呼吸平稳。",
      }),
    },
    ...overrides,
  };
}

function makeCtx(extra: Record<string, unknown> = {}) {
  return { documentId: "doc-1", requestId: "req-1", ...extra };
}

describe("agenticTools — P2 Read-Only Tools", () => {
  let registry: ToolRegistry;
  let deps: AgenticToolDeps;

  beforeEach(() => {
    registry = createToolRegistry();
    deps = makeDeps();
  });

  it("registerAgenticTools 注册 spec 对齐的四个只读工具", () => {
    registerAgenticTools(registry, deps);

    const names = registry.list().map((tool) => tool.name).sort();
    expect(names).toEqual([...AGENTIC_TOOL_NAMES].sort());
  });

  it("kgTool 执行成功并透传 query / entityType", async () => {
    registerAgenticTools(registry, deps);
    const tool = registry.get("kgTool");

    const result = await tool!.execute(
      makeCtx({
        args: { query: "林远的性格特点", entityType: "character" },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "林远",
      traits: ["冷静", "理性"],
    });
    expect(deps.kgTool.query).toHaveBeenCalledWith({
      documentId: "doc-1",
      query: "林远的性格特点",
      entityType: "character",
      requestId: "req-1",
    });
  });

  it("memTool 执行成功并在底层不可用时允许空结果", async () => {
    registerAgenticTools(registry, deps);
    const tool = registry.get("memTool");

    const result = await tool!.execute(
      makeCtx({
        args: { query: "用户写作风格偏好", memoryType: "style" },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      memories: [{ id: "mem-1", text: "偏爱冷静克制的动作描写" }],
    });
    expect(deps.memTool.query).toHaveBeenCalledWith({
      documentId: "doc-1",
      query: "用户写作风格偏好",
      memoryType: "style",
      requestId: "req-1",
    });
  });

  it("docTool / documentRead obey query + maxTokens + snippetChars 语义", async () => {
    registerAgenticTools(registry, deps);
    const docTool = registry.get("docTool");
    const documentRead = registry.get("documentRead");

    const docToolResult = await docTool!.execute(
      makeCtx({
        documentId: "doc-current",
        args: {
          documentId: "doc-ref",
          query: "门后",
          maxTokens: 8,
          snippetChars: 12,
        },
      }),
    );
    const documentReadResult = await documentRead!.execute(
      makeCtx({
        args: {
          query: "林远",
          maxTokens: 8,
          snippetChars: 10,
        },
      }),
    );

    expect(docToolResult.success).toBe(true);
    expect(docToolResult.data).toMatchObject({
      documentId: "doc-ref",
      query: "门后",
      truncated: true,
    });
    const docToolData = docToolResult.data as { content: string };
    expect(docToolData.content).toContain("门后");
    expect(docToolData.content).not.toContain("随后他没有立刻推门");
    expect(docToolData.content.length).toBeLessThanOrEqual(12);
    expect(estimateTokens(docToolData.content)).toBeLessThanOrEqual(8);

    expect(documentReadResult.success).toBe(true);
    expect(documentReadResult.data).toMatchObject({
      documentId: "doc-1",
      query: "林远",
      truncated: true,
    });
    const documentReadData = documentReadResult.data as { text: string };
    expect(documentReadData.text).toContain("林远");
    expect(documentReadData.text).not.toContain("随后他没有立刻推门");
    expect(documentReadData.text.length).toBeLessThanOrEqual(10);
    expect(estimateTokens(documentReadData.text)).toBeLessThanOrEqual(8);
    expect(deps.documentReader.readDocument).toHaveBeenCalledTimes(2);
  });

  it("kgTool 底层失败 → 返回错误", async () => {
    registerAgenticTools(
      registry,
      makeDeps({
        kgTool: {
          query: vi.fn().mockRejectedValue(new Error("kg offline")),
        },
      }),
    );
    const tool = registry.get("kgTool");

    const result = await tool!.execute(makeCtx({ args: { query: "林远" } }));

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      code: "KG_TOOL_FAILED",
      message: "kg offline",
    });
  });

  it("memTool 底层失败 → 返回错误", async () => {
    registerAgenticTools(
      registry,
      makeDeps({
        memTool: {
          query: vi.fn().mockRejectedValue(new Error("memory unavailable")),
        },
      }),
    );
    const tool = registry.get("memTool");

    const result = await tool!.execute(makeCtx({ args: { query: "风格" } }));

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      code: "MEM_TOOL_FAILED",
      message: "memory unavailable",
    });
  });

  it("docTool / documentRead 读取失败 → 返回错误", async () => {
    registerAgenticTools(
      registry,
      makeDeps({
        documentReader: {
          readDocument: vi.fn().mockRejectedValue(new Error("document missing")),
        },
      }),
    );
    const docTool = registry.get("docTool");
    const documentRead = registry.get("documentRead");

    const docToolResult = await docTool!.execute(makeCtx({ args: { query: "门后" } }));
    const documentReadResult = await documentRead!.execute(
      makeCtx({ args: { query: "林远" } }),
    );

    expect(docToolResult.success).toBe(false);
    expect(docToolResult.error).toMatchObject({
      code: "DOC_TOOL_FAILED",
      message: "document missing",
    });
    expect(documentReadResult.success).toBe(false);
    expect(documentReadResult.error).toMatchObject({
      code: "DOCUMENT_READ_FAILED",
      message: "document missing",
    });
  });

  it("isToolBlocked 拒绝 documentWrite / versionSnapshot", () => {
    expect(isToolBlocked("documentWrite")).toBe(true);
    expect(isToolBlocked("versionSnapshot")).toBe(true);
    expect(isToolBlocked("kgTool")).toBe(false);
  });

  it("cleanup 函数取消注册所有工具", () => {
    const cleanup = registerAgenticTools(registry, deps);

    expect(registry.list()).toHaveLength(4);
    cleanup();
    expect(registry.list()).toHaveLength(0);

    for (const name of AGENTIC_TOOL_NAMES) {
      expect(registry.get(name)).toBeUndefined();
    }
  });

  it("工具都是 concurrency-safe", () => {
    registerAgenticTools(registry, deps);

    for (const tool of registry.list()) {
      expect(tool.isConcurrencySafe).toBe(true);
    }
  });
});
