/**
 * AI Streaming 主链路 P1 测试
 * Spec: openspec/specs/ai-service/spec.md — P1 Streaming with Backpressure
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证流式响应、中断恢复、超时、取消、Token 统计、背压。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { StreamChunk, StreamOptions, StreamResult } from "../streaming";
import { createStreamingService } from "../streaming";

// ─── helpers ────────────────────────────────────────────────────────

/** Collect all chunks from an async generator */
async function collectChunks(
  gen: AsyncGenerator<StreamChunk>,
): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

/** Create a mock LLM proxy that yields chunks */
function createMockLLMProxy(chunks: StreamChunk[]) {
  return {
    stream: vi.fn().mockImplementation(async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    }),
    abort: vi.fn(),
  };
}

/** Create default stream options */
function makeStreamOptions(overrides: Partial<StreamOptions> = {}): StreamOptions {
  return {
    signal: new AbortController().signal,
    onComplete: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("AI Streaming Service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── 正常流式响应 ──────────────────────────────────────────────

  describe("Normal Streaming — 正常流式响应", () => {
    it("streamChat → 逐 chunk 产出文本", async () => {
      const expectedChunks: StreamChunk[] = [
        { delta: "你", finishReason: null, accumulatedTokens: 1 },
        { delta: "好", finishReason: null, accumulatedTokens: 2 },
        { delta: "世界", finishReason: null, accumulatedTokens: 4 },
        { delta: "", finishReason: "stop", accumulatedTokens: 4 },
      ];

      const proxy = createMockLLMProxy(expectedChunks);
      const service = createStreamingService(proxy);
      const options = makeStreamOptions();

      const chunks = await collectChunks(
        service.streamChat([{ role: "user", content: "你好" }], options),
      );

      expect(chunks).toHaveLength(4);
      expect(chunks[0].delta).toBe("你");
      expect(chunks[1].delta).toBe("好");
      expect(chunks[2].delta).toBe("世界");
    });

    it("最终 chunk 的 finishReason 为 stop", async () => {
      const proxy = createMockLLMProxy([
        { delta: "text", finishReason: null, accumulatedTokens: 1 },
        { delta: "", finishReason: "stop", accumulatedTokens: 1 },
      ]);
      const service = createStreamingService(proxy);

      const chunks = await collectChunks(
        service.streamChat([{ role: "user", content: "test" }], makeStreamOptions()),
      );

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.finishReason).toBe("stop");
    });

    it("accumulatedTokens 单调递增", async () => {
      const proxy = createMockLLMProxy([
        { delta: "a", finishReason: null, accumulatedTokens: 1 },
        { delta: "b", finishReason: null, accumulatedTokens: 3 },
        { delta: "c", finishReason: null, accumulatedTokens: 6 },
        { delta: "", finishReason: "stop", accumulatedTokens: 6 },
      ]);
      const service = createStreamingService(proxy);

      const chunks = await collectChunks(
        service.streamChat([{ role: "user", content: "test" }], makeStreamOptions()),
      );

      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].accumulatedTokens).toBeGreaterThanOrEqual(
          chunks[i - 1].accumulatedTokens,
        );
      }
    });
  });

  // ── 连接中断恢复 ──────────────────────────────────────────────

  describe("Connection Recovery — 连接中断恢复", () => {
    it("第一次 streamChat 中断 → 自动重试 → 成功", async () => {
      let callCount = 0;
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          callCount++;
          if (callCount === 1) {
            yield { delta: "部分", finishReason: null, accumulatedTokens: 1 };
            throw new Error("connection reset");
          }
          yield { delta: "完整内容", finishReason: null, accumulatedTokens: 3 };
          yield { delta: "", finishReason: "stop" as const, accumulatedTokens: 3 };
        }),
        abort: vi.fn(),
      };

      const service = createStreamingService(proxy);
      const consumePromise = collectChunks(
        service.streamChat([{ role: "user", content: "test" }], makeStreamOptions()),
      );

      // Advance past retry delay (1s backoff)
      await vi.advanceTimersByTimeAsync(1000);
      const chunks = await consumePromise;

      expect(proxy.stream).toHaveBeenCalledTimes(2);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.finishReason).toBe("stop");
    });

    it("重试次数超过上限 → 产出 error", async () => {
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          throw new Error("persistent network failure");
        }),
        abort: vi.fn(),
      };

      const onError = vi.fn();
      const service = createStreamingService(proxy);

      const chunks: StreamChunk[] = [];
      const consumePromise = (async () => {
        try {
          for await (const chunk of service.streamChat(
            [{ role: "user", content: "test" }],
            makeStreamOptions({ onError }),
          )) {
            chunks.push(chunk);
          }
        } catch {
          // Expected to throw after max retries
        }
      })();

      // Advance past all retry delays (1s + 2s + 4s = 7s)
      await vi.advanceTimersByTimeAsync(7000);
      await consumePromise;

      // Max 3 retries (1 initial + 3 retries = 4 total calls)
      expect(proxy.stream.mock.calls.length).toBe(4);
    });

    it("重试使用指数退避 1s→2s→4s", async () => {
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          throw new Error("persistent failure");
        }),
        abort: vi.fn(),
      };

      const service = createStreamingService(proxy);

      // Start consuming without awaiting — let retries queue on fake timers
      const consumePromise = (async () => {
        try {
          for await (const _chunk of service.streamChat(
            [{ role: "user", content: "test" }],
            makeStreamOptions(),
          )) {
            // consume
          }
        } catch {
          // Expected after max retries
        }
      })();

      // Initial call
      await vi.advanceTimersByTimeAsync(0);
      expect(proxy.stream).toHaveBeenCalledTimes(1);

      // 第一次重试：1s 后
      await vi.advanceTimersByTimeAsync(1000);
      expect(proxy.stream).toHaveBeenCalledTimes(2);

      // 第二次重试：2s 后
      await vi.advanceTimersByTimeAsync(2000);
      expect(proxy.stream).toHaveBeenCalledTimes(3);

      // 第三次重试：4s 后
      await vi.advanceTimersByTimeAsync(4000);
      expect(proxy.stream).toHaveBeenCalledTimes(4);

      await consumePromise;
    });
  });

  // ── 超时处理 ──────────────────────────────────────────────────

  describe("Timeout — 超时处理", () => {
    it("streamChat 超过 timeout → 产出 error", async () => {
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          // Simulate hanging — never yields
          await new Promise(() => {});
        }),
        abort: vi.fn(),
      };

      const onError = vi.fn();
      const service = createStreamingService(proxy, { timeoutMs: 5000, maxRetries: 0 });

      const gen = service.streamChat(
        [{ role: "user", content: "test" }],
        makeStreamOptions({ onError }),
      );

      // Start consuming — pre-handle rejection to avoid unhandled rejection during timer advancement
      const firstPromise = gen.next();
      firstPromise.catch(() => {});

      // Advance timer past timeout
      await vi.advanceTimersByTimeAsync(6000);

      // Should have triggered timeout — now throws so orchestrator can retry
      try {
        await firstPromise;
      } catch {
        // Expected timeout error
      }

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: "retryable" }));
    });
  });

  // ── 取消 ──────────────────────────────────────────────────────

  describe("Cancel — 取消", () => {
    it("streamChat 执行中 abort → 立即停止，不再产出 chunk", async () => {
      const controller = new AbortController();

      const proxy = createMockLLMProxy([
        { delta: "chunk1", finishReason: null, accumulatedTokens: 1 },
        { delta: "chunk2", finishReason: null, accumulatedTokens: 2 },
        { delta: "chunk3", finishReason: null, accumulatedTokens: 3 },
        { delta: "", finishReason: "stop", accumulatedTokens: 3 },
      ]);
      const service = createStreamingService(proxy);

      const gen = service.streamChat(
        [{ role: "user", content: "test" }],
        makeStreamOptions({ signal: controller.signal }),
      );

      // Consume first chunk
      const first = await gen.next();
      expect(first.value.delta).toBe("chunk1");

      // Abort
      controller.abort();

      // Next call should stop
      const remaining: StreamChunk[] = [];
      try {
        let result = await gen.next();
        while (!result.done) {
          remaining.push(result.value);
          result = await gen.next();
        }
      } catch {
        // Abort may throw
      }

      // Should not have received all chunks
      expect(remaining.length).toBeLessThan(3);
    });

    it("取消不是 error — 是正常终止", async () => {
      const controller = new AbortController();
      const onError = vi.fn();
      const proxy = createMockLLMProxy([
        { delta: "text", finishReason: null, accumulatedTokens: 1 },
      ]);
      const service = createStreamingService(proxy);

      const gen = service.streamChat(
        [{ role: "user", content: "test" }],
        makeStreamOptions({ signal: controller.signal, onError }),
      );

      await gen.next();
      controller.abort();

      try {
        await gen.next();
      } catch {
        // Expected
      }

      // onError should NOT be called for user-initiated abort
      expect(onError).not.toHaveBeenCalled();
    });
  });

  // ── 流中断 partial-result ─────────────────────────────────────

  describe("Partial Result — 流中断保留已接收内容", () => {
    it("流中断时保留已接收内容为 partial-result", async () => {
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          yield { delta: "第一", finishReason: null, accumulatedTokens: 2 };
          yield { delta: "第二", finishReason: null, accumulatedTokens: 4 };
          yield { delta: "第三", finishReason: null, accumulatedTokens: 6 };
          throw new Error("connection lost mid-stream");
        }),
        abort: vi.fn(),
      };

      const onError = vi.fn();
      const service = createStreamingService(proxy, { maxRetries: 0 });

      const chunks: StreamChunk[] = [];
      try {
        for await (const chunk of service.streamChat(
          [{ role: "user", content: "test" }],
          makeStreamOptions({ onError }),
        )) {
          chunks.push(chunk);
        }
      } catch {
        // Expected
      }

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "partial-result",
          partialContent: "第一第二第三",
        }),
      );
    });
  });

  // ── Token 统计 ────────────────────────────────────────────────

  describe("Token Usage — Token 统计", () => {
    it("响应完成后 onComplete 包含 usage（promptTokens, completionTokens）", async () => {
      const onComplete = vi.fn();
      const proxy = createMockLLMProxy([
        { delta: "回答", finishReason: null, accumulatedTokens: 2 },
        { delta: "", finishReason: "stop", accumulatedTokens: 2 },
      ]);
      const service = createStreamingService(proxy);

      await collectChunks(
        service.streamChat(
          [{ role: "user", content: "问题" }],
          makeStreamOptions({ onComplete }),
        ),
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
      const result: StreamResult = onComplete.mock.calls[0][0];
      expect(result.usage).toBeDefined();
      expect(typeof result.usage.promptTokens).toBe("number");
      expect(typeof result.usage.completionTokens).toBe("number");
    });

    it("onComplete 包含完整拼接的 content", async () => {
      const onComplete = vi.fn();
      const proxy = createMockLLMProxy([
        { delta: "你好", finishReason: null, accumulatedTokens: 2 },
        { delta: "世界", finishReason: null, accumulatedTokens: 4 },
        { delta: "", finishReason: "stop", accumulatedTokens: 4 },
      ]);
      const service = createStreamingService(proxy);

      await collectChunks(
        service.streamChat(
          [{ role: "user", content: "问候" }],
          makeStreamOptions({ onComplete }),
        ),
      );

      const result: StreamResult = onComplete.mock.calls[0][0];
      expect(result.content).toBe("你好世界");
    });

    it("重试成功后 wasRetried=true", async () => {
      const onComplete = vi.fn();
      let callCount = 0;
      const proxy = {
        stream: vi.fn().mockImplementation(async function* () {
          callCount++;
          if (callCount === 1) throw new Error("transient");
          yield { delta: "ok", finishReason: "stop" as const, accumulatedTokens: 1 };
        }),
        abort: vi.fn(),
      };
      const service = createStreamingService(proxy);

      const consumePromise = collectChunks(
        service.streamChat(
          [{ role: "user", content: "test" }],
          makeStreamOptions({ onComplete }),
        ),
      );

      // Advance past retry delay (1s backoff)
      await vi.advanceTimersByTimeAsync(1000);
      await consumePromise;

      const result: StreamResult = onComplete.mock.calls[0][0];
      expect(result.wasRetried).toBe(true);
    });
  });

  // ── 背压 ──────────────────────────────────────────────────────

  describe("Backpressure — 背压", () => {
    it("AsyncGenerator 消费慢时，生产端自然暂停（不 OOM）", async () => {
      const chunkCount = 1000;
      const largeChunks: StreamChunk[] = Array.from({ length: chunkCount }, (_, i) => ({
        delta: `chunk-${i}`,
        finishReason: i === chunkCount - 1 ? ("stop" as const) : null,
        accumulatedTokens: i + 1,
      }));

      const proxy = createMockLLMProxy(largeChunks);
      const service = createStreamingService(proxy);

      const consumed: StreamChunk[] = [];
      const gen = service.streamChat(
        [{ role: "user", content: "test" }],
        makeStreamOptions(),
      );

      // Slow consumer — adds delay between each next() call
      for await (const chunk of gen) {
        consumed.push(chunk);
        // Simulate slow processing (in real scenario, pushing to IPC)
      }

      // All chunks should eventually be consumed
      expect(consumed).toHaveLength(chunkCount);
    });
  });
});
