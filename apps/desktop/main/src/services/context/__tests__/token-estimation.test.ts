/**
 * 上下文预算 — Token 估算 P1 测试
 * Spec: openspec/specs/context-engine/spec.md — CJK-Aware Token Estimation
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 CJK/ASCII/混合文本 token 估算、空字符串、容量警戒、上下文层级。
 */

import { describe, it, expect } from "vitest";

import {
  estimateTokens,
  checkCapacityThreshold,
  assembleContextLayers,
} from "../tokenEstimation";

// ─── tests ──────────────────────────────────────────────────────────

describe("Token Estimation — Token 估算", () => {
  // ── CJK 估算 ─────────────────────────────────────────────────

  describe("CJK Characters — CJK 字符估算", () => {
    it("纯 CJK「你好世界」（4 字） → 6 tokens（4 × 1.5 = 6）", () => {
      expect(estimateTokens("你好世界")).toBe(6);
    });

    it("单个中文字符 → 2 tokens（1 × 1.5 = 1.5 → ceil → 2）", () => {
      expect(estimateTokens("你")).toBe(2);
    });

    it("日文平假名「こんにちは」→ 8 tokens（5 × 1.5 = 7.5 → ceil → 8）", () => {
      expect(estimateTokens("こんにちは")).toBe(8);
    });

    it("韩文「안녕하세요」→ 8 tokens（5 × 1.5 = 7.5 → ceil → 8）", () => {
      expect(estimateTokens("안녕하세요")).toBe(8);
    });

    it("CJK 标点也计入 CJK 范围", () => {
      // 「。」is U+3002 (in CJK Symbols range \u3000-\u303f)
      // 2 CJK chars: 「你」+ 「。」= 2 × 1.5 = 3
      expect(estimateTokens("你。")).toBe(3);
    });

    it("补充平面汉字「𠀀」也按 CJK 计数", () => {
      expect(estimateTokens("𠀀")).toBe(2);
    });

    it("片假名扩展「ㇰ」也按 CJK 计数", () => {
      expect(estimateTokens("ㇰ")).toBe(2);
    });
  });

  // ── ASCII 估算 ────────────────────────────────────────────────

  describe("ASCII Text — ASCII 文本估算", () => {
    it("纯 ASCII「hello」→ 2 tokens（5 bytes / 4 = 1.25 → ceil → 2）", () => {
      expect(estimateTokens("hello")).toBe(2);
    });

    it("较长 ASCII「hello world」→ 3 tokens（11 bytes / 4 = 2.75 → ceil → 3）", () => {
      expect(estimateTokens("hello world")).toBe(3);
    });

    it("单个 ASCII 字符「a」→ 1 token（1 / 4 = 0.25 → ceil → 1）", () => {
      expect(estimateTokens("a")).toBe(1);
    });

    it("纯数字「12345」→ 2 tokens（5 / 4 = 1.25 → ceil → 2）", () => {
      expect(estimateTokens("12345")).toBe(2);
    });
  });

  // ── 混合文本 ──────────────────────────────────────────────────

  describe("Mixed Text — 混合文本估算", () => {
    it("中英混合「你好 world」→ 5 tokens", () => {
      // 「你好」= 2 CJK × 1.5 = 3.0
      // 「 world」= 6 non-CJK bytes / 4 = 1.5
      // total = 3.0 + 1.5 = 4.5 → ceil → 5
      expect(estimateTokens("你好 world")).toBe(5);
    });

    it("中文穿插英文「今天是Monday」→ 正确计算", () => {
      // 「今天是」= 3 CJK × 1.5 = 4.5
      // 「Monday」= 6 bytes / 4 = 1.5
      // total = 4.5 + 1.5 = 6.0 → ceil → 6
      expect(estimateTokens("今天是Monday")).toBe(6);
    });

    it("Markdown 混合中文「# 你好」→ 正确计算", () => {
      // 「# 」= 2 non-CJK bytes / 4 = 0.5
      // 「你好」= 2 CJK × 1.5 = 3.0
      // total = 0.5 + 3.0 = 3.5 → ceil → 4
      expect(estimateTokens("# 你好")).toBe(4);
    });

    it("1000 个中文字符 → 约 1500 tokens", () => {
      expect(estimateTokens("你".repeat(1000))).toBe(1500);
    });

    it("1000 ASCII bytes → 约 250 tokens", () => {
      expect(estimateTokens("a".repeat(1000))).toBe(250);
    });
  });

  // ── 边界条件 ──────────────────────────────────────────────────

  describe("Edge Cases — 边界条件", () => {
    it("空字符串 → 0 tokens", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("纯空格 → 1 token（1 byte / 4 = 0.25 → ceil → 1）", () => {
      expect(estimateTokens(" ")).toBe(1);
    });

    it("多个空格「   」→ 1 token（3 / 4 = 0.75 → ceil → 1）", () => {
      expect(estimateTokens("   ")).toBe(1);
    });

    it("换行符「\\n」→ 1 token", () => {
      expect(estimateTokens("\n")).toBe(1);
    });

    it("单码点 emoji 走非 CJK bytes/4 回退", () => {
      const tokens = estimateTokens("😀");
      expect(tokens).toBe(1);
    });

    it("多码点 emoji「❤️」按 bytes/4 回退", () => {
      expect(estimateTokens("❤️")).toBe(2);
    });

    it("ZWJ emoji「👩‍💻」按 bytes/4 回退", () => {
      expect(estimateTokens("👩‍💻")).toBe(3);
    });

    it("结果始终为非负整数", () => {
      const cases = ["", "a", "你", "hello world", "你好世界", "mixed 文本 test"];
      for (const text of cases) {
        const t = estimateTokens(text);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(t)).toBe(true);
      }
    });
  });

  // ── 容量警戒 ──────────────────────────────────────────────────

  describe("Capacity Threshold — 容量警戒", () => {
    it("使用率 ≤ 87% → 状态为 normal", () => {
      const result = checkCapacityThreshold(8700, 10000);
      expect(result.status).toBe("normal");
    });

    it("使用率 > 87% 且 ≤ 95% → 触发 warning", () => {
      const result = checkCapacityThreshold(8800, 10000);
      expect(result.status).toBe("warning");
    });

    it("使用率 > 95% → 触发 critical（强制截断）", () => {
      const result = checkCapacityThreshold(9600, 10000);
      expect(result.status).toBe("critical");
    });

    it("使用率恰好 87% → normal（边界值）", () => {
      const result = checkCapacityThreshold(8700, 10000);
      expect(result.status).toBe("normal");
    });

    it("使用率恰好 95% → warning（临界不截断）", () => {
      const result = checkCapacityThreshold(9500, 10000);
      expect(result.status).toBe("warning");
    });

    it("使用率 0% → normal", () => {
      const result = checkCapacityThreshold(0, 10000);
      expect(result.status).toBe("normal");
    });

    it("容量为 0 → critical（避免除零）", () => {
      const result = checkCapacityThreshold(100, 0);
      expect(result.status).toBe("critical");
    });
  });

  // ── 上下文层级 ────────────────────────────────────────────────

  describe("Context Layers — V1 上下文层级", () => {
    it("V1 只有 Rules + Immediate 两个激活层", () => {
      const layers = assembleContextLayers({
        rules: "你是一个写作助手。",
        immediate: "当前文档内容...",
      });

      const activeLayerNames = layers
        .filter((l) => l.enabled)
        .map((l) => l.name);

      expect(activeLayerNames).toEqual(["rules", "immediate"]);
    });

    it("Settings 和 Retrieved 层在 V1 存在但为空/禁用", () => {
      const layers = assembleContextLayers({
        rules: "系统指令",
        immediate: "文档内容",
      });

      const settingsLayer = layers.find((l) => l.name === "settings");
      const retrievedLayer = layers.find((l) => l.name === "retrieved");

      expect(settingsLayer?.enabled).toBe(false);
      expect(retrievedLayer?.enabled).toBe(false);
    });

    it("层级 token 总和不超过预算", () => {
      const layers = assembleContextLayers({
        rules: "短规则",
        immediate: "短内容",
      });

      const totalTokens = layers.reduce((sum, l) => sum + (l.tokenCount ?? 0), 0);
      expect(totalTokens).toBeGreaterThan(0);
      // V1 default budget: reasonable upper bound
      expect(totalTokens).toBeLessThan(128_000);
    });

    it("每层包含 tokenCount 和 content 字段", () => {
      const layers = assembleContextLayers({
        rules: "系统规则内容",
        immediate: "文档正文内容",
      });

      for (const layer of layers.filter((l) => l.enabled)) {
        expect(layer.tokenCount).toBeGreaterThan(0);
        expect(typeof layer.content).toBe("string");
        expect(layer.content.length).toBeGreaterThan(0);
      }
    });
  });

  // ── 容量强制截断 ──────────────────────────────────────────────

  describe("Capacity Enforcement — 截断行为", () => {
    it("≥95% 容量时 immediate 层被 tail-trim 至 ≤95%", () => {
      const result = assembleContextLayers(
        {
          rules: { content: "system rules", tokenCount: 900 },
          immediate: { content: "very long content that exceeds budget", tokenCount: 200 },
        },
        { maxTokens: 1000 },
      );

      expect(result.immediate.truncated).toBe(true);
      expect(result.totalTokens).toBeLessThanOrEqual(950);
    });

    it("truncated 层包含 truncatedTokenCount", () => {
      const result = assembleContextLayers(
        {
          rules: { content: "system rules", tokenCount: 900 },
          immediate: { content: "very long content that exceeds budget", tokenCount: 200 },
        },
        { maxTokens: 1000 },
      );

      expect(result.immediate.truncated).toBe(true);
      expect(result.immediate.truncatedTokenCount).toBeDefined();
      expect(result.immediate.truncatedTokenCount).toBeLessThan(200);
    });
  });

  // ── stablePrefixHash ─────────────────────────────────────────

  describe("Stable Prefix Hash — 缓存友好性", () => {
    it("assembleContextLayers 返回 stablePrefixHash", () => {
      const result = assembleContextLayers(
        {
          rules: { content: "system rules", tokenCount: 100 },
          immediate: { content: "document text", tokenCount: 50 },
        },
        { maxTokens: 10000 },
      );

      expect(result.stablePrefixHash).toEqual(expect.any(String));
      expect(result.stablePrefixHash.length).toBeGreaterThan(0);
    });

    it("相同 rules 层内容 → stablePrefixHash 不变", () => {
      const config = { maxTokens: 10000 };
      const r1 = assembleContextLayers(
        { rules: { content: "same rules", tokenCount: 100 }, immediate: { content: "text A", tokenCount: 50 } },
        config,
      );
      const r2 = assembleContextLayers(
        { rules: { content: "same rules", tokenCount: 100 }, immediate: { content: "text B", tokenCount: 60 } },
        config,
      );

      expect(r1.stablePrefixHash).toBe(r2.stablePrefixHash);
    });

    it("不同 rules 层内容 → stablePrefixHash 变化", () => {
      const config = { maxTokens: 10000 };
      const r1 = assembleContextLayers(
        { rules: { content: "rules v1", tokenCount: 100 }, immediate: { content: "text", tokenCount: 50 } },
        config,
      );
      const r2 = assembleContextLayers(
        { rules: { content: "rules v2", tokenCount: 100 }, immediate: { content: "text", tokenCount: 50 } },
        config,
      );

      expect(r1.stablePrefixHash).not.toBe(r2.stablePrefixHash);
    });
  });
});
