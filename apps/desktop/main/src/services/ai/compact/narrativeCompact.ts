/**
 * @module narrativeCompact
 * ## Responsibilities: INV-5 AutoCompact narrative compression. When context
 *    exceeds token budget, compress low-priority fragments into summaries
 *    while preserving KG entities, character settings, unresolved foreshadowing,
 *    world rules, and user-marked "important" content.
 * ## Does not do: write compressed results back to original documents —
 *    compression only affects context injection. Does not handle L0/L1/L2
 *    memory layer decisions. Does not perform bare LLM calls.
 * ## Dependency direction: Skill system (INV-6) for LLM summarization,
 *    CostTracker (INV-9) for usage logging, shared/tokenBudget (INV-3)
 *    for CJK-aware token estimation.
 * ## Invariants: INV-3 (CJK token counting), INV-5 (narrative preservation),
 *    INV-6 (all LLM calls via Skill), INV-9 (cost tracking).
 * ## Performance: single compactContext call ≤ 10s (ARCHITECTURE.md §三).
 */

import { createHash } from "crypto";
import { estimateTokens } from "@shared/tokenBudget";

// ─── Constants ──────────────────────────────────────────────────────

export const BUILTIN_AUTO_COMPACT_SKILL_ID = "builtin:auto-compact";

// Why: 0.3 matches the ≤30% summary ratio enforced by compressionEngine.ts,
// keeping the two compression paths consistent. Raising this degrades
// narrative quality; lowering it wastes LLM calls on too-short summaries.
const DEFAULT_MAX_SUMMARY_RATIO = 0.3;

// Why: 500 matches costTracker.ts MAX_RECORDS eviction threshold.
// Larger caches risk unbounded memory growth in long editing sessions.
const DEFAULT_CACHE_MAX_SIZE = 500;

const DEFAULT_MODEL = "gpt-4o";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Fragment priority levels, ordered from highest to lowest protection.
 * protected: KG core entities, foreshadowing, world rules, user-marked
 * recent: recently accessed/created content
 * referenced: content referenced by other fragments or KG queries
 * old: stale content, first candidate for compression
 */
export type FragmentPriority = "protected" | "recent" | "referenced" | "old";

/**
 * @invariant INV-5: fragments with compactable=false are NEVER compressed,
 * regardless of priority or budget pressure.
 */
export interface ContextFragment {
  id: string;
  content: string;
  priority: FragmentPriority;
  /** false = protected from compression (INV-5). KG entities, foreshadowing,
   *  world rules, and user-marked paragraphs must set this to false. */
  compactable: boolean;
  metadata?: {
    sourceType?:
      | "kg-entity"
      | "character-setting"
      | "foreshadowing"
      | "world-rule"
      | "user-marked"
      | "conversation"
      | "document-excerpt";
    entityId?: string;
    lastAccessedAt?: number;
    referenceCount?: number;
  };
}

export interface CompactedFragment {
  id: string;
  originalId: string;
  content: string;
  tokenCount: number;
  wasCompressed: boolean;
  originalTokenCount: number;
  /** Pointer to recover the original content (expandable). Only present
   *  when wasCompressed=true. Format: "ref:<originalId>" */
  referencePointer?: string;
}

export interface CompactedContext {
  fragments: CompactedFragment[];
  totalTokens: number;
  originalTotalTokens: number;
  compressedCount: number;
  protectedCount: number;
  cacheHits: number;
  compressionRatio: number;
}

/**
 * @invariant INV-6: all LLM calls go through this interface.
 * The implementation must route to the Skill system, never directly to an
 * LLM provider.
 */
export interface SkillInvoker {
  invoke(args: {
    skillId: string;
    input: string;
    model?: string;
  }): Promise<{
    output: string;
    usage?: { promptTokens: number; completionTokens: number };
    model?: string;
    requestId?: string;
  }>;
}

/**
 * Minimal CostTracker surface used by this module.
 * Full interface lives in services/ai/costTracker.ts.
 */
interface CostTrackerLike {
  recordUsage(
    usage: { promptTokens: number; completionTokens: number },
    modelId: string,
    requestId: string,
    skillId: string,
  ): unknown;
}

export interface NarrativeCompactConfig {
  skillInvoker: SkillInvoker;
  costTracker: CostTrackerLike;
  defaultModel?: string;
  /** Max summary / original token ratio. Default: 0.3 */
  maxSummaryRatio?: number;
  /** Max cache entries before LRU eviction. Default: 500 */
  cacheMaxSize?: number;
}

export interface NarrativeCompactService {
  compactContext(
    fragments: ContextFragment[],
    budgetTokens: number,
  ): Promise<CompactedContext>;
  clearCache(): void;
  getCacheStats(): { size: number; hits: number; misses: number };
  dispose(): void;
}

// ─── Priority ordering ──────────────────────────────────────────────

// Why: numeric weight makes sort deterministic. Protected = 0 means they
// sort to the front (highest priority, last to be considered for compression).
const PRIORITY_WEIGHT: Record<FragmentPriority, number> = {
  protected: 0,
  recent: 1,
  referenced: 2,
  old: 3,
};

/**
 * Sort fragments by compression candidacy: lowest-priority first.
 * Within the same priority, longer fragments compress first (more token savings).
 */
function sortByCompressionOrder(fragments: ContextFragment[]): ContextFragment[] {
  return [...fragments].sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (weightDiff !== 0) return weightDiff;
    // Longer content first within same priority (more savings)
    return estimateTokens(b.content) - estimateTokens(a.content);
  });
}

// ─── Cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  summary: string;
  summaryTokens: number;
  lastUsed: number;
}

function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// ─── Implementation ─────────────────────────────────────────────────

export function createNarrativeCompactService(
  config: NarrativeCompactConfig,
): NarrativeCompactService {
  const {
    skillInvoker,
    costTracker,
    defaultModel = DEFAULT_MODEL,
    maxSummaryRatio = DEFAULT_MAX_SUMMARY_RATIO,
    cacheMaxSize = DEFAULT_CACHE_MAX_SIZE,
  } = config;

  const cache = new Map<string, CacheEntry>();
  let cacheHits = 0;
  let cacheMisses = 0;
  let disposed = false;

  function evictLRU(): void {
    if (cache.size <= cacheMaxSize) return;

    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  async function compressSingleFragment(
    fragment: ContextFragment,
  ): Promise<{ summary: string; summaryTokens: number; fromCache: boolean }> {
    const hash = contentHash(fragment.content);

    // Cache lookup
    const cached = cache.get(hash);
    if (cached) {
      cached.lastUsed = Date.now();
      cacheHits++;
      return { summary: cached.summary, summaryTokens: cached.summaryTokens, fromCache: true };
    }

    cacheMisses++;

    // INV-6: all LLM calls through Skill system
    const result = await skillInvoker.invoke({
      skillId: BUILTIN_AUTO_COMPACT_SKILL_ID,
      input: fragment.content,
      model: defaultModel,
    });

    let summary = result.output;
    let summaryTokens = estimateTokens(summary);

    // Enforce maxSummaryRatio: if summary exceeds the ratio, truncate it.
    // This guards against LLM returning overly verbose summaries.
    const originalTokens = estimateTokens(fragment.content);
    const maxAllowedTokens = Math.ceil(originalTokens * maxSummaryRatio);
    if (summaryTokens > maxAllowedTokens && summary.length > 0) {
      const ratio = maxAllowedTokens / summaryTokens;
      summary = summary.slice(0, Math.max(1, Math.floor(summary.length * ratio)));
      summaryTokens = estimateTokens(summary);
    }

    // INV-9: record cost
    if (result.usage && result.requestId) {
      costTracker.recordUsage(
        result.usage,
        result.model ?? defaultModel,
        result.requestId,
        BUILTIN_AUTO_COMPACT_SKILL_ID,
      );
    }

    // Cache the result
    cache.set(hash, {
      summary,
      summaryTokens,
      lastUsed: Date.now(),
    });
    evictLRU();

    return { summary, summaryTokens, fromCache: false };
  }

  const service: NarrativeCompactService = {
    async compactContext(
      fragments: ContextFragment[],
      budgetTokens: number,
    ): Promise<CompactedContext> {
      if (disposed) {
        throw new Error("NarrativeCompactService has been disposed");
      }

      // Empty input
      if (fragments.length === 0) {
        return {
          fragments: [],
          totalTokens: 0,
          originalTotalTokens: 0,
          compressedCount: 0,
          protectedCount: 0,
          cacheHits: 0,
          compressionRatio: 1,
        };
      }

      // Pre-compute token counts for all fragments
      const fragmentTokens = new Map<string, number>();
      let originalTotalTokens = 0;
      for (const frag of fragments) {
        const tokens = estimateTokens(frag.content);
        fragmentTokens.set(frag.id, tokens);
        originalTotalTokens += tokens;
      }

      // If already within budget, return all uncompressed
      if (originalTotalTokens <= budgetTokens) {
        return {
          fragments: fragments.map((f) => ({
            id: `compacted-${f.id}`,
            originalId: f.id,
            content: f.content,
            tokenCount: fragmentTokens.get(f.id)!,
            wasCompressed: false,
            originalTokenCount: fragmentTokens.get(f.id)!,
          })),
          totalTokens: originalTotalTokens,
          originalTotalTokens,
          compressedCount: 0,
          protectedCount: fragments.filter((f) => !f.compactable).length,
          cacheHits: 0,
          compressionRatio: 1,
        };
      }

      // Sort by compression candidacy: lowest-priority first
      const compressionOrder = sortByCompressionOrder(fragments);

      // Track which fragments need compression
      const compressedMap = new Map<string, { summary: string; summaryTokens: number }>();
      let currentTotal = originalTotalTokens;
      let localCacheHits = 0;

      // Compress starting from lowest priority until under budget
      for (const frag of compressionOrder) {
        if (currentTotal <= budgetTokens) break;

        // INV-5: never compress protected content
        if (!frag.compactable) continue;

        const origTokens = fragmentTokens.get(frag.id)!;
        const { summary, summaryTokens, fromCache } = await compressSingleFragment(
          frag,
        );
        if (fromCache) localCacheHits++;

        compressedMap.set(frag.id, { summary, summaryTokens });
        currentTotal = currentTotal - origTokens + summaryTokens;
      }

      // Build result preserving original fragment order
      const resultFragments: CompactedFragment[] = fragments.map((frag) => {
        const compressed = compressedMap.get(frag.id);
        if (compressed) {
          return {
            id: `compacted-${frag.id}`,
            originalId: frag.id,
            content: compressed.summary,
            tokenCount: compressed.summaryTokens,
            wasCompressed: true,
            originalTokenCount: fragmentTokens.get(frag.id)!,
            referencePointer: `ref:${frag.id}`,
          };
        }
        return {
          id: `compacted-${frag.id}`,
          originalId: frag.id,
          content: frag.content,
          tokenCount: fragmentTokens.get(frag.id)!,
          wasCompressed: false,
          originalTokenCount: fragmentTokens.get(frag.id)!,
        };
      });

      const totalTokens = resultFragments.reduce((sum, f) => sum + f.tokenCount, 0);

      return {
        fragments: resultFragments,
        totalTokens,
        originalTotalTokens,
        compressedCount: compressedMap.size,
        protectedCount: fragments.filter((f) => !f.compactable).length,
        cacheHits: localCacheHits,
        compressionRatio: originalTotalTokens > 0 ? totalTokens / originalTotalTokens : 1,
      };
    },

    clearCache(): void {
      cache.clear();
      cacheHits = 0;
      cacheMisses = 0;
    },

    getCacheStats(): { size: number; hits: number; misses: number } {
      return { size: cache.size, hits: cacheHits, misses: cacheMisses };
    },

    dispose(): void {
      disposed = true;
      cache.clear();
    },
  };

  return service;
}
