/**
 * NarrativeCompactService — INV-5 AutoCompact Narrative Compression
 * Spec: ARCHITECTURE.md INV-5, docs/playbook/02-p3-project-intelligence.md
 *
 * TDD Red Phase: tests compile, fail until implementation exists.
 * Validates:
 *   - Priority sorting (protected > recent > referenced > old)
 *   - Protection rules (compactable: false preserved, never compressed)
 *   - Budget enforcement (compression stops once under budget)
 *   - Cache hit (same content hash returns cached summary)
 *   - CJK token counting (INV-3)
 *   - INV-9 logging (skill_executions via CostTracker)
 *   - INV-6 compliance (compression through builtin:auto-compact Skill)
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { estimateTokens } from "@shared/tokenBudget";

import {
  createNarrativeCompactService,
  isProtectedFragment,
  type NarrativeCompactService,
  type ContextFragment,
  type FragmentPriority,
  type SkillInvoker,
  BUILTIN_AUTO_COMPACT_SKILL_ID,
} from "../narrativeCompact";

// ─── Mock helpers ───────────────────────────────────────────────────

function createMockSkillInvoker(): SkillInvoker & { invoke: Mock } {
  return {
    invoke: vi.fn().mockImplementation(async (args: { input: string }) => {
      // Default: return a short summary (roughly 30% of input)
      const inputLen = args.input.length;
      const summary = args.input.slice(0, Math.max(10, Math.floor(inputLen * 0.3)));
      return {
        output: summary,
        usage: { promptTokens: 100, completionTokens: 30 },
        model: "gpt-4o",
        requestId: `req-${Date.now()}`,
      };
    }),
  };
}

interface MockCostTracker {
  recordUsage: Mock;
}

function createMockCostTracker(): MockCostTracker {
  return {
    recordUsage: vi.fn().mockReturnValue({
      requestId: "mock-req",
      modelId: "gpt-4o",
      inputTokens: 100,
      outputTokens: 30,
      cachedTokens: 0,
      cost: 0.001,
      skillId: BUILTIN_AUTO_COMPACT_SKILL_ID,
      timestamp: Date.now(),
    }),
  };
}

function makeFragment(overrides: Partial<ContextFragment> = {}): ContextFragment {
  return {
    id: overrides.id ?? `frag-${Math.random().toString(36).slice(2, 8)}`,
    content: overrides.content ?? "这是一段测试文本，用于验证叙事压缩功能。",
    priority: overrides.priority ?? "old",
    compactable: overrides.compactable ?? true,
    metadata: overrides.metadata,
  };
}

/** Generate long CJK content to exceed token budgets */
function makeLongCjkContent(charCount: number): string {
  const base = "这是一段很长的中文测试内容用于验证压缩功能的正确性和";
  let result = "";
  while (result.length < charCount) {
    result += base;
  }
  return result.slice(0, charCount);
}



// ─── Test suite ─────────────────────────────────────────────────────

describe("NarrativeCompactService", () => {
  let service: NarrativeCompactService;
  let mockSkill: SkillInvoker & { invoke: Mock };
  let mockCost: MockCostTracker;

  beforeEach(() => {
    mockSkill = createMockSkillInvoker();
    mockCost = createMockCostTracker();
    service = createNarrativeCompactService({
      skillInvoker: mockSkill,
      costTracker: mockCost,
    });
  });

  afterEach(() => {
    service.dispose();
    vi.restoreAllMocks();
  });

  // ─── Priority sorting ──────────────────────────────────────────

  describe("priority sorting", () => {
    it("compresses lowest-priority fragments first (old before referenced)", async () => {
      const oldFrag = makeFragment({
        id: "old-1",
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const referencedFrag = makeFragment({
        id: "ref-1",
        content: makeLongCjkContent(200),
        priority: "referenced",
        compactable: true,
      });
      const recentFrag = makeFragment({
        id: "recent-1",
        content: makeLongCjkContent(200),
        priority: "recent",
        compactable: true,
      });

      // Budget so tight that at least one fragment must be compressed
      const totalTokens = estimateTokens(oldFrag.content)
        + estimateTokens(referencedFrag.content)
        + estimateTokens(recentFrag.content);
      const budget = Math.floor(totalTokens * 0.7);

      const result = await service.compactContext(
        [recentFrag, oldFrag, referencedFrag],
        budget,
      );

      // "old" should be compressed first
      const oldResult = result.fragments.find((f) => f.originalId === "old-1");
      expect(oldResult?.wasCompressed).toBe(true);

      // "recent" should remain uncompressed if budget allows
      const recentResult = result.fragments.find((f) => f.originalId === "recent-1");
      expect(recentResult?.wasCompressed).toBe(false);
    });

    it("respects priority order: protected > recent > referenced > old", async () => {
      const priorities: FragmentPriority[] = ["protected", "recent", "referenced", "old"];
      const fragments = priorities.map((p) =>
        makeFragment({
          id: `frag-${p}`,
          content: makeLongCjkContent(100),
          priority: p,
          compactable: p !== "protected",
        }),
      );

      // Very tight budget — forces maximum compression
      const budget = estimateTokens(fragments[0].content) + 10;
      const result = await service.compactContext(fragments, budget);

      // Protected fragment must never be compressed
      const protectedResult = result.fragments.find((f) => f.originalId === "frag-protected");
      expect(protectedResult?.wasCompressed).toBe(false);
    });

    it("stops compressing once total tokens are within budget", async () => {
      const fragments = Array.from({ length: 5 }, (_, i) =>
        makeFragment({
          id: `frag-${i}`,
          content: makeLongCjkContent(100),
          priority: "old",
          compactable: true,
        }),
      );

      // Set budget to fit 4 fragments uncompressed — only 1 needs compression
      const singleTokens = estimateTokens(fragments[0].content);
      const budget = singleTokens * 4 + Math.floor(singleTokens * 0.3);

      const result = await service.compactContext(fragments, budget);
      expect(result.totalTokens).toBeLessThanOrEqual(budget);
      // At least one compressed, but not all
      expect(result.compressedCount).toBeGreaterThanOrEqual(1);
      expect(result.compressedCount).toBeLessThan(5);
    });
  });

  // ─── Protection rules (INV-5) ─────────────────────────────────

  describe("protection rules (INV-5)", () => {
    it("never compresses fragments with compactable: false", async () => {
      const protectedFrag = makeFragment({
        id: "protected-kg",
        content: makeLongCjkContent(300),
        priority: "old",
        compactable: false,
      });
      const compactableFrag = makeFragment({
        id: "compactable-1",
        content: makeLongCjkContent(300),
        priority: "old",
        compactable: true,
      });

      // Budget so tight both fragments can't fit
      const totalTokens = estimateTokens(protectedFrag.content) + estimateTokens(compactableFrag.content);
      const budget = Math.floor(totalTokens * 0.6);

      const result = await service.compactContext([protectedFrag, compactableFrag], budget);

      const protResult = result.fragments.find((f) => f.originalId === "protected-kg");
      expect(protResult?.wasCompressed).toBe(false);
      expect(protResult?.content).toBe(protectedFrag.content);
    });

    it("preserves KG entity definitions (sourceType: kg-entity)", async () => {
      const kgFrag = makeFragment({
        id: "kg-entity-1",
        content: "林远：男，28岁，前刑警，性格冷硬。擅长推理和格斗。",
        priority: "referenced",
        compactable: false,
        metadata: { sourceType: "kg-entity", entityId: "entity-lingyuan" },
      });
      const regularFrag = makeFragment({
        id: "regular-1",
        content: makeLongCjkContent(300),
        priority: "old",
        compactable: true,
      });

      const budget = estimateTokens(kgFrag.content) + 20;
      const result = await service.compactContext([kgFrag, regularFrag], budget);

      const kgResult = result.fragments.find((f) => f.originalId === "kg-entity-1");
      expect(kgResult?.wasCompressed).toBe(false);
      expect(kgResult?.content).toBe(kgFrag.content);
      expect(result.protectedCount).toBeGreaterThanOrEqual(1);
    });

    it("preserves unresolved foreshadowing entities", async () => {
      const foreshadowFrag = makeFragment({
        id: "foreshadow-1",
        content: "林远口袋中有一封未拆的信件，来自一个自称'观察者'的人。",
        priority: "referenced",
        compactable: false,
        metadata: { sourceType: "foreshadowing" },
      });

      const budget = estimateTokens(foreshadowFrag.content) + 5;
      const result = await service.compactContext([foreshadowFrag], budget);

      expect(result.fragments[0].wasCompressed).toBe(false);
    });

    it("preserves world rules (magic system, laws, physics)", async () => {
      const worldRuleFrag = makeFragment({
        id: "world-rule-1",
        content: "魔法体系：元素分为五行（金木水火土），每个法师只能掌握一种元素。",
        priority: "referenced",
        compactable: false,
        metadata: { sourceType: "world-rule" },
      });

      const budget = estimateTokens(worldRuleFrag.content) + 5;
      const result = await service.compactContext([worldRuleFrag], budget);

      expect(result.fragments[0].wasCompressed).toBe(false);
      expect(result.fragments[0].content).toBe(worldRuleFrag.content);
    });

    it("preserves user-marked important paragraphs", async () => {
      const userMarkedFrag = makeFragment({
        id: "user-marked-1",
        content: "这段话非常重要，是整个故事的转折点。",
        priority: "referenced",
        compactable: false,
        metadata: { sourceType: "user-marked" },
      });

      const budget = estimateTokens(userMarkedFrag.content) + 5;
      const result = await service.compactContext([userMarkedFrag], budget);

      expect(result.fragments[0].wasCompressed).toBe(false);
    });
  });

  // ─── Budget enforcement ───────────────────────────────────────

  describe("budget enforcement", () => {
    it("returns all fragments uncompressed when already within budget", async () => {
      const fragments = [
        makeFragment({ id: "a", content: "短文本", compactable: true }),
        makeFragment({ id: "b", content: "另一段短文本", compactable: true }),
      ];

      const totalTokens = fragments.reduce(
        (sum, f) => sum + estimateTokens(f.content), 0,
      );
      const budget = totalTokens + 100;

      const result = await service.compactContext(fragments, budget);

      expect(result.compressedCount).toBe(0);
      expect(result.totalTokens).toBeLessThanOrEqual(budget);
      expect(mockSkill.invoke).not.toHaveBeenCalled();
    });

    it("returns empty result for empty fragments array", async () => {
      const result = await service.compactContext([], 1000);

      expect(result.fragments).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
      expect(result.compressedCount).toBe(0);
    });

    it("compresses until total fits within budget", async () => {
      const fragments = Array.from({ length: 3 }, (_, i) =>
        makeFragment({
          id: `f-${i}`,
          content: makeLongCjkContent(200),
          priority: "old",
          compactable: true,
        }),
      );

      const singleTokens = estimateTokens(fragments[0].content);
      // Budget fits ~1.5 fragments worth
      const budget = Math.floor(singleTokens * 1.5);

      const result = await service.compactContext(fragments, budget);

      expect(result.totalTokens).toBeLessThanOrEqual(budget);
      expect(result.compressedCount).toBeGreaterThan(0);
    });

    it("handles the case where protected fragments alone exceed budget", async () => {
      const protectedFrag = makeFragment({
        id: "big-protected",
        content: makeLongCjkContent(500),
        priority: "protected",
        compactable: false,
      });

      // Budget smaller than the protected fragment
      const protectedTokens = estimateTokens(protectedFrag.content);
      const budget = Math.floor(protectedTokens * 0.5);

      const result = await service.compactContext([protectedFrag], budget);

      // Protected fragments are always kept, even if over budget
      expect(result.fragments).toHaveLength(1);
      expect(result.fragments[0].wasCompressed).toBe(false);
      expect(result.totalTokens).toBeGreaterThan(budget);
    });
  });

  // ─── Cache behavior ───────────────────────────────────────────

  describe("cache", () => {
    it("returns cached summary for identical content", async () => {
      const content = makeLongCjkContent(200);
      const fragments1 = [
        makeFragment({ id: "f1", content, priority: "old", compactable: true }),
      ];
      const fragments2 = [
        makeFragment({ id: "f2", content, priority: "old", compactable: true }),
      ];

      // Budget forces compression
      const budget = Math.floor(estimateTokens(content) * 0.3);

      await service.compactContext(fragments1, budget);
      const callCountAfterFirst = mockSkill.invoke.mock.calls.length;

      await service.compactContext(fragments2, budget);
      const callCountAfterSecond = mockSkill.invoke.mock.calls.length;

      // Second call should NOT invoke Skill again — cache hit
      expect(callCountAfterSecond).toBe(callCountAfterFirst);

      const stats = service.getCacheStats();
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });

    it("does NOT cache-hit when content differs", async () => {
      const frag1 = makeFragment({
        id: "f1",
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const frag2 = makeFragment({
        id: "f2",
        content: makeLongCjkContent(200) + "不同的结尾",
        priority: "old",
        compactable: true,
      });

      const budget = 20;

      await service.compactContext([frag1], budget);
      await service.compactContext([frag2], budget);

      expect(mockSkill.invoke).toHaveBeenCalledTimes(2);
    });

    it("clearCache resets the cache", async () => {
      const content = makeLongCjkContent(200);
      const budget = 20;

      await service.compactContext(
        [makeFragment({ content, priority: "old", compactable: true })],
        budget,
      );

      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);

      await service.compactContext(
        [makeFragment({ content, priority: "old", compactable: true })],
        budget,
      );

      // Should invoke skill again after cache clear
      expect(mockSkill.invoke).toHaveBeenCalledTimes(2);
    });
  });

  // ─── CJK token counting (INV-3) ──────────────────────────────

  describe("CJK token counting (INV-3)", () => {
    it("estimates CJK tokens at ~1.5 tokens/char", () => {
      const cjkText = "这是中文测试";  // 6 CJK chars
      const tokens = estimateTokens(cjkText);
      // 6 chars × 1.5 = 9 tokens
      expect(tokens).toBe(9);
    });

    it("estimates ASCII tokens at ~0.25 tokens/byte", () => {
      const asciiText = "test"; // 4 bytes
      const tokens = estimateTokens(asciiText);
      // 4 bytes × 0.25 = 1 token
      expect(tokens).toBe(1);
    });

    it("handles mixed CJK + ASCII content correctly", () => {
      const mixed = "Hello世界"; // "Hello" = 5 bytes × 0.25 = 1.25, "世界" = 2 × 1.5 = 3 → ceil(4.25) = 5
      const tokens = estimateTokens(mixed);
      expect(tokens).toBeGreaterThan(0);
      // Must not use UTF8_BYTES / 4 approximation
      const utf8Bytes = new TextEncoder().encode(mixed).length;
      const naiveEstimate = Math.ceil(utf8Bytes / 4);
      // CJK-aware estimate should be higher than naive for CJK-heavy text
      expect(tokens).toBeGreaterThanOrEqual(naiveEstimate);
    });

    it("uses CJK-aware estimation for budget decisions in compactContext", async () => {
      const cjkContent = makeLongCjkContent(100);
      const fragment = makeFragment({
        content: cjkContent,
        priority: "old",
        compactable: true,
      });

      const cjkTokens = estimateTokens(cjkContent);
      // Budget just under the CJK token count — must trigger compression
      const budget = cjkTokens - 10;

      const result = await service.compactContext([fragment], budget);
      expect(result.compressedCount).toBe(1);
    });
  });

  // ─── INV-6 compliance (Skill system) ──────────────────────────

  describe("INV-6 compliance (Skill invocation)", () => {
    it("calls Skill with builtin:auto-compact skill ID", async () => {
      const fragment = makeFragment({
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await service.compactContext([fragment], budget);

      expect(mockSkill.invoke).toHaveBeenCalled();
      const callArgs = mockSkill.invoke.mock.calls[0][0];
      expect(callArgs.skillId).toBe(BUILTIN_AUTO_COMPACT_SKILL_ID);
    });

    it("passes fragment content as Skill input", async () => {
      const content = makeLongCjkContent(200);
      const fragment = makeFragment({
        content,
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await service.compactContext([fragment], budget);

      const callArgs = mockSkill.invoke.mock.calls[0][0];
      expect(callArgs.input).toContain(content);
    });

    it("never makes bare LLM calls outside Skill system", async () => {
      const fragments = Array.from({ length: 3 }, (_, i) =>
        makeFragment({
          id: `f-${i}`,
          content: makeLongCjkContent(200),
          priority: "old",
          compactable: true,
        }),
      );
      const budget = 20;

      await service.compactContext(fragments, budget);

      // Every LLM interaction must go through skillInvoker.invoke
      // The service has no other LLM integration point
      expect(mockSkill.invoke).toHaveBeenCalled();
      for (const call of mockSkill.invoke.mock.calls) {
        expect(call[0].skillId).toBe(BUILTIN_AUTO_COMPACT_SKILL_ID);
      }
    });
  });

  // ─── INV-9 logging (cost tracking) ────────────────────────────

  describe("INV-9 logging (cost tracking)", () => {
    it("records usage via costTracker for each compression", async () => {
      const fragment = makeFragment({
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await service.compactContext([fragment], budget);

      expect(mockCost.recordUsage).toHaveBeenCalled();
      const callArgs = mockCost.recordUsage.mock.calls[0];
      // recordUsage(usage, modelId, requestId, skillId)
      expect(callArgs[3]).toBe(BUILTIN_AUTO_COMPACT_SKILL_ID);
    });

    it("passes correct token counts to costTracker", async () => {
      mockSkill.invoke.mockResolvedValueOnce({
        output: "短摘要",
        usage: { promptTokens: 150, completionTokens: 40 },
        model: "gpt-4o",
        requestId: "req-001",
      });

      const fragment = makeFragment({
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await service.compactContext([fragment], budget);

      expect(mockCost.recordUsage).toHaveBeenCalledWith(
        { promptTokens: 150, completionTokens: 40 },
        "gpt-4o",
        "req-001",
        BUILTIN_AUTO_COMPACT_SKILL_ID,
      );
    });

    it("does NOT record usage for cache hits", async () => {
      const content = makeLongCjkContent(200);
      const budget = 20;

      await service.compactContext(
        [makeFragment({ content, priority: "old", compactable: true })],
        budget,
      );
      mockCost.recordUsage.mockClear();

      await service.compactContext(
        [makeFragment({ content, priority: "old", compactable: true })],
        budget,
      );

      // No new cost recording on cache hit
      expect(mockCost.recordUsage).not.toHaveBeenCalled();
    });
  });

  // ─── Compression results ──────────────────────────────────────

  describe("compression results", () => {
    it("retains reference pointer for compressed fragments", async () => {
      const fragment = makeFragment({
        id: "expandable-1",
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      const result = await service.compactContext([fragment], budget);

      const compressed = result.fragments.find((f) => f.originalId === "expandable-1");
      expect(compressed?.wasCompressed).toBe(true);
      expect(compressed?.referencePointer).toBeDefined();
      expect(compressed?.referencePointer).toContain("expandable-1");
    });

    it("reports correct compression ratio", async () => {
      const fragments = Array.from({ length: 3 }, (_, i) =>
        makeFragment({
          id: `f-${i}`,
          content: makeLongCjkContent(200),
          priority: "old",
          compactable: true,
        }),
      );
      const budget = 50;

      const result = await service.compactContext(fragments, budget);

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
      expect(result.originalTotalTokens).toBeGreaterThan(result.totalTokens);
    });

    it("does not write back to original document", async () => {
      const originalContent = makeLongCjkContent(200);
      const fragment = makeFragment({
        id: "no-writeback",
        content: originalContent,
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await service.compactContext([fragment], budget);

      // Original fragment's content must remain unchanged
      expect(fragment.content).toBe(originalContent);
    });
  });

  // ─── Error handling ───────────────────────────────────────────

  describe("error handling", () => {
    it("propagates Skill invocation errors", async () => {
      mockSkill.invoke.mockRejectedValueOnce(new Error("Skill execution failed"));

      const fragment = makeFragment({
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await expect(
        service.compactContext([fragment], budget),
      ).rejects.toThrow("Skill execution failed");
    });

    it("throws after dispose", async () => {
      service.dispose();

      await expect(
        service.compactContext([makeFragment()], 1000),
      ).rejects.toThrow();
    });
  });

  // ─── Config options ───────────────────────────────────────────

  describe("config options", () => {
    it("respects custom cacheMaxSize", async () => {
      const smallCacheService = createNarrativeCompactService({
        skillInvoker: mockSkill,
        costTracker: mockCost,
        cacheMaxSize: 2,
      });

      const budget = 20;
      // Fill cache with 3 different contents
      for (let i = 0; i < 3; i++) {
        await smallCacheService.compactContext(
          [makeFragment({
            content: makeLongCjkContent(200) + `unique-${i}`,
            priority: "old",
            compactable: true,
          })],
          budget,
        );
      }

      const stats = smallCacheService.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);

      smallCacheService.dispose();
    });

    it("uses custom defaultModel in Skill invocation", async () => {
      const customModelService = createNarrativeCompactService({
        skillInvoker: mockSkill,
        costTracker: mockCost,
        defaultModel: "claude-sonnet-4",
      });

      const fragment = makeFragment({
        content: makeLongCjkContent(200),
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      await customModelService.compactContext([fragment], budget);

      const callArgs = mockSkill.invoke.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4");

      customModelService.dispose();
    });
  });

  // ─── R1 Finding 1: Fail-closed protection ────────────────────
  //     isProtectedFragment must guard against misconfigured
  //     compactable: true on protected sourceTypes.

  describe("fail-closed protection (R1 Finding 1)", () => {
    it("isProtectedFragment returns true for compactable:false", () => {
      const frag = makeFragment({ compactable: false, priority: "old" });
      expect(isProtectedFragment(frag)).toBe(true);
    });

    it("isProtectedFragment returns true for priority:protected even if compactable:true", () => {
      const frag = makeFragment({ compactable: true, priority: "protected" });
      expect(isProtectedFragment(frag)).toBe(true);
    });

    it("isProtectedFragment returns true for kg-entity sourceType even if compactable:true", () => {
      const frag = makeFragment({
        compactable: true,
        priority: "old",
        metadata: { sourceType: "kg-entity" },
      });
      expect(isProtectedFragment(frag)).toBe(true);
    });

    it("isProtectedFragment returns true for all protected sourceTypes", () => {
      const protectedTypes = [
        "kg-entity",
        "character-setting",
        "foreshadowing",
        "world-rule",
        "user-marked",
      ] as const;

      for (const sourceType of protectedTypes) {
        const frag = makeFragment({
          compactable: true,
          priority: "old",
          metadata: { sourceType },
        });
        expect(isProtectedFragment(frag)).toBe(true);
      }
    });

    it("isProtectedFragment returns false for conversation sourceType with compactable:true", () => {
      const frag = makeFragment({
        compactable: true,
        priority: "old",
        metadata: { sourceType: "conversation" },
      });
      expect(isProtectedFragment(frag)).toBe(false);
    });

    it("isProtectedFragment returns false for document-excerpt sourceType with compactable:true", () => {
      const frag = makeFragment({
        compactable: true,
        priority: "old",
        metadata: { sourceType: "document-excerpt" },
      });
      expect(isProtectedFragment(frag)).toBe(false);
    });

    it("never compresses kg-entity even when compactable:true (misconfigured)", async () => {
      const kgFrag = makeFragment({
        id: "kg-misconfigured",
        content: makeLongCjkContent(300),
        priority: "old",
        compactable: true, // BUG in caller — but we must still protect
        metadata: { sourceType: "kg-entity", entityId: "entity-123" },
      });
      const regularFrag = makeFragment({
        id: "regular-ok",
        content: makeLongCjkContent(300),
        priority: "old",
        compactable: true,
        metadata: { sourceType: "conversation" },
      });

      // Budget so tight that at least one must be compressed
      const totalTokens = estimateTokens(kgFrag.content) + estimateTokens(regularFrag.content);
      const budget = Math.floor(totalTokens * 0.6);

      const result = await service.compactContext([kgFrag, regularFrag], budget);

      // kg-entity must NOT be compressed even with compactable:true
      const kgResult = result.fragments.find((f) => f.originalId === "kg-misconfigured");
      expect(kgResult?.wasCompressed).toBe(false);
      expect(kgResult?.content).toBe(kgFrag.content);

      // regular fragment should be compressed instead
      const regularResult = result.fragments.find((f) => f.originalId === "regular-ok");
      expect(regularResult?.wasCompressed).toBe(true);

      // protectedCount must reflect the fail-closed check
      expect(result.protectedCount).toBeGreaterThanOrEqual(1);
    });

    it("counts protectedCount using fail-closed logic (not just compactable flag)", async () => {
      const fragments = [
        makeFragment({
          id: "foreshadow-misconfig",
          content: makeLongCjkContent(100),
          priority: "old",
          compactable: true,
          metadata: { sourceType: "foreshadowing" },
        }),
        makeFragment({
          id: "world-rule-misconfig",
          content: makeLongCjkContent(100),
          priority: "old",
          compactable: true,
          metadata: { sourceType: "world-rule" },
        }),
        makeFragment({
          id: "regular",
          content: makeLongCjkContent(100),
          priority: "old",
          compactable: true,
          metadata: { sourceType: "conversation" },
        }),
      ];

      // Budget so tight compression is attempted
      const totalTokens = fragments.reduce(
        (sum, f) => sum + estimateTokens(f.content), 0,
      );
      const budget = Math.floor(totalTokens * 0.5);

      const result = await service.compactContext(fragments, budget);

      // 2 fragments have protected sourceTypes even though compactable is true
      expect(result.protectedCount).toBe(2);
    });
  });

  // ─── R1 Finding 2: Inflight dedup ────────────────────────────
  //     Concurrent compactContext calls for the same content must
  //     share a single Skill invocation.

  describe("inflight dedup (R1 Finding 2)", () => {
    it("concurrent calls for same content trigger only one Skill invocation", async () => {
      const content = makeLongCjkContent(200);
      const budget = 20;

      // Launch two compactContext calls concurrently with the same content
      const [result1, result2] = await Promise.all([
        service.compactContext(
          [makeFragment({ id: "dup-a", content, priority: "old", compactable: true })],
          budget,
        ),
        service.compactContext(
          [makeFragment({ id: "dup-b", content, priority: "old", compactable: true })],
          budget,
        ),
      ]);

      // Only 1 Skill invocation for both calls
      expect(mockSkill.invoke).toHaveBeenCalledTimes(1);

      // Both got a compressed result
      expect(result1.compressedCount).toBe(1);
      expect(result2.compressedCount).toBe(1);
    });

    it("inflight map is cleaned up after completion (allows new calls)", async () => {
      const content = makeLongCjkContent(200);
      const budget = 20;

      // First call
      await service.compactContext(
        [makeFragment({ id: "seq-1", content, priority: "old", compactable: true })],
        budget,
      );

      // Clear cache so second call can't use it
      service.clearCache();
      mockSkill.invoke.mockClear();

      // Second call — inflight should be cleaned up, so this is a new call
      await service.compactContext(
        [makeFragment({ id: "seq-2", content, priority: "old", compactable: true })],
        budget,
      );

      // Since cache was cleared, a new Skill call must happen
      expect(mockSkill.invoke).toHaveBeenCalledTimes(1);
    });

    it("inflight map is cleaned up even after Skill error", async () => {
      const content = makeLongCjkContent(200);
      const budget = 20;

      // First call fails
      mockSkill.invoke.mockRejectedValueOnce(new Error("LLM timeout"));

      await expect(
        service.compactContext(
          [makeFragment({ id: "err-1", content, priority: "old", compactable: true })],
          budget,
        ),
      ).rejects.toThrow("LLM timeout");

      // Second call should work normally (inflight cleaned up via finally)
      mockSkill.invoke.mockImplementationOnce(async (args: { input: string }) => ({
        output: args.input.slice(0, 10),
        usage: { promptTokens: 100, completionTokens: 10 },
        model: "gpt-4o",
        requestId: "req-retry",
      }));

      const result = await service.compactContext(
        [makeFragment({ id: "err-2", content, priority: "old", compactable: true })],
        budget,
      );

      expect(result.compressedCount).toBe(1);
    });
  });

  // ─── R1 Finding 3: Token-accurate summary truncation ─────────
  //     Summary truncation must use trimUtf8ToTokenBudget (token-level)
  //     rather than character-ratio slice.

  describe("token-accurate summary truncation (R1 Finding 3)", () => {
    it("truncates verbose LLM summary to token budget using trimUtf8ToTokenBudget", async () => {
      // LLM returns a summary that is way too long (100% of input)
      const originalContent = makeLongCjkContent(200);
      const verboseSummary = makeLongCjkContent(200); // same length as input

      mockSkill.invoke.mockResolvedValueOnce({
        output: verboseSummary,
        usage: { promptTokens: 300, completionTokens: 300 },
        model: "gpt-4o",
        requestId: "req-verbose",
      });

      const fragment = makeFragment({
        id: "verbose-test",
        content: originalContent,
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      const result = await service.compactContext([fragment], budget);

      const compressed = result.fragments.find((f) => f.originalId === "verbose-test");
      expect(compressed?.wasCompressed).toBe(true);

      // Summary tokens must be at or below maxSummaryRatio (0.3) of original
      const originalTokens = estimateTokens(originalContent);
      const maxAllowed = Math.ceil(originalTokens * 0.3);
      expect(compressed!.tokenCount).toBeLessThanOrEqual(maxAllowed);
    });

    it("mixed CJK/ASCII summary is trimmed to correct token count", async () => {
      // Create content with mixed CJK/ASCII
      const originalContent = "Hello世界 " + makeLongCjkContent(200);
      // Return a summary with mixed CJK/ASCII that exceeds the 30% ratio
      const mixedSummary = "Summary摘要 " + "测试".repeat(100) + " test data " + "验证".repeat(50);

      mockSkill.invoke.mockResolvedValueOnce({
        output: mixedSummary,
        usage: { promptTokens: 300, completionTokens: 200 },
        model: "gpt-4o",
        requestId: "req-mixed",
      });

      const fragment = makeFragment({
        id: "mixed-test",
        content: originalContent,
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      const result = await service.compactContext([fragment], budget);

      const compressed = result.fragments.find((f) => f.originalId === "mixed-test");
      expect(compressed?.wasCompressed).toBe(true);

      // The token count after truncation must respect the 30% cap
      const originalTokens = estimateTokens(originalContent);
      const maxAllowed = Math.ceil(originalTokens * 0.3);
      expect(compressed!.tokenCount).toBeLessThanOrEqual(maxAllowed);
    });

    it("does not truncate summary that is already within ratio", async () => {
      const originalContent = makeLongCjkContent(300);
      const shortSummary = "简短摘要";  // very short — well within 30%

      mockSkill.invoke.mockResolvedValueOnce({
        output: shortSummary,
        usage: { promptTokens: 400, completionTokens: 10 },
        model: "gpt-4o",
        requestId: "req-short",
      });

      const fragment = makeFragment({
        id: "short-summary-test",
        content: originalContent,
        priority: "old",
        compactable: true,
      });
      const budget = 20;

      const result = await service.compactContext([fragment], budget);

      const compressed = result.fragments.find((f) => f.originalId === "short-summary-test");
      expect(compressed?.wasCompressed).toBe(true);
      // Should not be truncated — the summary is already short
      expect(compressed!.content).toBe(shortSummary);
    });
  });
});
