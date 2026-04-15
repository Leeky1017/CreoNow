/**
 * @module postWritingHooks
 * ## Responsibilities: Factory functions for INV-8 post-writing hook chain.
 *   Creates kg-update, memory-extract, and quality-check hooks that wire
 *   into the WritingOrchestrator Stage 8 pipeline.
 * ## Does not do: orchestrate execution order (orchestrator owns that),
 *   persist hook results to DB (each downstream service owns its own storage),
 *   or call LLM directly (consistency-check goes through the Skill system per INV-6).
 * ## Dependency direction: depends on KG service, session memory service,
 *   P3 skill executor — all injected via typed deps. No circular imports.
 * ## Invariants: INV-8 (hook chain framework), INV-4 (memory-first),
 *   INV-6 (all capabilities via Skill system).
 * ## Performance: Total hook budget < 2s. kg-update and memory-extract are
 *   designed to be fast (< 100ms each for typical text sizes). quality-check
 *   may be slower but is fire-and-forget — its failure doesn't block.
 */

import type { PostWritingHook, PostWritingHookContext } from "./orchestrator";
import type { MatchResult, MatchableEntity } from "../kg/entityMatcher";
import type { KnowledgeGraphService, KnowledgeEntity } from "../kg/types";
import type { KgMutationSkill } from "./kgMutationSkill";
import type { SessionMemoryService } from "../memory/sessionMemoryService";
import type { P3SkillExecutor } from "./p3Skills";
import type { Logger } from "../../logging/logger";

// ─── Hook priority constants ────────────────────────────────────────
// Why: explicit ordering ensures deterministic execution per INV-8 spec.
// Lower number = runs first. KG update before memory (memory may reference
// KG entities), quality-check last (reads KG state written by kg-update).

/** KG update runs first to ensure entity state is fresh for downstream hooks. */
export const KG_UPDATE_PRIORITY = 30;
/** Memory extract runs second — may reference entities recognized by kg-update. */
export const MEMORY_EXTRACT_PRIORITY = 40;
/** Quality check runs last — validates against the latest KG state. */
export const QUALITY_CHECK_PRIORITY = 50;

// ─── Shared helpers ─────────────────────────────────────────────────

/**
 * Maximum text length to process in hooks.
 * Why: Aho-Corasick scan is O(n) in text length. For very long texts (>100K),
 * the scan could exceed the 2s budget. We truncate to a safe upper bound.
 */
const MAX_HOOK_TEXT_LENGTH = 100_000; // 100K chars ≈ ~50K CJK tokens

function truncateText(text: string): string {
  return text.length > MAX_HOOK_TEXT_LENGTH
    ? text.slice(0, MAX_HOOK_TEXT_LENGTH)
    : text;
}

/**
 * Validate that a hook context has the minimum required fields.
 * Returns false if fullText is empty (nothing to process) — hooks should
 * short-circuit in that case.
 */
function hasProcessableText(ctx: PostWritingHookContext): boolean {
  return typeof ctx.fullText === "string" && ctx.fullText.length > 0;
}

// ─── KG Update Hook ─────────────────────────────────────────────────

/**
 * Dependencies for the KG update hook.
 * Using Pick<> / minimal interfaces to keep the coupling surface small.
 */
export interface KgUpdateHookDeps {
  /** Aho-Corasick entity scanner (typically matchEntitiesCached). */
  scanEntities: (
    text: string,
    entities: MatchableEntity[],
    projectId: string,
  ) => MatchResult[];
  /** KG service for listing entities (read-only queries). */
  kgService: Pick<KnowledgeGraphService, "entityList">;
  /**
   * INV-6 compliant mutation gateway for KG writes.
   * @why All KG writes go through the kgMutationSkill pipeline
   *   (validate → permission → execute) to ensure a single auditable
   *   gateway and future Permission Gate enforcement.
   */
  kgMutationSkill: Pick<KgMutationSkill, "execute">;
  logger: Pick<Logger, "info" | "error">;
}

/**
 * Create a post-writing hook that scans new text for known KG entities
 * using the Aho-Corasick automaton and marks candidate entities.
 *
 * @invariant INV-8 — independently try-catch'd; failure does not propagate.
 * @invariant INV-2 — scanEntities (matchEntitiesCached) is concurrent-safe for reads.
 * @why Entity recognition on every write keeps the KG's "last seen" metadata
 *   fresh without requiring the user to manually tag entities.
 */
export function createKgUpdateHook(deps: KgUpdateHookDeps): PostWritingHook {
  return {
    name: "kg-update",
    priority: KG_UPDATE_PRIORITY,
    async execute(ctx: PostWritingHookContext): Promise<void> {
      if (!hasProcessableText(ctx) || !ctx.projectId) {
        return;
      }

      const projectId = ctx.projectId;
      const text = truncateText(ctx.fullText);

      // Fetch all entities with aiContextLevel="when_detected" for matching.
      const listResult = deps.kgService.entityList({
        projectId,
        filter: { aiContextLevel: "when_detected" },
        limit: 5000, // Upper bound for entity scan — typical projects have <1000
      });

      if (!listResult.ok) {
        deps.logger.error("kg-update:entity-list-failed", {
          projectId,
          code: listResult.error.code,
        });
        return;
      }

      const entities: MatchableEntity[] = listResult.data.items.map(
        (e: KnowledgeEntity) => ({
          id: e.id,
          name: e.name,
          aliases: e.aliases,
          aiContextLevel: e.aiContextLevel,
        }),
      );

      if (entities.length === 0) {
        return;
      }

      const matches = deps.scanEntities(text, entities, projectId);

      if (matches.length === 0) {
        return;
      }

      deps.logger.info("kg-update:matches-found", {
        projectId,
        documentId: ctx.documentId,
        matchCount: matches.length,
      });

      // Update lastSeenState for each matched entity via kgMutationSkill (INV-6).
      // Best-effort: individual update failures are logged but don't stop others.
      const timestamp = new Date().toISOString();
      for (const match of matches) {
        // Find the entity's current version for optimistic concurrency.
        const entity = listResult.data.items.find(
          (e: KnowledgeEntity) => e.id === match.entityId,
        );
        if (!entity) continue;

        const updateResult = deps.kgMutationSkill.execute({
          mutationType: "entity:update",
          projectId,
          payload: {
            id: match.entityId,
            expectedVersion: entity.version,
            patch: {
              lastSeenState: `Detected in doc:${ctx.documentId} at ${timestamp} (term: "${match.matchedTerm}")`,
            },
          },
        });

        if (!updateResult.ok) {
          deps.logger.error("kg-update:entity-update-failed", {
            projectId,
            entityId: match.entityId,
            code: updateResult.error.code,
          });
        }
      }
    },
  };
}

// ─── Memory Extract Hook ────────────────────────────────────────────

export interface MemoryExtractHookDeps {
  sessionMemory: Pick<SessionMemoryService, "create">;
  logger: Pick<Logger, "info" | "error">;
}

/**
 * Heuristic extraction patterns for writing context.
 *
 * Why: Full NLP is too expensive for a hook (2s budget). Simple pattern
 * matching catches the most common writing-preference signals:
 * - Explicit style declarations ("我喜欢用…", "请用…风格")
 * - POV indicators ("第一人称", "全知视角")
 * - Tense references ("过去式", "现在时")
 */
const STYLE_PATTERNS: ReadonlyArray<{ pattern: RegExp; category: "style" | "preference" }> = [
  { pattern: /(?:我(?:喜欢|偏好|想要|希望|倾向)(?:用|使用)?[^。！？\n]{2,30}(?:风格|语气|口吻|笔调))/u, category: "style" },
  { pattern: /(?:(?:请|请用|采用|使用)[^。！？\n]{2,30}(?:风格|语气|口吻|写法|手法))/u, category: "style" },
  { pattern: /(?:第[一二三]人称|全知视角|限知视角|上帝视角)/u, category: "preference" },
  { pattern: /(?:过去式|现在式|现在时|倒叙|插叙|顺叙)/u, category: "preference" },
];

/**
 * Extract writing-style signals from text.
 * Returns array of {category, content} pairs suitable for session memory storage.
 */
export function extractWritingContext(
  text: string,
): Array<{ category: "style" | "preference"; content: string }> {
  const results: Array<{ category: "style" | "preference"; content: string }> = [];
  const seen = new Set<string>();

  for (const { pattern, category } of STYLE_PATTERNS) {
    const match = pattern.exec(text);
    if (match && !seen.has(match[0])) {
      seen.add(match[0]);
      results.push({ category, content: match[0] });
    }
  }

  return results;
}

/**
 * Create a post-writing hook that extracts writing context/preferences
 * from new text and writes them to L1 session memory.
 *
 * @invariant INV-8 — independently try-catch'd; failure does not propagate.
 * @invariant INV-4 — writes to L1 session-aware memory store.
 * @why Automatic preference capture means the AI learns the user's style
 *   without explicit configuration — reducing friction per engagement-engine spec.
 */
export function createMemoryExtractHook(
  deps: MemoryExtractHookDeps,
): PostWritingHook {
  return {
    name: "memory-extract",
    priority: MEMORY_EXTRACT_PRIORITY,
    async execute(ctx: PostWritingHookContext): Promise<void> {
      if (!hasProcessableText(ctx) || !ctx.projectId || !ctx.sessionId) {
        return;
      }

      const text = truncateText(ctx.fullText);
      const extractions = extractWritingContext(text);

      if (extractions.length === 0) {
        return;
      }

      deps.logger.info("memory-extract:patterns-found", {
        projectId: ctx.projectId,
        documentId: ctx.documentId,
        count: extractions.length,
      });

      // Write each extraction to session memory.
      // Individual failures are logged but don't stop other extractions.
      for (const extraction of extractions) {
        const result = deps.sessionMemory.create({
          sessionId: ctx.sessionId,
          projectId: ctx.projectId,
          category: extraction.category,
          content: extraction.content,
          relevanceScore: 0.8, // Heuristic-extracted items get moderate confidence
        });

        if (!result.ok) {
          deps.logger.error("memory-extract:create-failed", {
            projectId: ctx.projectId,
            category: extraction.category,
            code: result.error.code,
          });
        }
      }
    },
  };
}

// ─── Quality Check Hook ─────────────────────────────────────────────

export interface QualityCheckHookDeps {
  skillExecutor: Pick<P3SkillExecutor, "executeSkill">;
  logger: Pick<Logger, "info" | "error">;
}

/**
 * Create a post-writing hook that runs the consistency-check Skill
 * against new text vs KG state.
 *
 * The skill call is fire-and-forget: the hook's execute() returns immediately
 * after launching the async skill. Result logging happens in .then()/.catch().
 * This avoids blocking Stage 8 on an LLM call.
 *
 * @invariant INV-8 — independently try-catch'd; failure does not propagate.
 * @invariant INV-6 — quality check goes through the unified Skill system.
 * @why Automatic consistency validation catches contradictions before the
 *   user notices — critical for long-form fiction with complex world state.
 */
export function createQualityCheckHook(
  deps: QualityCheckHookDeps,
): PostWritingHook {
  return {
    name: "quality-check",
    priority: QUALITY_CHECK_PRIORITY,
    async execute(ctx: PostWritingHookContext): Promise<void> {
      if (!hasProcessableText(ctx) || !ctx.projectId) {
        return;
      }

      // Fire-and-forget: don't await — avoids blocking Stage 8 on an LLM call.
      void deps.skillExecutor
        .executeSkill("builtin:consistency-check", {
          projectId: ctx.projectId,
          documentId: ctx.documentId,
          documentContent: ctx.fullText,
        })
        .then((result) => {
          if (result.success) {
            const data = result.data as
              | { passed?: boolean; issues?: unknown[] }
              | undefined;
            deps.logger.info("quality-check:completed", {
              projectId: ctx.projectId,
              documentId: ctx.documentId,
              passed: data?.passed ?? true,
              issueCount: data?.issues?.length ?? 0,
            });
          } else {
            deps.logger.error("quality-check:skill-failed", {
              projectId: ctx.projectId,
              documentId: ctx.documentId,
              code: result.error?.code,
              message: result.error?.message,
            });
          }
        })
        .catch((err: unknown) => {
          deps.logger.error("quality-check:fire-and-forget-failed", {
            projectId: ctx.projectId,
            documentId: ctx.documentId,
            error: String(err),
          });
        });
    },
  };
}

// ─── Hook chain builder ─────────────────────────────────────────────

export interface PostWritingHookChainDeps {
  kgUpdate: KgUpdateHookDeps;
  memoryExtract: MemoryExtractHookDeps;
  /**
   * Optional — some callers only have the fast local hook dependencies and
   * deliberately omit the LLM-backed quality-check leg.
   * When omitted the quality-check hook is simply not registered.
   */
  qualityCheck?: QualityCheckHookDeps;
}

/**
 * Build the full post-writing hook chain (INV-8).
 *
 * Returns all 3 hooks in priority order. The orchestrator still sorts by
 * priority at execution time, but returning them pre-sorted makes the
 * expected order explicit for callers.
 *
 * @why Single entry point for wiring — avoids scattered hook construction
 *   across multiple files and makes the dependency graph visible.
 */
export function buildPostWritingHookChain(
  deps: PostWritingHookChainDeps,
): PostWritingHook[] {
  const hooks: PostWritingHook[] = [
    createKgUpdateHook(deps.kgUpdate),
    createMemoryExtractHook(deps.memoryExtract),
  ];
  if (deps.qualityCheck) {
    hooks.push(createQualityCheckHook(deps.qualityCheck));
  }
  return hooks;
}
