/**
 * @module foreshadowingTracker
 * ## Responsibilities: Query unresolved foreshadowing entities from KG,
 *    compute urgency ranking, and provide resolution capability.
 * ## Does not do: LLM calls, IPC registration, UI rendering, event emission.
 *    IPC + frontend panel are downstream tasks.
 * ## Dependency direction: DB Layer (SQLite queries) only.
 * ## Invariants: INV-4 (Memory-First — KG+SQLite, no LLM).
 * ## Performance: listActive() ≤ 200ms — prepared SQLite statements + 30s cache.
 */

import type { DbLikeWithRun } from "./dbTypes";

// ─── types ──────────────────────────────────────────────────────────

export interface ForeshadowingItem {
  readonly entityId: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: number;
  readonly openDays: number;
  /**
   * Urgency score in range [0, 1].
   *
   * @deviation The authoritative spec (engagement-engine.md §机制3 lines 183-185)
   *   defines urgency as chapter-based: `min(1.0, (currentChapter - plantedChapter) / 10)`.
   *   This implementation uses a time-based approximation:
   *   `min(1.0, openDays / URGENCY_DECAY_DAYS)` where URGENCY_DECAY_DAYS = 30.
   *   Rationale: the service has no access to currentChapter (requires document context);
   *   chapter-based urgency will be implemented when the IPC layer provides chapter info.
   *   The 30-day decay maps roughly to 10 chapters at ~3 days/chapter writing pace.
   */
  readonly urgency: number;
  readonly firstChapterHint: string;
}

export interface ForeshadowingTracker {
  /** Get all unresolved foreshadowing items, sorted by urgency (most urgent first). */
  listActive(projectId: string): ForeshadowingItem[];

  /** Mark a foreshadowing entity as resolved. Returns true if found and updated, false otherwise. */
  resolve(projectId: string, entityId: string): boolean;

  /** Invalidate cache for a project. */
  invalidateCache(projectId: string): void;

  /** Dispose service resources. */
  dispose(): void;
}

// ─── constants ──────────────────────────────────────────────────────

// 30s cache TTL — same SLO as storyStatusService.
// Source: engagement-engine.md ≤ 200ms; caching avoids repeated full-table
// scans when the dashboard re-renders within the same window.
const CACHE_TTL_MS = 30_000;

// Milliseconds per day — used for openDays / urgency calculation.
const MS_PER_DAY = 86_400_000;

// Number of days mapping to urgency = 1.0.
// @deviation Spec uses 10 chapters; 30 days ≈ 10 chapters at ~3 days/chapter.
// Source: engagement-engine.md §机制3 lines 183-185.
const URGENCY_DECAY_DAYS = 30;

// ─── SQL ────────────────────────────────────────────────────────────

/**
 * Active (unresolved) foreshadowing entities sorted by creation date ASC
 * (oldest first = most urgent).
 *
 * @why attributes_json.resolved is a boolean flag toggled by resolve().
 *   IS NOT 1 covers both NULL (never resolved) and explicit 0.
 *
 * @risk Foreshadowing type is not yet in the kg_entities CHECK constraint
 *   (migration 0013: character/location/event/item/faction only). Until the
 *   constraint is extended, this query returns [] — graceful degradation.
 */
const SQL_LIST_ACTIVE = `
  SELECT id, name, description, attributes_json, created_at
  FROM kg_entities
  WHERE project_id = ?
    AND type = 'foreshadowing'
    AND json_extract(attributes_json, '$.resolved') IS NOT 1
  ORDER BY created_at ASC
`;

/**
 * Resolve a foreshadowing entity by setting attributes_json.resolved = 1.
 *
 * @why This is a structured data operation (toggling a boolean flag in
 *   attributes_json), NOT an LLM call and NOT a Skill invocation. It is
 *   equivalent to a checkbox toggle in the KG layer. The json_set() function
 *   preserves all other attributes while adding/updating the resolved key.
 *
 * Conditions: must match id + project_id + type, and must NOT already be
 * resolved (json_extract($.resolved) IS NOT 1) to prevent double-writes.
 */
const SQL_RESOLVE = `
  UPDATE kg_entities
  SET attributes_json = json_set(attributes_json, '$.resolved', 1),
      updated_at = ?
  WHERE id = ?
    AND project_id = ?
    AND type = 'foreshadowing'
    AND json_extract(attributes_json, '$.resolved') IS NOT 1
`;

// ─── cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  items: ForeshadowingItem[];
  expiresAt: number;
}

// ─── factory ────────────────────────────────────────────────────────

export interface ForeshadowingTrackerDeps {
  db: DbLikeWithRun;
  /** Overridable clock for deterministic testing (P4). */
  nowMs?: () => number;
}

/**
 * Factory — consistent with storyStatusService / flowDetector pattern.
 *
 * @invariant INV-4: all data comes from SQLite structured queries; zero LLM calls.
 * @invariant INV-6: this is NOT a Skill — it's a structured data query service.
 * @risk If foreshadowing entity type is not yet added to the kg_entities CHECK
 *   constraint, listActive() returns [] — graceful degradation.
 */
export function createForeshadowingTracker(
  deps: ForeshadowingTrackerDeps,
): ForeshadowingTracker {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;

  // Prepared statements — allocated once, reused per call.
  const stmtListActive = db.prepare(SQL_LIST_ACTIVE);
  const stmtResolve = db.prepare(SQL_RESOLVE);

  const cache = new Map<string, CacheEntry>();
  let disposed = false;

  // ── internal helpers ────────────────────────────────────────────

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("ForeshadowingTracker has been disposed");
    }
  }

  function toItem(
    row: Record<string, unknown>,
    now: number,
  ): ForeshadowingItem {
    // KG stores created_at as ISO 8601 text (kgCoreService.ts:165 uses
    // new Date().toISOString()). Parse to epoch ms for arithmetic.
    const rawCreatedAt = row.created_at;
    const createdAt =
      typeof rawCreatedAt === "string"
        ? new Date(rawCreatedAt).getTime()
        : (rawCreatedAt as number);

    const openDays = Math.max(0, Math.floor((now - createdAt) / MS_PER_DAY));
    // Urgency clamped to [0, 1] — see @deviation on ForeshadowingItem.urgency.
    const urgency = Math.min(1.0, openDays / URGENCY_DECAY_DAYS);

    // Best-effort firstChapter extraction from attributes_json.
    let firstChapterHint = "";
    if (row.attributes_json) {
      try {
        const attrs =
          typeof row.attributes_json === "string"
            ? (JSON.parse(row.attributes_json) as Record<string, unknown>)
            : (row.attributes_json as Record<string, unknown>);
        if (typeof attrs.firstChapter === "string") {
          firstChapterHint = attrs.firstChapter;
        }
      } catch {
        // Malformed JSON — degrade gracefully, empty hint.
      }
    }

    return {
      entityId: row.id as string,
      name: (row.name as string) ?? "",
      description: (row.description as string) ?? "",
      createdAt,
      openDays,
      urgency,
      firstChapterHint,
    };
  }

  // ── public API ──────────────────────────────────────────────────

  const tracker: ForeshadowingTracker = {
    listActive(projectId: string): ForeshadowingItem[] {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }

      // Cache check
      const cached = cache.get(projectId);
      if (cached && nowMs() < cached.expiresAt) {
        return cached.items;
      }

      // Fresh query
      const now = nowMs();
      const rows = stmtListActive.all(projectId) as Array<
        Record<string, unknown>
      >;
      const items = rows.map((r) => toItem(r, now));

      cache.set(projectId, { items, expiresAt: now + CACHE_TTL_MS });

      return items;
    },

    resolve(projectId: string, entityId: string): boolean {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }
      if (!entityId) {
        throw new Error("entityId is required");
      }

      // Write ISO 8601 string for updated_at — matches kgCoreService convention.
      const result = stmtResolve.run(
        new Date(nowMs()).toISOString(),
        entityId,
        projectId,
      );

      // Invalidate cache after mutation to prevent stale reads.
      if (result.changes > 0) {
        cache.delete(projectId);
      }

      return result.changes > 0;
    },

    invalidateCache(projectId: string): void {
      cache.delete(projectId);
    },

    dispose(): void {
      disposed = true;
      cache.clear();
    },
  };

  return tracker;
}
