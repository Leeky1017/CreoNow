/**
 * @module quickCaptureService
 * ## Responsibilities: Capture, track, and manage "inspiration" entities in KG.
 *    Provides decay-tier classification, stale-archival, and usage tracking
 *    for the Loss Aversion mechanism (Engagement Engine §机制11).
 * ## Does not do: LLM calls, IPC registration, UI rendering, globalShortcut
 *    registration, AI classification of inspiration content. Those are
 *    downstream integration tasks.
 * ## Dependency direction: DB Layer (SQLite read/write queries) only.
 * ## Invariants: INV-4 (Memory-First — KG+SQLite, no LLM),
 *               INV-6 (NOT a Skill — structured data CRUD service).
 * ## Performance: list/stats ≤ 200ms — prepared SQLite statements + 30s cache.
 */

import type { DbLike, DbStatement } from "./storyStatusService";

// ─── types ──────────────────────────────────────────────────────────

export type DecayTier = "fresh" | "reminder" | "fading" | "archived";

export interface InspirationItem {
  readonly id: string;
  readonly content: string;
  readonly relatedEntities: string[];
  readonly capturedAt: number;
  readonly usedInChapter: string | null;
  readonly decayDays: number;
  readonly decayTier: DecayTier;
  readonly archived: boolean;
}

export interface DecayStats {
  readonly fresh: number;
  readonly reminder: number;
  readonly fading: number;
  readonly archived: number;
  readonly total: number;
}

export interface QuickCaptureService {
  /** Create a new inspiration entity. Returns the created item. */
  capture(projectId: string, content: string): InspirationItem;

  /** List unarchived, unused inspirations sorted by age (oldest first = most urgent). */
  listUnused(projectId: string): InspirationItem[];

  /** Mark an inspiration as used in a chapter. Returns true if updated, false otherwise. */
  markUsed(projectId: string, entityId: string, chapterId: string): boolean;

  /** Archive all inspirations older than 14 days. Returns count of archived items. */
  archiveStale(projectId: string): number;

  /** Return counts per decay tier for active + archived inspirations. */
  getDecayStats(projectId: string): DecayStats;

  /** Dispose service resources. */
  dispose(): void;
}

// ─── constants ──────────────────────────────────────────────────────

// Milliseconds per day — used for decay calculation.
const DAY_MS = 86_400_000;

// 30s cache TTL — same SLO as storyStatusService / foreshadowingTracker.
// Source: engagement-engine.md ≤ 200ms; caching avoids repeated full-table
// scans when the dashboard re-renders within the same window.
const CACHE_TTL_MS = 30_000;

// Decay thresholds (days) — engagement-engine.md §机制11:
//   < 3 days  = fresh (normal)
//   3-7 days  = reminder (yellow)
//   7-14 days = fading (red)
//   > 14 days = auto-archive
const FRESH_MAX_DAYS = 3;      // exclusive upper bound for fresh tier
const REMINDER_MAX_DAYS = 7;   // exclusive upper bound for reminder tier
const FADING_MAX_DAYS = 14;    // exclusive upper bound for fading tier
// >= FADING_MAX_DAYS → auto-archive threshold (archiveStale)

// ─── SQL ────────────────────────────────────────────────────────────

/**
 * List active (not archived, not used) inspirations sorted by created_at ASC
 * (oldest first = most urgent for decay display).
 *
 * @risk 'inspiration' type is not yet in the kg_entities CHECK constraint
 *   (migration 0013: character/location/event/item/faction only). Until the
 *   constraint is extended, this query returns [] — graceful degradation.
 */
const SQL_LIST_UNUSED = `
  SELECT id, name, attributes_json, created_at, updated_at
  FROM kg_entities
  WHERE project_id = ?
    AND type = 'inspiration'
    AND json_extract(attributes_json, '$.archived') IS NOT 1
    AND json_extract(attributes_json, '$.usedInChapter') IS NULL
  ORDER BY created_at ASC
`;

/**
 * List ALL inspirations (including archived and used) for stats computation.
 * Avoids per-tier SQL by doing classification in JS.
 */
const SQL_ALL_INSPIRATIONS = `
  SELECT id, name, attributes_json, created_at, updated_at
  FROM kg_entities
  WHERE project_id = ?
    AND type = 'inspiration'
  ORDER BY created_at ASC
`;

/**
 * Mark an inspiration as used in a specific chapter.
 *
 * @why json_set preserves all other attributes while adding usedInChapter.
 *   Condition prevents double-marking (idempotent from caller's perspective).
 */
const SQL_MARK_USED = `
  UPDATE kg_entities
  SET attributes_json = json_set(attributes_json, '$.usedInChapter', ?),
      updated_at = ?
  WHERE id = ?
    AND project_id = ?
    AND type = 'inspiration'
    AND json_extract(attributes_json, '$.usedInChapter') IS NULL
`;

/**
 * Archive stale inspirations: > 14 days old, not already archived, not used.
 *
 * @why created_at < ? compares ISO 8601 strings lexicographically, which is
 *   correct for timestamps in the same timezone (KG stores UTC ISO strings).
 */
const SQL_ARCHIVE_STALE = `
  UPDATE kg_entities
  SET attributes_json = json_set(attributes_json, '$.archived', 1),
      updated_at = ?
  WHERE project_id = ?
    AND type = 'inspiration'
    AND json_extract(attributes_json, '$.archived') IS NOT 1
    AND json_extract(attributes_json, '$.usedInChapter') IS NULL
    AND created_at < ?
`;

/**
 * Insert a new inspiration entity.
 */
const SQL_INSERT = `
  INSERT INTO kg_entities (id, project_id, type, name, attributes_json, created_at, updated_at)
  VALUES (?, ?, 'inspiration', ?, ?, ?, ?)
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

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// ─── ID generation ──────────────────────────────────────────────────

/**
 * Generate a unique ID for a new inspiration entity.
 * Prefers crypto.randomUUID (Node 19+), falls back to timestamp-based.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `insp_${crypto.randomUUID()}`;
  }
  return `insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── factory ────────────────────────────────────────────────────────

export interface QuickCaptureDeps {
  db: DbLikeWithRun;
  /** Overridable clock for deterministic testing (P4). */
  nowMs?: () => number;
  /** Overridable ID generator for deterministic testing. */
  generateId?: () => string;
}

/**
 * Factory — consistent with storyStatusService / foreshadowingTracker pattern.
 *
 * @invariant INV-4: all data comes from SQLite structured queries; zero LLM calls.
 * @invariant INV-6: this is NOT a Skill — it's a structured data CRUD service.
 * @risk If 'inspiration' entity type is not yet added to the kg_entities CHECK
 *   constraint, queries return [] and inserts may fail — graceful degradation.
 */
export function createQuickCaptureService(
  deps: QuickCaptureDeps,
): QuickCaptureService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;
  const genId = deps.generateId ?? generateId;

  // Prepared statements — allocated once, reused per call.
  const stmtListUnused = db.prepare(SQL_LIST_UNUSED);
  const stmtAllInspirations = db.prepare(SQL_ALL_INSPIRATIONS);
  const stmtMarkUsed = db.prepare(SQL_MARK_USED);
  const stmtArchiveStale = db.prepare(SQL_ARCHIVE_STALE);
  const stmtInsert = db.prepare(SQL_INSERT);

  // Per-project caches for listUnused and getDecayStats.
  const unusedCache = new Map<string, CacheEntry<InspirationItem[]>>();
  const statsCache = new Map<string, CacheEntry<DecayStats>>();
  let disposed = false;

  // ── internal helpers ────────────────────────────────────────────

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("QuickCaptureService has been disposed");
    }
  }

  /**
   * Classify decay days into a tier.
   * Thresholds from engagement-engine.md §机制11:
   *   < 3d = fresh, 3-7d = reminder, 7-14d = fading, >= 14d = archived-tier.
   */
  function classifyDecayTier(decayDays: number, isArchived: boolean): DecayTier {
    if (isArchived) return "archived";
    if (decayDays < FRESH_MAX_DAYS) return "fresh";
    if (decayDays < REMINDER_MAX_DAYS) return "reminder";
    if (decayDays < FADING_MAX_DAYS) return "fading";
    // >= 14 days but not yet archived (hasn't been swept) — classify as fading
    // until archiveStale() runs. This avoids UI confusion where an item shows
    // "archived" tier but isn't actually archived in DB yet.
    return "fading";
  }

  function toItem(
    row: Record<string, unknown>,
    now: number,
  ): InspirationItem {
    // KG stores created_at as ISO 8601 text. Parse to epoch ms for arithmetic.
    const rawCreatedAt = row.created_at;
    const capturedAt =
      typeof rawCreatedAt === "string"
        ? new Date(rawCreatedAt).getTime()
        : (rawCreatedAt as number);

    const decayDays = Math.max(0, Math.floor((now - capturedAt) / DAY_MS));

    // Parse attributes_json for structured fields.
    let relatedEntities: string[] = [];
    let usedInChapter: string | null = null;
    let archived = false;

    if (row.attributes_json) {
      try {
        const attrs =
          typeof row.attributes_json === "string"
            ? (JSON.parse(row.attributes_json) as Record<string, unknown>)
            : (row.attributes_json as Record<string, unknown>);

        if (Array.isArray(attrs.relatedEntities)) {
          relatedEntities = attrs.relatedEntities.filter(
            (e): e is string => typeof e === "string",
          );
        }
        if (typeof attrs.usedInChapter === "string") {
          usedInChapter = attrs.usedInChapter;
        }
        if (attrs.archived === 1 || attrs.archived === true) {
          archived = true;
        }
      } catch {
        // Malformed JSON — degrade gracefully with defaults.
      }
    }

    const decayTier = classifyDecayTier(decayDays, archived);

    return {
      id: row.id as string,
      content: (row.name as string) ?? "",
      relatedEntities,
      capturedAt,
      usedInChapter,
      decayDays,
      decayTier,
      archived,
    };
  }

  function invalidateCaches(projectId: string): void {
    unusedCache.delete(projectId);
    statsCache.delete(projectId);
  }

  // ── public API ──────────────────────────────────────────────────

  const service: QuickCaptureService = {
    capture(projectId: string, content: string): InspirationItem {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }
      if (!content) {
        throw new Error("content is required");
      }

      const now = nowMs();
      const isoNow = new Date(now).toISOString();
      const id = genId();
      const attrs = JSON.stringify({ relatedEntities: [] });

      stmtInsert.run(id, projectId, content, attrs, isoNow, isoNow);

      // Invalidate caches after mutation.
      invalidateCaches(projectId);

      return {
        id,
        content,
        relatedEntities: [],
        capturedAt: now,
        usedInChapter: null,
        decayDays: 0,
        decayTier: "fresh",
        archived: false,
      };
    },

    listUnused(projectId: string): InspirationItem[] {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }

      // Cache check
      const cached = unusedCache.get(projectId);
      if (cached && nowMs() < cached.expiresAt) {
        return cached.data;
      }

      // Fresh query
      const now = nowMs();
      const rows = stmtListUnused.all(projectId) as Array<
        Record<string, unknown>
      >;
      const items = rows.map((r) => toItem(r, now));

      unusedCache.set(projectId, {
        data: items,
        expiresAt: now + CACHE_TTL_MS,
      });

      return items;
    },

    markUsed(
      projectId: string,
      entityId: string,
      chapterId: string,
    ): boolean {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }
      if (!entityId) {
        throw new Error("entityId is required");
      }
      if (!chapterId) {
        throw new Error("chapterId is required");
      }

      const isoNow = new Date(nowMs()).toISOString();
      const result = stmtMarkUsed.run(chapterId, isoNow, entityId, projectId);

      if (result.changes > 0) {
        invalidateCaches(projectId);
      }

      return result.changes > 0;
    },

    archiveStale(projectId: string): number {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }

      const now = nowMs();
      const isoNow = new Date(now).toISOString();
      // Cutoff: 14 days ago — anything created before this is stale.
      const cutoff = new Date(now - FADING_MAX_DAYS * DAY_MS).toISOString();

      const result = stmtArchiveStale.run(isoNow, projectId, cutoff);

      if (result.changes > 0) {
        invalidateCaches(projectId);
      }

      return result.changes;
    },

    getDecayStats(projectId: string): DecayStats {
      assertNotDisposed();

      if (!projectId) {
        throw new Error("projectId is required");
      }

      // Cache check
      const cached = statsCache.get(projectId);
      if (cached && nowMs() < cached.expiresAt) {
        return cached.data;
      }

      // Fresh query — get ALL inspirations and classify in JS.
      const now = nowMs();
      const rows = stmtAllInspirations.all(projectId) as Array<
        Record<string, unknown>
      >;

      let fresh = 0;
      let reminder = 0;
      let fading = 0;
      let archived = 0;

      for (const row of rows) {
        const item = toItem(row, now);
        // Used items don't count toward active decay tiers but are part of total.
        // Archived items count as archived regardless of other state.
        if (item.archived) {
          archived++;
        } else if (item.usedInChapter !== null) {
          // Used items are "consumed" — don't count in any decay tier.
          // They contribute to total only.
        } else {
          // Active, unused item — classify by decay.
          switch (item.decayTier) {
            case "fresh":
              fresh++;
              break;
            case "reminder":
              reminder++;
              break;
            case "fading":
              fading++;
              break;
            default:
              // Should not happen for non-archived items, but defensive.
              fading++;
          }
        }
      }

      const stats: DecayStats = {
        fresh,
        reminder,
        fading,
        archived,
        total: fresh + reminder + fading + archived,
      };

      statsCache.set(projectId, {
        data: stats,
        expiresAt: now + CACHE_TTL_MS,
      });

      return stats;
    },

    dispose(): void {
      disposed = true;
      unusedCache.clear();
      statsCache.clear();
    },
  };

  return service;
}
