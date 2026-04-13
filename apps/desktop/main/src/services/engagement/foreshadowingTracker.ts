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

import type { DbLike, DbStatement } from "./storyStatusService";

// ─── types ──────────────────────────────────────────────────────────

export interface ForeshadowingItem {
  readonly entityId: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: number;
  readonly openDays: number;
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

// ─── extended DB interface for writes ───────────────────────────────

/**
 * Extends DbStatement with run() for UPDATE/INSERT statements.
 * better-sqlite3 returns { changes: number } from run().
 */
export interface DbRunStatement extends DbStatement {
  run(...args: unknown[]): { changes: number };
}

export interface DbLikeWithRun extends DbLike {
  prepare(sql: string): DbRunStatement;
}

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
    const createdAt = row.created_at as number;
    const openDays = Math.floor((now - createdAt) / MS_PER_DAY);

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
      urgency: openDays,
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

      const result = stmtResolve.run(nowMs(), entityId, projectId);

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
