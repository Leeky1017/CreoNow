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
 * Chapter progress: count all chapters + find the most recently edited one.
 * Uses a single query with window function to avoid two round-trips.
 *
 * Result columns: total, current_sort_order, current_title, current_doc_id,
 *                 current_updated_at, current_content_text
 */
const SQL_CHAPTER_PROGRESS = `
  SELECT
    COUNT(*) OVER () AS total,
    sort_order       AS current_sort_order,
    title            AS current_title,
    document_id      AS current_doc_id,
    updated_at       AS current_updated_at,
    substr(content_text, 1, ?) AS current_content_text
  FROM documents
  WHERE project_id = ? AND type = 'chapter'
  ORDER BY updated_at DESC
  LIMIT 1
`;

/**
 * Active foreshadowing: KG entities of type 'foreshadowing' that are NOT
 * resolved. Uses last_seen_state for resolution tracking (migration 0020).
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
    AND (last_seen_state IS NULL OR last_seen_state != 'resolved')
  ORDER BY created_at ASC
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
 * @risk If foreshadowing entity type is not yet added to the kg_entities CHECK
 *   constraint, the foreshadowing query returns [] — graceful degradation.
 */
export function createStoryStatusService(deps: StoryStatusDeps): StoryStatusService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;

  // Prepared statements — allocated once, reused per call.
  const stmtChapterProgress = db.prepare(SQL_CHAPTER_PROGRESS);
  const stmtForeshadowing = db.prepare(SQL_ACTIVE_FORESHADOWING);

  const cache = new Map<string, CacheEntry>();
  let disposed = false;

  // ── internal helpers ────────────────────────────────────────────

  function queryChapterProgress(projectId: string): {
    progress: ChapterProgress;
    interruption: InterruptionPoint | null;
  } {
    const row = stmtChapterProgress.get(CONTENT_PREVIEW_LENGTH, projectId) as
      | {
          total: number;
          current_sort_order: number;
          current_title: string;
          current_doc_id: string;
          current_updated_at: number;
          current_content_text: string;
        }
      | undefined;

    if (!row || row.total === 0) {
      return {
        progress: { current: 0, total: 0, currentTitle: "" },
        interruption: null,
      };
    }

    return {
      progress: {
        current: row.current_sort_order,
        total: row.total,
        currentTitle: row.current_title,
      },
      interruption: {
        documentId: row.current_doc_id,
        title: row.current_title,
        lastEditedAt: row.current_updated_at,
        contentPreview: row.current_content_text ?? "",
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
