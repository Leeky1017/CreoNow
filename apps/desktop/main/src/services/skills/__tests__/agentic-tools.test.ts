/**
 * agenticTools V1 测试
 * Spec: openspec/specs/skill-system/spec.md — V1 Agentic Read-Only Tools
 *
 * 验证三个只读工具的注册、执行、错误处理、阻止列表与清理。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { createToolRegistry } from "../toolRegistry";
import type { ToolRegistry } from "../toolRegistry";
import {
  registerAgenticTools,
  isToolBlocked,
  V1_TOOL_NAMES,
} from "../agenticTools";
import type { AgenticToolDeps } from "../agenticTools";

// ─── helpers ────────────────────────────────────────────────────────

function makeDeps(overrides: Partial<AgenticToolDeps> = {}): AgenticToolDeps {
  return {
    documentReader: {
      readSection: vi.fn().mockResolvedValue({ text: "hello", wordCount: 1 }),
    },
    versionSearcher: {
      searchVersions: vi
        .fn()
        .mockResolvedValue([{ versionId: "v1", summary: "init", createdAt: 1000 }]),
    },
    wordCounter: {
      getWordCount: vi.fn().mockResolvedValue({ wordCount: 42, charCount: 200 }),
    },
    ...overrides,
  };
}

function makeCtx(extra: Record<string, unknown> = {}) {
  return { documentId: "doc-1", requestId: "req-1", ...extra };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("agenticTools — V1 Read-Only Tools", () => {
  let registry: ToolRegistry;
  let deps: AgenticToolDeps;

  beforeEach(() => {
    registry = createToolRegistry();
    deps = makeDeps();
  });

  // ── 注册 ──────────────────────────────────────────────────────

  it("registerAgenticTools 注册三个只读工具", () => {
    registerAgenticTools(registry, deps);

    const names = registry.list().map((t) => t.name).sort();
    expect(names).toEqual([...V1_TOOL_NAMES].sort());
    expect(names).toHaveLength(3);
  });

  // ── 执行成功 ──────────────────────────────────────────────────

  it("read_document_section 执行成功", async () => {
    registerAgenticTools(registry, deps);
    const tool = registry.get("read_document_section")!;

    const result = await tool.execute(makeCtx({ args: { from: 0, to: 100 } }));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ text: "hello", wordCount: 1 });
    expect(deps.documentReader.readSection).toHaveBeenCalledWith("doc-1", 0, 100);
  });

  it("search_versions 执行成功", async () => {
    registerAgenticTools(registry, deps);
    const tool = registry.get("search_versions")!;

    const result = await tool.execute(makeCtx({ args: { query: "chapter", limit: 5 } }));

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ versionId: "v1", summary: "init", createdAt: 1000 }]);
    expect(deps.versionSearcher.searchVersions).toHaveBeenCalledWith("doc-1", "chapter", 5);
  });

  it("get_word_count 执行成功", async () => {
    registerAgenticTools(registry, deps);
    const tool = registry.get("get_word_count")!;

    const result = await tool.execute(makeCtx());

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ wordCount: 42, charCount: 200 });
    expect(deps.wordCounter.getWordCount).toHaveBeenCalledWith("doc-1");
  });

  // ── 执行失败 ──────────────────────────────────────────────────

  it("read_document_section 执行失败 → 返回错误", async () => {
    const failingDeps = makeDeps({
      documentReader: {
        readSection: vi.fn().mockRejectedValue(new Error("not found")),
      },
    });
    registerAgenticTools(registry, failingDeps);
    const tool = registry.get("read_document_section")!;

    const result = await tool.execute(makeCtx({ args: { from: 0, to: 50 } }));

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      code: "READ_SECTION_FAILED",
      message: "not found",
    });
  });

  // ── 阻止列表 ─────────────────────────────────────────────────

  it("isToolBlocked 拒绝 documentWrite", () => {
    expect(isToolBlocked("documentWrite")).toBe(true);
    expect(isToolBlocked("document_write")).toBe(true);
    expect(isToolBlocked("read_document_section")).toBe(false);
  });

  // ── cleanup ───────────────────────────────────────────────────

  it("cleanup 函数取消注册所有工具", () => {
    const cleanup = registerAgenticTools(registry, deps);

    expect(registry.list()).toHaveLength(3);

    cleanup();

    expect(registry.list()).toHaveLength(0);
    for (const name of V1_TOOL_NAMES) {
      expect(registry.get(name)).toBeUndefined();
    }
  });

  // ── concurrency-safe ──────────────────────────────────────────

  it("工具是 concurrency-safe", () => {
    registerAgenticTools(registry, deps);

    for (const tool of registry.list()) {
      expect(tool.isConcurrencySafe).toBe(true);
    }
  });
});
