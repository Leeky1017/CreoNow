/**
 * @module storyStatusService
 * ## Responsibilities: Return a project's creation status summary when opened.
 *    Provides chapter progress, interruption point, active foreshadowing,
 *    and a heuristic-based suggested next action.
 * ## Does not do: LLM calls, document mutation, cross-project aggregation,
 *    or foreshadowing resolution logic.
 * ## Dependency direction: DB Layer (SQLite read-only queries) only.
 * ## Invariants: INV-4 (Memory-First — structured data, no LLM).
 * ## Performance: getStatus() ≤ 200ms — prepared SQLite statements + 30s cache.
 */

// ─── types ──────────────────────────────────────────────────────────

export interface ChapterProgress {
  current: number;
  total: number;
  currentTitle: string;
}

export interface InterruptionPoint {
  documentId: string;
  title: string;
  lastEditedAt: number;
  contentPreview: string;
  /** L0 user memory context — most recent project-scoped memory (INV-4). */
  memoryContext: string;
}

export interface ForeshadowingEntry {
  entityId: string;
  name: string;
  description: string;
}

export interface SuggestedAction {
  type: "continue" | "resolve-foreshadowing" | "new-chapter";
  label: string;
  targetId?: string;
}

export interface StoryStatus {
  chapterProgress: ChapterProgress;
  interruptionPoint: InterruptionPoint | null;
  activeForeshadowing: ForeshadowingEntry[];
  suggestedAction: SuggestedAction;
}

export interface StoryStatusService {
  getStatus(projectId: string): StoryStatus;
  invalidateCache(projectId: string): void;
  dispose(): void;
}

// ─── database abstraction ───────────────────────────────────────────

export interface DbStatement {
  get(...args: unknown[]): Record<string, unknown> | undefined;
  all(...args: unknown[]): Record<string, unknown>[];
}

export interface DbLike {
  prepare(sql: string): DbStatement;
}

// ─── constants ──────────────────────────────────────────────────────

// 30s cache TTL — balances freshness against query cost.
// Source: engagement-engine.md SLO of ≤ 200ms; caching avoids repeated
// full-table scans when the dashboard re-renders within the same window.
const CACHE_TTL_MS = 30_000;

// Content preview truncation length (chars, not bytes).
// Matches engagement-engine.md spec for interruption-point summary.
const CONTENT_PREVIEW_LENGTH = 100;

// 24 hours in milliseconds — threshold for "continue writing" heuristic.
const RECENT_EDIT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ─── SQL ────────────────────────────────────────────────────────────

/**
 * Chapter progress: count all chapters + find the most recently content-edited one.
 * Uses a single query with window function to avoid multiple round-trips.
 *
 * F3: Uses LEFT JOIN with document_versions to derive the last *content* edit
 *   timestamp. documents.updated_at can be bumped by metadata changes (reorders,
 *   status changes). The subquery uses an allowlist of content-changing reasons
 *   (autosave, pre-write, ai-accept, ai-partial-accept, manual-save, rollback,
 *   branch-merge, search-replace) so that metadata-only snapshots (status-change,
 *   pre-rollback, pre-search-replace) don't affect recency ordering. Note:
 *   rollback, branch-merge, and search-replace are real content mutations (they
 *   update documents.content_*) — see documentCoreService, searchReplaceService.
 *   Falls back to documents.updated_at when no version history exists.
 *
 * F4: Uses ROW_NUMBER() OVER (ORDER BY sort_order ASC) to compute 1-based
 *   chapter number. Raw sort_order is 0-based (migration 0011) and cannot be
 *   used directly as a display chapter number.
 *
 * F5: Uses content tail (last N chars) instead of content start, since the spec
 *   says "上次写到哪里、最后编辑的段落" — the end of the content better represents
 *   where the user stopped writing.
 *
 * Result columns: total, chapter_number, current_title, current_doc_id,
 *                 current_edited_at, current_content_tail
 */
const SQL_CHAPTER_PROGRESS = `
  SELECT
    COUNT(*) OVER ()                                                          AS total,
    ROW_NUMBER() OVER (ORDER BY d.sort_order ASC)                             AS chapter_number,
    d.title                                                                   AS current_title,
    d.document_id                                                             AS current_doc_id,
    COALESCE(lv.last_content_at, d.updated_at)                                AS current_edited_at,
    substr(d.content_text, max(1, length(d.content_text) - ? + 1), ?)         AS current_content_tail
  FROM documents d
  LEFT JOIN (
    SELECT document_id, MAX(created_at) AS last_content_at
    FROM document_versions
    WHERE reason IN ('autosave', 'pre-write', 'ai-accept', 'ai-partial-accept', 'manual-save', 'rollback', 'branch-merge', 'search-replace')
    GROUP BY document_id
  ) lv ON lv.document_id = d.document_id
  WHERE d.project_id = ? AND d.type = 'chapter'
  ORDER BY COALESCE(lv.last_content_at, d.updated_at) DESC
  LIMIT 1
`;

/**
 * Active foreshadowing: KG entities of type 'foreshadowing' that are NOT resolved.
 *
 * F2: Resolution is tracked via attributes_json.resolved (boolean flag), NOT via
 *   last_seen_state. The last_seen_state column stores narrative states like
 *   "受伤但清醒" (used by stateExtractor for character/location tracking) and
 *   has no semantic connection to foreshadowing resolution status.
 *
 * @note 'foreshadowing' type was added to the kg_entities CHECK constraint
 *   by migration 002 (002_kg_entity_type_extension). Previously only
 *   character/location/event/item/faction were allowed; now includes
 *   inspiration and foreshadowing.
 *
 * @why The actual kg_entities schema uses 'id' (not 'entity_id') and 'type'
 *   (not 'entity_type') per migration 0013. Column mapping happens here;
 *   the TypeScript interface uses domain-friendly names.
 */
const SQL_ACTIVE_FORESHADOWING = `
  SELECT id, name, description
  FROM kg_entities
  WHERE project_id = ?
    AND type = 'foreshadowing'
    AND json_extract(attributes_json, '$.resolved') IS NOT 1
  ORDER BY created_at ASC
`;

/**
 * L0 user memory: most recent non-deleted memory scoped to the project or global.
 *
 * @why engagement-engine.md step 3: "从 Memory Layer 0 读取用户上次中断点".
 *   TASK-P3-08 lists 3 data sources: documents, kg_entities, AND user_memory (L0).
 *   This query provides the L0 component for interruption point enrichment.
 *
 * Scope precedence: project > global. A project-scoped memory always wins over
 * a newer global one, matching the repo's memory ordering convention
 * (memoryService.ts prefers narrower scope first).
 *
 * @invariant INV-4: Memory-First — L0 is always-inject layer. We read the most
 *   recent item to provide writing session context.
 */
const SQL_L0_MEMORY = `
  SELECT content, type
  FROM user_memory
  WHERE deleted_at IS NULL
    AND (
      scope = 'global'
      OR (scope = 'project' AND project_id = ?)
    )
  ORDER BY
    CASE WHEN scope = 'project' THEN 0 ELSE 1 END,
    updated_at DESC
  LIMIT 1
`;

// ─── cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  status: StoryStatus;
  expiresAt: number;
}

// ─── factory ────────────────────────────────────────────────────────

export interface StoryStatusDeps {
  db: DbLike;
  /** Overridable clock for deterministic testing (INV P4). */
  nowMs?: () => number;
}

/**
 * Factory — consistent with sessionMemoryService / p3Skills pattern.
 *
 * @invariant INV-4: all data comes from SQLite structured queries; zero LLM calls.
 * @note Migration 002 added 'foreshadowing' to the kg_entities CHECK constraint.
 *   The query now returns real data when foreshadowing entities exist.
 */
export function createStoryStatusService(deps: StoryStatusDeps): StoryStatusService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;

  // Prepared statements — allocated once, reused per call.
  const stmtChapterProgress = db.prepare(SQL_CHAPTER_PROGRESS);
  const stmtForeshadowing = db.prepare(SQL_ACTIVE_FORESHADOWING);
  const stmtL0Memory = db.prepare(SQL_L0_MEMORY);

  const cache = new Map<string, CacheEntry>();
  let disposed = false;

  // ── internal helpers ────────────────────────────────────────────

  function queryL0Memory(projectId: string): string {
    const row = stmtL0Memory.get(projectId) as
      | { content: string; type: string }
      | undefined;
    return row?.content ?? "";
  }

  function queryChapterProgress(projectId: string): {
    progress: ChapterProgress;
    interruption: InterruptionPoint | null;
  } {
    const row = stmtChapterProgress.get(
      CONTENT_PREVIEW_LENGTH,
      CONTENT_PREVIEW_LENGTH,
      projectId,
    ) as
      | {
          total: number;
          chapter_number: number;
          current_title: string;
          current_doc_id: string;
          current_edited_at: number;
          current_content_tail: string;
        }
      | undefined;

    // F6: When stmt.get() returns a row, COUNT(*) OVER() is guaranteed ≥ 1
    // because window functions evaluate before LIMIT. No need to check row.total === 0.
    if (!row) {
      return {
        progress: { current: 0, total: 0, currentTitle: "" },
        interruption: null,
      };
    }

    const l0Context = queryL0Memory(projectId);

    return {
      progress: {
        current: row.chapter_number,
        total: row.total,
        currentTitle: row.current_title,
      },
      interruption: {
        documentId: row.current_doc_id,
        title: row.current_title,
        lastEditedAt: row.current_edited_at,
        contentPreview: row.current_content_tail ?? "",
        memoryContext: l0Context,
      },
    };
  }

  function queryForeshadowing(projectId: string): ForeshadowingEntry[] {
    const rows = stmtForeshadowing.all(projectId) as Array<{
      id: string;
      name: string;
      description: string;
    }>;

    return rows.map((r) => ({
      entityId: r.id,
      name: r.name,
      description: r.description ?? "",
    }));
  }

  /**
   * Heuristic decision tree for suggested next action.
   *
   * Priority:
   *   1. Recent edit (< 24h) → continue writing the last chapter
   *   2. Unresolved foreshadowing exists → suggest resolving the oldest one
   *   3. Fallback → suggest starting a new chapter
   *
   * @why Engagement-engine.md: "即时满足" + "未完成焦虑" psychological hooks.
   *   Continuing recent work exploits sunk-cost bias; foreshadowing resolution
   *   exploits Zeigarnik effect (incomplete tasks stay in memory).
   */
  function deriveSuggestedAction(
    interruption: InterruptionPoint | null,
    foreshadowing: ForeshadowingEntry[],
  ): SuggestedAction {
    if (interruption) {
      const elapsed = nowMs() - interruption.lastEditedAt;
      if (elapsed < RECENT_EDIT_THRESHOLD_MS) {
        return {
          type: "continue",
          label: `继续写作：${interruption.title}`,
          targetId: interruption.documentId,
        };
      }
    }

    if (foreshadowing.length > 0) {
      const oldest = foreshadowing[0];
      return {
        type: "resolve-foreshadowing",
        label: `回收伏笔：${oldest.name}`,
        targetId: oldest.entityId,
      };
    }

    return {
      type: "new-chapter",
      label: "开始新章节",
    };
  }

  // ── public API ──────────────────────────────────────────────────

  const service: StoryStatusService = {
    getStatus(projectId: string): StoryStatus {
      if (disposed) {
        // Fail loudly — INV-10: errors must not lose context.
        throw new Error("StoryStatusService has been disposed");
      }

      if (!projectId) {
        throw new Error("projectId is required");
      }

      // Cache check
      const cached = cache.get(projectId);
      if (cached && nowMs() < cached.expiresAt) {
        return cached.status;
      }

      // Fresh query
      const { progress, interruption } = queryChapterProgress(projectId);
      const foreshadowing = queryForeshadowing(projectId);
      const suggestedAction = deriveSuggestedAction(interruption, foreshadowing);

      const status: StoryStatus = {
        chapterProgress: progress,
        interruptionPoint: interruption,
        activeForeshadowing: foreshadowing,
        suggestedAction,
      };

      cache.set(projectId, { status, expiresAt: nowMs() + CACHE_TTL_MS });

      return status;
    },

    invalidateCache(projectId: string): void {
      cache.delete(projectId);
    },

    dispose(): void {
      disposed = true;
      cache.clear();
    },
  };

  return service;
}
