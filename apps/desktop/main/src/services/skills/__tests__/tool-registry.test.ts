/**
 * ToolRegistry P1 测试
 * Spec: openspec/specs/skill-system/spec.md — V1 Tool Registry
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证注册/注销、buildTool 工厂、重复注册、并发安全标记。
 */

import { describe, it, expect, vi } from "vitest";

import type { WritingTool } from "../toolRegistry";
import { createToolRegistry, buildTool } from "../toolRegistry";

// ─── helpers ────────────────────────────────────────────────────────

function makeTool(overrides: Partial<WritingTool> = {}): WritingTool {
  return {
    name: "testTool",
    description: "A test tool",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ToolRegistry", () => {
  // ── 注册/注销 ─────────────────────────────────────────────────

  describe("Register / Unregister — 注册与注销", () => {
    it("注册 tool → 可通过 name 查找", () => {
      const registry = createToolRegistry();
      const tool = makeTool({ name: "documentRead" });

      registry.register(tool);

      expect(registry.get("documentRead")).toBe(tool);
    });

    it("注销 tool → 查找返回 undefined", () => {
      const registry = createToolRegistry();
      const tool = makeTool({ name: "documentRead" });

      registry.register(tool);
      const removed = registry.unregister("documentRead");

      expect(removed).toBe(true);
      expect(registry.get("documentRead")).toBeUndefined();
    });

    it("注销不存在的 tool → 返回 false", () => {
      const registry = createToolRegistry();

      expect(registry.unregister("nonexistent")).toBe(false);
    });

    it("查找不存在的 tool → 返回 undefined", () => {
      const registry = createToolRegistry();

      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("list() 返回所有已注册 tool 的只读数组", () => {
      const registry = createToolRegistry();
      registry.register(makeTool({ name: "toolA" }));
      registry.register(makeTool({ name: "toolB" }));
      registry.register(makeTool({ name: "toolC" }));

      const tools = registry.list();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name).sort()).toEqual(["toolA", "toolB", "toolC"]);
    });

    it("list() 返回的数组是只读的（修改不影响注册表）", () => {
      const registry = createToolRegistry();
      registry.register(makeTool({ name: "toolA" }));

      const tools = registry.list();
      // Attempting to modify returned array should not affect internal state
      (tools as WritingTool[]).push(makeTool({ name: "injected" }));

      expect(registry.list()).toHaveLength(1);
      expect(registry.get("injected")).toBeUndefined();
    });
  });

  // ── 重复注册 ──────────────────────────────────────────────────

  describe("Duplicate Registration — 重复注册", () => {
    it("注册已存在的 tool name → 抛出错误", () => {
      const registry = createToolRegistry();
      registry.register(makeTool({ name: "documentRead" }));

      expect(() => {
        registry.register(makeTool({ name: "documentRead" }));
      }).toThrow();
    });

    it("注销后重新注册同名 tool → 成功", () => {
      const registry = createToolRegistry();
      const tool1 = makeTool({ name: "documentRead", description: "v1" });
      const tool2 = makeTool({ name: "documentRead", description: "v2" });

      registry.register(tool1);
      registry.unregister("documentRead");
      registry.register(tool2);

      expect(registry.get("documentRead")?.description).toBe("v2");
    });
  });

  // ── buildTool 工厂 ──────────────────────────────────────────────

  describe("buildTool — 工厂函数", () => {
    it("传入 config → 返回 WritingTool 对象", () => {
      const tool = buildTool({
        name: "customTool",
        description: "Custom test tool",
        execute: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(tool.name).toBe("customTool");
      expect(tool.description).toBe("Custom test tool");
      expect(typeof tool.execute).toBe("function");
    });

    it("isConcurrencySafe 未指定 → 默认 false（fail-closed）", () => {
      const tool = buildTool({
        name: "unsafeTool",
        description: "Tool without explicit concurrency setting",
        execute: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(tool.isConcurrencySafe).toBe(false);
    });

    it("isConcurrencySafe 显式设为 true → 保留设置", () => {
      const tool = buildTool({
        name: "safeTool",
        description: "Thread-safe tool",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(tool.isConcurrencySafe).toBe(true);
    });
  });

  // ── 内置 Tool 默认值与执行结果 ─────────────────────────────────

  describe("Built-in Tool Defaults — 内置 Tool 默认值与执行结果", () => {
    it("V1 内置 documentRead 应为 isConcurrencySafe=true", () => {
      const tool = buildTool({
        name: "documentRead",
        description: "Read document text",
        isConcurrencySafe: true,
        execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
      });

      expect(tool.isConcurrencySafe).toBe(true);
    });

    it("V1 内置 documentWrite 应为 isConcurrencySafe=false", () => {
      const tool = buildTool({
        name: "documentWrite",
        description: "Write text to document",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(tool.isConcurrencySafe).toBe(false);
    });

    it("V1 内置 versionSnapshot 应为 isConcurrencySafe=false", () => {
      const tool = buildTool({
        name: "versionSnapshot",
        description: "Create version snapshot",
        isConcurrencySafe: false,
        execute: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(tool.isConcurrencySafe).toBe(false);
    });

    it("工具执行返回 ToolResult 结构", async () => {
      const executeFn = vi.fn().mockResolvedValue({
        success: true,
        data: { content: "Hello" },
      });
      const tool = buildTool({
        name: "testTool",
        description: "Test",
        execute: executeFn,
      });

      const result = await tool.execute({
        documentId: "doc-1",
        requestId: "req-1",
      });

      expect(result).toMatchObject({
        success: true,
        data: { content: "Hello" },
      });
    });

    it("工具执行失败返回 error 结构", async () => {
      const executeFn = vi.fn().mockResolvedValue({
        success: false,
        error: { code: "WRITE_FAILED", message: "Document locked" },
      });
      const tool = buildTool({
        name: "failTool",
        description: "Failing tool",
        execute: executeFn,
      });

      const result = await tool.execute({
        documentId: "doc-1",
        requestId: "req-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: "WRITE_FAILED",
        message: "Document locked",
      });
    });
  });
});
