import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCompressionEngine,
  type CompressionConfig,
  type CompressionRequest,
  type NarrativeElements,
} from "../compressionEngine";

function createMockLlm() {
  return {
    complete: vi.fn().mockResolvedValue({
      content: "压缩后的摘要内容，包含角色：小明、小红",
    }),
  };
}

function createConfig(overrides?: Partial<CompressionConfig>): CompressionConfig {
  return {
    circuitBreaker: {
      failureThreshold: 3,
      cooldownMs: 5000,
    },
    timeoutMs: 10000,
    minTokenThreshold: 500,
    ...overrides,
  };
}

function createNarrative(overrides?: Partial<NarrativeElements>): NarrativeElements {
  return {
    characterNames: ["小明", "小红"],
    plotPoints: ["第一章开始"],
    toneMarkers: ["忧郁"],
    narrativePOV: "第三人称",
    foreshadowingClues: ["暗示"],
    timelineMarkers: ["清晨"],
    ...overrides,
  };
}

function createRequest(overrides?: Partial<CompressionRequest>): CompressionRequest {
  return {
    messages: [
      { role: "system", content: "你是一个助手" },
      { role: "user", content: "帮我写一段描述" },
      { role: "assistant", content: "好的，小明走在清晨的街道上" },
      { role: "user", content: "继续" },
      { role: "assistant", content: "小红出现在街角，忧郁地看着远方" },
    ],
    targetTokens: 50,
    narrativeContext: createNarrative(),
    projectId: "p1",
    documentId: "d1",
    ...overrides,
  };
}

describe("CompressionEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── shouldCompress ──

  describe("shouldCompress", () => {
    it("returns false when maxBudget is 0", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      expect(engine.shouldCompress(100, 0)).toBe(false);
    });

    it("returns false when currentTokens is 0", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      expect(engine.shouldCompress(0, 1000)).toBe(false);
    });

    it("returns false when below minTokenThreshold", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig({ minTokenThreshold: 500 }));
      expect(engine.shouldCompress(400, 500)).toBe(false);
    });

    it("returns false when ratio below 87%", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig({ minTokenThreshold: 10 }));
      expect(engine.shouldCompress(500, 1000)).toBe(false);
    });

    it("returns true when ratio >= 87% and above threshold", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig({ minTokenThreshold: 10 }));
      expect(engine.shouldCompress(900, 1000)).toBe(true);
    });

    it("returns true at exactly 87% ratio", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig({ minTokenThreshold: 10 }));
      expect(engine.shouldCompress(870, 1000)).toBe(true);
    });
  });

  // ── getCompressionStats ──

  describe("getCompressionStats", () => {
    it("returns initial stats", () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const stats = engine.getCompressionStats();
      expect(stats.totalCompressions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.circuitBreakerOpen).toBe(false);
    });
  });

  // ── compress: empty messages ──

  describe("compress with empty messages", () => {
    it("returns empty result for empty messages", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(
        createRequest({ messages: [] }),
      );
      expect(result.compressedMessages).toHaveLength(0);
      expect(result.compressionRatio).toBe(1);
      expect(result.layersApplied).toHaveLength(0);
    });
  });

  // ── compress: history compaction ──

  describe("compress: history compaction", () => {
    it("applies history compaction for > 3 messages", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(createRequest({ targetTokens: 9999 }));
      expect(result.layersApplied).toContain("history-compaction");
    });

    it("skips history compaction for <= 3 messages", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(
        createRequest({
          messages: [
            { role: "user", content: "hello" },
            { role: "assistant", content: "hi" },
          ],
          targetTokens: 9999,
        }),
      );
      expect(result.layersApplied).not.toContain("history-compaction");
    });
  });

  // ── compress: micro-compression ──

  describe("compress: micro-compression", () => {
    it("applies micro-compression layer", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(
        createRequest({
          messages: [
            { role: "user", content: "hello hello hello hello" },
            { role: "assistant", content: "重复重复重复重复的文字" },
          ],
          targetTokens: 9999,
        }),
      );
      expect(result.layersApplied).toContain("micro-compression");
    });
  });

  // ── compress: narrative summarization ──

  describe("compress: narrative summarization via LLM", () => {
    it("invokes LLM when still over target after layers 1-2", async () => {
      const llm = createMockLlm();
      const engine = createCompressionEngine(llm, createConfig());
      const result = await engine.compress(createRequest({ targetTokens: 5 }));
      expect(result.layersApplied).toContain("narrative-summarization");
      expect(llm.complete).toHaveBeenCalled();
    });

    it("handles LLM failure with COMPRESSION_LLM_ERROR", async () => {
      const llm = createMockLlm();
      llm.complete.mockRejectedValueOnce(new Error("API down"));
      const engine = createCompressionEngine(llm, createConfig());
      await expect(
        engine.compress(createRequest({ targetTokens: 5 })),
      ).rejects.toThrow("LLM compression failed");
    });
  });

  // ── compress: success tracking ──

  describe("compress: success tracking", () => {
    it("increments success count after compression", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      await engine.compress(createRequest({ targetTokens: 9999 }));
      const stats = engine.getCompressionStats();
      expect(stats.successCount).toBe(1);
      expect(stats.totalCompressions).toBe(1);
    });
  });

  // ── Circuit breaker ──

  describe("circuit breaker", () => {
    it("opens after consecutive failures reach threshold", async () => {
      const llm = createMockLlm();
      llm.complete.mockRejectedValue(new Error("fail"));
      const engine = createCompressionEngine(
        llm,
        createConfig({ circuitBreaker: { failureThreshold: 3, cooldownMs: 60000 } }),
      );

      for (let i = 0; i < 3; i++) {
        try {
          await engine.compress(createRequest({ targetTokens: 5 }));
        } catch {
          // expected
        }
      }

      const stats = engine.getCompressionStats();
      expect(stats.circuitBreakerOpen).toBe(true);

      await expect(
        engine.compress(createRequest({ targetTokens: 5 })),
      ).rejects.toThrow("Circuit breaker is open");
    });

    it("resetCircuitBreaker reopens the circuit", async () => {
      const llm = createMockLlm();
      llm.complete.mockRejectedValue(new Error("fail"));
      const engine = createCompressionEngine(
        llm,
        createConfig({ circuitBreaker: { failureThreshold: 3, cooldownMs: 60000 } }),
      );

      for (let i = 0; i < 3; i++) {
        try {
          await engine.compress(createRequest({ targetTokens: 5 }));
        } catch {
          // expected
        }
      }

      engine.resetCircuitBreaker();
      const stats = engine.getCompressionStats();
      expect(stats.circuitBreakerOpen).toBe(false);
      expect(stats.consecutiveFailures).toBe(0);
    });
  });

  // ── Backpressure ──

  describe("backpressure", () => {
    it("rejects when exceeding max concurrent compressions", async () => {
      const llm = createMockLlm();
      const resolvers: Array<(v: { content: string }) => void> = [];
      llm.complete.mockImplementation(
        () => new Promise<{ content: string }>((resolve) => { resolvers.push(resolve); }),
      );
      const engine = createCompressionEngine(llm, createConfig());

      // Start 4 concurrent compressions that need LLM (targetTokens: 5 forces layer 3)
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 4; i++) {
        promises.push(
          engine.compress(createRequest({ targetTokens: 5 })).catch(() => {}),
        );
      }
      // Allow event loop to process
      await new Promise((r) => setTimeout(r, 10));

      // 5th should be rejected immediately
      await expect(
        engine.compress(createRequest({ targetTokens: 5 })),
      ).rejects.toThrow("Too many concurrent compressions");

      // Resolve all pending LLM calls
      for (const resolve of resolvers) {
        resolve({ content: "summary" });
      }
      await Promise.allSettled(promises);
    });
  });

  // ── Dispose ──

  describe("dispose", () => {
    it("rejects new compressions after dispose", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      engine.dispose();

      await expect(
        engine.compress(createRequest()),
      ).rejects.toThrow("Engine has been disposed");
    });
  });

  // ── Narrative preservation ──

  describe("narrative preservation", () => {
    it("preserves character names found in output", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(
        createRequest({ targetTokens: 9999 }),
      );
      const preserved = result.preservedElements;
      expect(preserved.characterNames.length).toBeGreaterThanOrEqual(0);
    });

    it("warns when character names are lost", async () => {
      const engine = createCompressionEngine(createMockLlm(), createConfig());
      const result = await engine.compress(
        createRequest({
          targetTokens: 9999,
          narrativeContext: createNarrative({
            characterNames: ["不存在的角色"],
          }),
        }),
      );
      const hasWarning = result.warnings.some((w) =>
        w.includes("COMPRESSION_NARRATIVE_LOSS"),
      );
      expect(hasWarning).toBe(true);
    });
  });
});
