/**
 * @module worldScaleService
 * ## Responsibilities: Aggregate project world-scale metrics from SQLite/KG.
 * ## Does not do: LLM calls, IPC registration, UI rendering, milestone storage.
 * ## Dependency direction: DB layer only.
 * ## Invariants: INV-4 (Memory-First structured data path, no LLM).
 * ## Performance: getWorldScale() <= 50ms in normal project size; 30s TTL cache.
 */

import type { DbLike } from "./dbTypes";

export interface WorldScale {
  readonly totalWords: number;
  readonly characters: number;
  readonly relations: number;
  readonly locations: number;
  readonly foreshadowings: {
    readonly total: number;
    readonly resolved: number;
  };
  readonly chapters: number;
}

export interface WorldScaleService {
  getWorldScale(projectId: string): WorldScale;
  invalidateCache(projectId: string): void;
  dispose(): void;
}

interface CacheEntry {
  data: WorldScale;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

const EMPTY_WORLD_SCALE: WorldScale = Object.freeze({
  totalWords: 0,
  characters: 0,
  relations: 0,
  locations: 0,
  foreshadowings: Object.freeze({ total: 0, resolved: 0 }),
  chapters: 0,
});

const SQL_DOC_AGG = `
  SELECT
    COALESCE(SUM(word_count), 0) AS total_words,
    COUNT(CASE WHEN type = 'chapter' THEN 1 END) AS chapter_count
  FROM documents
  WHERE project_id = ?
`;

const SQL_ENTITY_AGG = `
  SELECT
    COUNT(CASE WHEN type = 'character' THEN 1 END) AS character_count,
    COUNT(CASE WHEN type = 'location' THEN 1 END) AS location_count,
    COUNT(CASE WHEN type = 'foreshadowing' THEN 1 END) AS foreshadowing_total,
    COUNT(
      CASE
        WHEN type = 'foreshadowing'
         AND json_extract(attributes_json, '$.resolved') = 1
        THEN 1
      END
    ) AS foreshadowing_resolved
  FROM kg_entities
  WHERE project_id = ?
`;

const SQL_RELATION_AGG = `
  SELECT COUNT(*) AS relation_count
  FROM kg_relations
  WHERE project_id = ?
`;

function asCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

export interface WorldScaleServiceDeps {
  db: DbLike;
  nowMs?: () => number;
}

export function createWorldScaleService(
  deps: WorldScaleServiceDeps,
): WorldScaleService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;

  const stmtDocAgg = db.prepare(SQL_DOC_AGG);
  const stmtEntityAgg = db.prepare(SQL_ENTITY_AGG);
  const stmtRelationAgg = db.prepare(SQL_RELATION_AGG);

  const cache = new Map<string, CacheEntry>();
  let disposed = false;

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("WorldScaleService has been disposed");
    }
  }

  const service: WorldScaleService = {
    getWorldScale(projectId: string): WorldScale {
      assertNotDisposed();
      if (!projectId) {
        throw new Error("projectId is required");
      }

      const cached = cache.get(projectId);
      const now = nowMs();
      if (cached && now < cached.expiresAt) {
        return cached.data;
      }

      const docAgg = (stmtDocAgg.get(projectId) ?? {}) as Record<string, unknown>;
      const entityAgg = (stmtEntityAgg.get(projectId) ?? {}) as Record<
        string,
        unknown
      >;
      const relationAgg = (stmtRelationAgg.get(projectId) ?? {}) as Record<
        string,
        unknown
      >;

      const next: WorldScale = {
        totalWords: asCount(docAgg.total_words),
        chapters: asCount(docAgg.chapter_count),
        characters: asCount(entityAgg.character_count),
        locations: asCount(entityAgg.location_count),
        relations: asCount(relationAgg.relation_count),
        foreshadowings: {
          total: asCount(entityAgg.foreshadowing_total),
          resolved: asCount(entityAgg.foreshadowing_resolved),
        },
      };

      cache.set(projectId, {
        data: next,
        expiresAt: now + CACHE_TTL_MS,
      });

      return next;
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

export function emptyWorldScale(): WorldScale {
  return EMPTY_WORLD_SCALE;
}
