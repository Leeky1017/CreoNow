/**
 * CompressionEngine P2 测试 — Narrative-Aware Context Compression
 * Spec: openspec/specs/context-engine/spec.md — P2: Narrative-Aware Context Compression
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证三层压缩策略、叙事保留、熔断器、背压控制、超时处理、
 * stablePrefixHash 不含 compressed-history。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type {
  CompressionEngine,
  CompressionRequest,
  CompressionResult,
  CompressionStats,
  CompressionConfig,
  NarrativeElements,
  CompressionLayer,
} from "../compressionEngine";
import { createCompressionEngine } from "../compressionEngine";

// ─── mock types ─────────────────────────────────────────────────────

interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface MockLLMService {
  streamChat: vi.Mock;
  complete: vi.Mock;
}

// ─── helpers ────────────────────────────────────────────────────────

function createMockLLMService(): MockLLMService {
  return {
    streamChat: vi.fn(),
    complete: vi.fn().mockResolvedValue({
      content: "压缩后的叙事摘要：林远和苏婉发现了密室中的日记。",
    }),
  };
}

function makeNarrativeContext(
  overrides: Partial<NarrativeElements> = {},
): NarrativeElements {
  return {
    characterNames: ["林远", "苏婉"],
    plotPoints: ["发现密室中的日记"],
    toneMarkers: ["冷硬"],
    narrativePOV: "第三人称",
    foreshadowingClues: ["林远口袋中有未拆信件"],
    timelineMarkers: ["入夜"],
    ...overrides,
  };
}

function makeCompressionRequest(
  overrides: Partial<CompressionRequest> = {},
): CompressionRequest {
  const messages: LLMMessage[] = [
    { role: "system", content: "你是一个写作助手。" },
    { role: "user", content: "请帮我续写林远和苏婉的故事。他们在密室中发现了一本旧日记。" },
    { role: "assistant", content: "林远小心翼翼地翻开日记的扉页，苏婉凑过来看..." },
    { role: "user", content: "继续写，加入更多悬疑元素。" },
    { role: "assistant", content: "日记的最后一页写着一个地址，墨迹还很新鲜..." },
    { role: "user", content: "林远对苏婉说了什么？" },
    { role: "assistant", content: "林远沉默了片刻，将日记合上，转头看着苏婉说：'我们需要去这个地方看看。'" },
    { role: "user", content: "描写他们出发的场景。" },
    { role: "assistant", content: "入夜时分，两人悄悄离开了老宅，林远口袋里装着那封还未拆开的信。" },
  ];

  return {
    messages: messages as CompressionRequest["messages"],
    targetTokens: 3000,
    narrativeContext: makeNarrativeContext(),
    projectId: "proj-001",
    documentId: "doc-001",
    ...overrides,
  };
}

function makeConfig(
  overrides: Partial<CompressionConfig> = {},
): CompressionConfig {
  return {
    circuitBreaker: {
      failureThreshold: 3,
      cooldownMs: 300_000,
    },
    timeoutMs: 10_000,
    minTokenThreshold: 500,
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("CompressionEngine — 叙事感知上下文压缩", () => {
  let engine: CompressionEngine;
  let llmService: MockLLMService;

  beforeEach(() => {
    vi.useFakeTimers();
    llmService = createMockLLMService();
    engine = createCompressionEngine(llmService, makeConfig());
  });

  afterEach(() => {
    engine.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── shouldCompress ──────────────────────────────────────────────

  describe("shouldCompress — 压缩触发判断", () => {
    it("87% 容量以上 + ≥500 tokens → true", () => {
      // 7100 / 8000 = 88.75% > 87%, 7100 >= 500
      expect(engine.shouldCompress(7100, 8000)).toBe(true);
    });

    it("87% 容量以下 → false", () => {
      // 6900 / 8000 = 86.25% < 87%
      expect(engine.shouldCompress(6900, 8000)).toBe(false);
    });

    it("恰好 87% → true（边界值，>= 0.87）", () => {
      // 8700 / 10000 = 87%
      expect(engine.shouldCompress(8700, 10000)).toBe(true);
    });

    it("容量超过 87% 但 tokens < 500（最小绝对阈值）→ false", () => {
      // 450 / 500 = 90% > 87%, but 450 < 500
      expect(engine.shouldCompress(450, 500)).toBe(false);
    });

    it("tokens 恰好 500 + 比例超过 87% → true", () => {
      // 500 / 570 ≈ 87.7% > 87%, 500 >= 500
      expect(engine.shouldCompress(500, 570)).toBe(true);
    });

    it("maxBudget 为 0 → false（避免除零）", () => {
      expect(engine.shouldCompress(100, 0)).toBe(false);
    });

    it("currentTokens 为 0 → false", () => {
      expect(engine.shouldCompress(0, 10000)).toBe(false);
    });
  });

  // ── compress — 三层策略 ─────────────────────────────────────────

  describe("compress — 三层压缩策略", () => {
    it("压缩后 compressedTokens ≤ targetTokens", async () => {
      const request = makeCompressionRequest({ targetTokens: 3000 });

      const result = await engine.compress(request);

      expect(result.compressedTokens).toBeLessThanOrEqual(3000);
    });

    it("压缩结果包含 layersApplied", async () => {
      const request = makeCompressionRequest();

      const result = await engine.compress(request);

      expect(result.layersApplied.length).toBeGreaterThan(0);
      const validLayers: CompressionLayer[] = [
        "history-compaction",
        "micro-compression",
        "narrative-summarization",
      ];
      for (const layer of result.layersApplied) {
        expect(validLayers).toContain(layer);
      }
    });

    it("压缩结果包含 compressionRatio", async () => {
      const request = makeCompressionRequest();

      const result = await engine.compress(request);

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });

    it("三层逐级升级：history-compaction → micro-compression → narrative-summarization", async () => {
      // Request with very aggressive target to trigger all 3 layers
      const request = makeCompressionRequest({ targetTokens: 100 });

      const result = await engine.compress(request);

      // Should have applied at least history-compaction
      expect(result.layersApplied).toContain("history-compaction");
      // With very low target, all 3 layers should be triggered
      expect(result.layersApplied).toHaveLength(3);
      expect(result.layersApplied).toEqual([
        "history-compaction",
        "micro-compression",
        "narrative-summarization",
      ]);
    });

    it("compressedMessages 是有效的 LLMMessage[]", async () => {
      const request = makeCompressionRequest();

      const result = await engine.compress(request);

      expect(result.compressedMessages.length).toBeGreaterThan(0);
      for (const msg of result.compressedMessages) {
        expect(["system", "user", "assistant", "tool"]).toContain(
          (msg as unknown as LLMMessage).role,
        );
        expect(typeof (msg as unknown as LLMMessage).content).toBe("string");
      }
    });

    it("originalTokens 记录压缩前的 token 数", async () => {
      const request = makeCompressionRequest({ targetTokens: 100 });

      const result = await engine.compress(request);

      expect(result.originalTokens).toBeGreaterThan(0);
      expect(result.originalTokens).toBeGreaterThan(result.compressedTokens);
    });
  });

  // ── 叙事保留 ──────────────────────────────────────────────────

  describe("Narrative Preservation — 叙事元素保留", () => {
    it("压缩后保留角色名", async () => {
      const request = makeCompressionRequest();

      const result = await engine.compress(request);

      expect(result.preservedElements.characterNames).toContain("林远");
      expect(result.preservedElements.characterNames).toContain("苏婉");
    });

    it("压缩后保留情节要点", async () => {
      const request = makeCompressionRequest({ targetTokens: 100 });

      const result = await engine.compress(request);

      expect(result.preservedElements.plotPoints.length).toBeGreaterThan(0);
    });

    it("压缩后保留伏笔线索", async () => {
      const request = makeCompressionRequest({ targetTokens: 100 });

      const result = await engine.compress(request);

      expect(result.preservedElements.foreshadowingClues.length).toBeGreaterThan(0);
    });

    it("压缩后保留语气标记", async () => {
      const request = makeCompressionRequest({ targetTokens: 100 });

      const result = await engine.compress(request);

      expect(result.preservedElements.toneMarkers.length).toBeGreaterThan(0);
    });

    it("角色名缺失时，warnings 包含 COMPRESSION_NARRATIVE_LOSS", async () => {
      // Mock LLM to return summary WITHOUT any character names
      llmService.complete.mockResolvedValue({
        content: "对话的摘要内容不含任何角色名。两人前往了某个地址。",
      });

      const request = makeCompressionRequest({ targetTokens: 50 });

      const result = await engine.compress(request);

      // With the LLM returning content without character names, narrative loss must be detected
      expect(result.preservedElements.characterNames).not.toContain("林远");
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("COMPRESSION_NARRATIVE_LOSS"),
        ]),
      );
    });
  });

  // ── 熔断器 ────────────────────────────────────────────────────

  describe("Circuit Breaker — 压缩熔断器", () => {
    it("连续 3 次失败后，第 4 次调用抛出 COMPRESSION_CIRCUIT_OPEN", async () => {
      // Make LLM fail
      llmService.complete.mockRejectedValue(new Error("LLM timeout"));

      const request = makeCompressionRequest({ targetTokens: 100 });

      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        try {
          await engine.compress(request);
        } catch {
          // Expected failures
        }
      }

      // 4th call should throw circuit open
      await expect(engine.compress(request)).rejects.toThrow(
        expect.objectContaining({ code: "COMPRESSION_CIRCUIT_OPEN" }),
      );
    });

    it("熔断器打开后不发起 LLM 调用", async () => {
      llmService.complete.mockRejectedValue(new Error("fail"));

      const request = makeCompressionRequest({ targetTokens: 100 });

      for (let i = 0; i < 3; i++) {
        try { await engine.compress(request); } catch { /* expected */ }
      }

      const callCountBefore = llmService.complete.mock.calls.length;

      try { await engine.compress(request); } catch { /* circuit open */ }

      // No new LLM calls should have been made
      expect(llmService.complete.mock.calls.length).toBe(callCountBefore);
    });

    it("冷却期后半开探测成功 → 熔断器关闭", async () => {
      llmService.complete.mockRejectedValue(new Error("fail"));

      const request = makeCompressionRequest({ targetTokens: 100 });

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        try { await engine.compress(request); } catch { /* expected */ }
      }

      // Verify circuit is open
      const stats = engine.getCompressionStats();
      expect(stats.circuitBreakerOpen).toBe(true);

      // Advance past cooldown (5 minutes)
      await vi.advanceTimersByTimeAsync(300_000);

      // Make LLM succeed now
      llmService.complete.mockResolvedValue({
        content: "成功压缩的摘要内容，包含林远和苏婉。",
      });

      // Half-open probe should succeed
      const result = await engine.compress(request);
      expect(result.compressedTokens).toBeGreaterThan(0);

      // Circuit should be closed now
      const statsAfter = engine.getCompressionStats();
      expect(statsAfter.circuitBreakerOpen).toBe(false);
      expect(statsAfter.consecutiveFailures).toBe(0);
    });

    it("冷却期后半开探测失败 → 熔断器重新打开", async () => {
      llmService.complete.mockRejectedValue(new Error("fail"));

      const request = makeCompressionRequest({ targetTokens: 100 });

      for (let i = 0; i < 3; i++) {
        try { await engine.compress(request); } catch { /* expected */ }
      }

      await vi.advanceTimersByTimeAsync(300_000);

      // Probe also fails
      try { await engine.compress(request); } catch { /* expected */ }

      const stats = engine.getCompressionStats();
      expect(stats.circuitBreakerOpen).toBe(true);
    });

    it("resetCircuitBreaker 手动关闭熔断器", async () => {
      llmService.complete.mockRejectedValue(new Error("fail"));

      const request = makeCompressionRequest({ targetTokens: 100 });

      for (let i = 0; i < 3; i++) {
        try { await engine.compress(request); } catch { /* expected */ }
      }

      expect(engine.getCompressionStats().circuitBreakerOpen).toBe(true);

      engine.resetCircuitBreaker();

      expect(engine.getCompressionStats().circuitBreakerOpen).toBe(false);
      expect(engine.getCompressionStats().consecutiveFailures).toBe(0);
    });
  });

  // ── CONTEXT_BACKPRESSURE ──────────────────────────────────────

  describe("Backpressure — 并发压缩限制", () => {
    it("并发压缩超过 4 个时，第 5 个抛出 CONTEXT_BACKPRESSURE", async () => {
      // Make compress hang (slow LLM)
      llmService.complete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ content: "ok" }), 60_000)),
      );

      const request = makeCompressionRequest({ targetTokens: 100 });

      // Start 4 concurrent compressions
      const promises = Array.from({ length: 4 }, () => engine.compress(request));

      // 5th should be rejected
      await expect(engine.compress(request)).rejects.toThrow(
        expect.objectContaining({ code: "CONTEXT_BACKPRESSURE" }),
      );

      // Cleanup
      await vi.advanceTimersByTimeAsync(60_000);
      await Promise.allSettled(promises);
    });
  });

  // ── 超时处理 ──────────────────────────────────────────────────

  describe("Timeout — 压缩超时", () => {
    it("压缩超过 timeoutMs → 抛出 COMPRESSION_FAILED", async () => {
      llmService.complete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ content: "ok" }), 20_000)),
      );

      const shortTimeoutEngine = createCompressionEngine(
        llmService,
        makeConfig({ timeoutMs: 5_000 }),
      );

      const request = makeCompressionRequest({ targetTokens: 100 });
      const compressPromise = shortTimeoutEngine.compress(request);

      await vi.advanceTimersByTimeAsync(6_000);

      await expect(compressPromise).rejects.toThrow(
        expect.objectContaining({ code: "COMPRESSION_FAILED" }),
      );

      shortTimeoutEngine.dispose();
    });
  });

  // ── 空/短输入 ─────────────────────────────────────────────────

  describe("Empty/Short Input — 空输入和短输入", () => {
    it("空消息列表 → 返回空结果", async () => {
      const request = makeCompressionRequest({
        messages: [] as CompressionRequest["messages"],
      });

      const result = await engine.compress(request);

      expect(result.compressedMessages).toHaveLength(0);
      expect(result.compressedTokens).toBe(0);
    });

    it("单条消息 → 不做 history-compaction（保留完整）", async () => {
      const request = makeCompressionRequest({
        messages: [
          { role: "user", content: "hello" },
        ] as CompressionRequest["messages"],
      });

      const result = await engine.compress(request);

      // Single message shouldn't be history-compacted
      expect(result.compressedMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── getCompressionStats ───────────────────────────────────────

  describe("getCompressionStats — 统计信息", () => {
    it("初始状态统计全零", () => {
      const stats = engine.getCompressionStats();

      expect(stats.totalCompressions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.circuitBreakerOpen).toBe(false);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it("成功压缩后更新统计", async () => {
      const request = makeCompressionRequest({ targetTokens: 100 });
      await engine.compress(request);

      const stats = engine.getCompressionStats();

      expect(stats.totalCompressions).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.totalTokensSaved).toBeGreaterThan(0);
    });

    it("失败后更新失败计数", async () => {
      llmService.complete.mockRejectedValue(new Error("fail"));

      try {
        await engine.compress(makeCompressionRequest({ targetTokens: 100 }));
      } catch {
        // expected
      }

      const stats = engine.getCompressionStats();

      expect(stats.failureCount).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
    });
  });

  // ── stablePrefixHash ──────────────────────────────────────────

  describe("stablePrefixHash — Rules-only（不含 compressed-history）", () => {
    it("压缩结果不影响 stablePrefixHash 的计算", async () => {
      // stablePrefixHash is computed from Rules layer only
      // This test verifies the contract: compressed-history doesn't alter it
      // The actual hash is computed in assembleContextLayers, not in CompressionEngine
      // But we verify that CompressionResult does not include a stablePrefixHash field
      const request = makeCompressionRequest();
      const result = await engine.compress(request);

      // CompressionResult should not contain stablePrefixHash
      expect("stablePrefixHash" in result).toBe(false);
    });
  });

  // ── P2ContextAssembleResult 集成 ──────────────────────────────

  describe("P2 Context Assembly Integration — 压缩历史层", () => {
    it("压缩结果可用作 compressedHistory 层", async () => {
      const request = makeCompressionRequest();
      const result = await engine.compress(request);

      // Result should have the shape needed for compressed-history layer
      expect(Array.isArray(result.compressedMessages)).toBe(true);
      expect(result.compressedMessages.length).toBeGreaterThan(0);
      expect(result.compressedTokens).toEqual(expect.any(Number));
      expect(result.compressedTokens).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  // ── dispose ───────────────────────────────────────────────────

  describe("dispose — 资源释放", () => {
    it("dispose 后 getCompressionStats 仍可调用（安全清理）", () => {
      engine.dispose();

      const stats = engine.getCompressionStats();
      expect(stats.totalCompressions).toBe(0);
    });

    it("连续两次 dispose() 不抛出异常", () => {
      engine.dispose();
      expect(() => engine.dispose()).not.toThrow();
    });
  });

  // ── COMPRESSION_TARGET_UNREACHABLE ────────────────────────────

  describe("Target Unreachable — 压缩目标不可达", () => {
    it("已经很短的内容 + 极低 targetTokens → COMPRESSION_TARGET_UNREACHABLE", async () => {
      const request = makeCompressionRequest({
        messages: [
          { role: "user", content: "嗨" },
        ] as CompressionRequest["messages"],
        targetTokens: 1,
      });

      await expect(engine.compress(request)).rejects.toThrow(
        expect.objectContaining({ code: "COMPRESSION_TARGET_UNREACHABLE" }),
      );
    });
  });

  // ── Micro-Compression 专项 ────────────────────────────────────

  describe("Micro-Compression — 微压缩专项", () => {
    it("冗余表达被微压缩移除，专有名词保留，不调用 LLM", async () => {
      const redundantMessages = [
        { role: "system", content: "你是写作助手。" },
        { role: "user", content: "林远说了说了说了很多话很多话。苏婉看着看着看着他。" },
        { role: "assistant", content: "林远重复地重复地重复地叙述着。苏婉静静地静静地听着。" },
      ];

      // targetTokens set to 80% of rough original so micro-compression alone suffices
      const request = makeCompressionRequest({
        messages: redundantMessages as CompressionRequest["messages"],
        targetTokens: 800,
      });

      llmService.complete.mockClear();

      const result = await engine.compress(request);

      // Micro-compression should remove redundancy
      expect(result.layersApplied).toContain("micro-compression");
      // Proper nouns preserved
      const allContent = result.compressedMessages
        .map((m) => (m as unknown as LLMMessage).content)
        .join("");
      expect(allContent).toContain("林远");
      expect(allContent).toContain("苏婉");
      // Micro-compression alone should suffice — narrative-summarization must NOT fire
      expect(result.layersApplied).not.toContain("narrative-summarization");
      expect(llmService.complete).not.toHaveBeenCalled();
    });
  });

  // ── Summary Length ≤ 30% ──────────────────────────────────────

  describe("Summary Length — 摘要长度约束", () => {
    it("narrative-summarization 层压缩后 ≤ 原始 30%", async () => {
      // targetTokens extremely low to guarantee narrative-summarization fires
      const request = makeCompressionRequest({ targetTokens: 5 });

      const result = await engine.compress(request);

      // Precondition: narrative-summarization must have been triggered
      expect(result.layersApplied).toContain("narrative-summarization");
      // Spec constraint: compressed output ≤ 30% of original
      expect(result.compressedTokens).toBeLessThanOrEqual(
        result.originalTokens * 0.3,
      );
    });
  });

  // ── Dispose During Active Compression ─────────────────────────

  describe("Dispose During Compression — 活跃压缩中 dispose", () => {
    it("压缩中调用 dispose → 优雅取消", async () => {
      llmService.complete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ content: "ok" }), 60_000)),
      );

      const request = makeCompressionRequest({ targetTokens: 100 });
      const compressPromise = engine.compress(request);

      // Dispose mid-flight
      engine.dispose();

      // Should reject or cancel gracefully
      await expect(compressPromise).rejects.toThrow();
    });

    it("dispose 后调用 compress → 拒绝", async () => {
      engine.dispose();

      const request = makeCompressionRequest();
      await expect(engine.compress(request)).rejects.toThrow();
    });
  });

  // ── COMPRESSION_LLM_ERROR ─────────────────────────────────────

  describe("LLM Error — LLM 调用失败", () => {
    it("LLM 返回错误（非超时）→ COMPRESSION_LLM_ERROR", async () => {
      llmService.complete.mockRejectedValue(new Error("LLM internal error"));

      const request = makeCompressionRequest({ targetTokens: 50 });

      await expect(engine.compress(request)).rejects.toThrow(
        expect.objectContaining({ code: "COMPRESSION_LLM_ERROR" }),
      );
    });
  });
});
