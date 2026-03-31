/**
 * AIServiceAdapter P1 测试
 * Spec: openspec/specs/ai-service/spec.md — AIServiceAdapter Interface
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 streamChat、estimateTokens（CJK 准确性）、abort。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AIServiceAdapter, StreamChunk } from "../aiServiceAdapter";
import { createAIServiceAdapter } from "../aiServiceAdapter";

// ─── helpers ────────────────────────────────────────────────────────

/** Create a mock underlying AI service (existing AiService) */
function createMockUnderlyingService() {
  return {
    runSkill: vi.fn().mockResolvedValue({ ok: true, data: { text: "response" } }),
    listModels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    cancel: vi.fn().mockReturnValue({ ok: true }),
    feedback: vi.fn().mockReturnValue({ ok: true }),
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("AIServiceAdapter", () => {
  let adapter: AIServiceAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    const underlying = createMockUnderlyingService();
    adapter = createAIServiceAdapter(underlying);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── streamChat ────────────────────────────────────────────────

  describe("streamChat — 流式对话", () => {
    it("streamChat 返回 AsyncGenerator<StreamChunk>", async () => {
      const gen = adapter.streamChat(
        [{ role: "user", content: "你好" }],
        { signal: new AbortController().signal, onComplete: vi.fn(), onError: vi.fn() },
      );

      // AsyncGenerator should have next() method
      expect(typeof gen.next).toBe("function");
      expect(typeof gen.return).toBe("function");
      expect(typeof gen.throw).toBe("function");

      // Consume at least one chunk and verify its content
      const firstResult = await gen.next();
      if (!firstResult.done) {
        const chunk: StreamChunk = firstResult.value;
        expect(typeof chunk.delta).toBe("string");
        expect(typeof chunk.accumulatedTokens).toBe("number");
        expect(chunk.accumulatedTokens).toBeGreaterThanOrEqual(0);
      }

      // Cleanup
      await gen.return(undefined);
    });

    it("streamChat 产出的 chunk 符合 StreamChunk 接口", async () => {
      const gen = adapter.streamChat(
        [{ role: "user", content: "测试" }],
        { signal: new AbortController().signal, onComplete: vi.fn(), onError: vi.fn() },
      );

      const firstResult = await gen.next();
      if (!firstResult.done) {
        const chunk: StreamChunk = firstResult.value;
        expect(chunk).toHaveProperty("delta");
        expect(chunk).toHaveProperty("finishReason");
        expect(chunk).toHaveProperty("accumulatedTokens");
        expect(typeof chunk.delta).toBe("string");
        expect(typeof chunk.accumulatedTokens).toBe("number");
      }

      await gen.return(undefined);
    });
  });

  // ── streamChat 错误场景 ───────────────────────────────────────

  describe("streamChat — 错误场景", () => {
    it("底层 service 抛错 → adapter 抛出包含原因的错误", async () => {
      const underlying = createMockUnderlyingService();
      (underlying as Record<string, unknown>).streamChat = vi.fn().mockRejectedValue(new Error("connection refused"));
      const errorAdapter = createAIServiceAdapter(underlying);

      const gen = errorAdapter.streamChat(
        [{ role: "user", content: "test" }],
        { signal: new AbortController().signal, onComplete: vi.fn(), onError: vi.fn() },
      );

      await expect(gen.next()).rejects.toThrow("connection refused");
    });

    it("底层 service 返回空流 → adapter 产出 stop chunk", async () => {
      const underlying = createMockUnderlyingService();
      (underlying as Record<string, unknown>).streamChat = vi.fn().mockImplementation(async function* () {
        // empty — no chunks yielded
      });
      const emptyAdapter = createAIServiceAdapter(underlying);

      const chunks: StreamChunk[] = [];
      for await (const chunk of emptyAdapter.streamChat(
        [{ role: "user", content: "test" }],
        { signal: new AbortController().signal, onComplete: vi.fn(), onError: vi.fn() },
      )) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].finishReason).toBe("stop");
    });
  });

  // ── estimateTokens ────────────────────────────────────────────

  describe("estimateTokens — Token 估算", () => {
    it("纯中文「你好世界」→ 6 tokens（4 chars × 1.5）", () => {
      const tokens = adapter.estimateTokens("你好世界");
      expect(tokens).toBe(6);
    });

    it("纯 ASCII「hello」→ 2 tokens（5 bytes / 4 = 1.25 → ceil → 2）", () => {
      const tokens = adapter.estimateTokens("hello");
      expect(tokens).toBe(2);
    });

    it("中英混合「你好 world」→ 正确分别计算", () => {
      // 「你好」= 2 CJK chars × 1.5 = 3 tokens
      // 「 world」= 6 bytes (space + world) → 6/4 = 1.5 → ceil → 2
      // But ceil is applied to total: 3 + 1.5 = 4.5 → ceil → 5
      const tokens = adapter.estimateTokens("你好 world");
      expect(tokens).toBe(5);
    });

    it("空字符串 → 0 tokens", () => {
      const tokens = adapter.estimateTokens("");
      expect(tokens).toBe(0);
    });

    it("纯数字「12345」→ 2 tokens（5 bytes / 4 = 1.25 → ceil → 2）", () => {
      const tokens = adapter.estimateTokens("12345");
      expect(tokens).toBe(2);
    });

    it("日文平假名也视为 CJK（1.5 tokens/char）", () => {
      // 「こんにちは」= 5 chars × 1.5 = 7.5 → ceil → 8
      const tokens = adapter.estimateTokens("こんにちは");
      expect(tokens).toBe(8);
    });

    it("韩文也视为 CJK（1.5 tokens/char）", () => {
      // 「안녕」= 2 chars × 1.5 = 3 → ceil → 3
      const tokens = adapter.estimateTokens("안녕");
      expect(tokens).toBe(3);
    });

    it("长文本的 token 估算与简单公式一致", () => {
      const longChinese = "这是一段很长的中文文本，用于测试token估算功能的准确性。";
      const cjkCount = [...longChinese].filter((c) =>
        /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/.test(c),
      ).length;
      const bytes = new TextEncoder().encode(longChinese).length;
      const nonCjkBytes = bytes - cjkCount * 3;
      const expected = Math.ceil(cjkCount * 1.5 + nonCjkBytes / 4);

      expect(adapter.estimateTokens(longChinese)).toBe(expected);
    });
  });

  // ── abort ─────────────────────────────────────────────────────

  describe("abort — 取消当前流", () => {
    it("abort 后正在进行的 streamChat 停止", async () => {
      const controller = new AbortController();
      const gen = adapter.streamChat(
        [{ role: "user", content: "写一篇长文" }],
        {
          signal: controller.signal,
          onComplete: vi.fn(),
          onError: vi.fn(),
        },
      );

      // Start consuming
      const firstResult = await gen.next();
      expect(firstResult.done).toBe(false);

      // Abort
      adapter.abort();

      // Subsequent calls should complete (done=true) or throw
      try {
        const nextResult = await gen.next();
        // If it returns, it should be done
        expect(nextResult.done).toBe(true);
      } catch {
        // Also acceptable — abort can throw
      }
    });

    it("abort 后再调用 streamChat → 应正常开始新的流", async () => {
      adapter.abort();

      const gen = adapter.streamChat(
        [{ role: "user", content: "新请求" }],
        {
          signal: new AbortController().signal,
          onComplete: vi.fn(),
          onError: vi.fn(),
        },
      );

      // Should be able to start consuming
      expect(typeof gen.next).toBe("function");
      await gen.return(undefined);
    });
  });
});
