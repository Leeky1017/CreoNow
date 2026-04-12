/**
 * @module trieCache
 * ## Responsibility: Cache Aho-Corasick automatons per project to avoid
 *    rebuilding the trie on every matchEntities() call.
 * ## Does NOT: modify the automaton build logic itself (that stays in entityMatcher.ts).
 * ## Dependency direction: entityMatcher → trieCache (trieCache is consumed by entityMatcher)
 * ## Key invariant: INV-2 — concurrent reads are safe because the cached reference
 *    is atomically swapped (JS single-threaded + reference assignment).
 *    Write-side invalidation deletes the entry; next read lazily rebuilds.
 * ## Performance constraint: 1000-entity build < 50ms; single match (10K chars) < 5ms.
 */

import type { MatchableEntity } from "./entityMatcher";

type AutomatonNode = {
  transitions: Map<string, number>;
  fail: number;
  outputs: PatternOutput[];
};

type PatternOutput = {
  entityId: string;
  matchedTerm: string;
  length: number;
};

export type CachedAutomaton = {
  nodes: AutomatonNode[];
  entityOrderById: Map<string, number>;
  /** Epoch timestamp of when the automaton was built — useful for diagnostics. */
  builtAt: number;
  /** Number of entities used to build this automaton. */
  entityCount: number;
};

/**
 * Project-scoped automaton cache.
 *
 * Why a plain Map and not WeakMap/LRU: KG projects are a bounded set (typically
 * 1–5 open projects). Memory pressure from caching a few tries is negligible
 * compared to the 50ms+ rebuild cost per call on 1000+ entities.
 */
const cache = new Map<string, CachedAutomaton>();

/**
 * Retrieve a cached automaton for `projectId`, or build + cache a new one.
 *
 * @param projectId — scoping key
 * @param entities — full entity list for the project (only `when_detected`
 *   entries are actually inserted into the automaton by buildAutomaton)
 * @param buildFn — the actual automaton builder (injected to avoid circular deps)
 *
 * @invariant INV-2 — read path is safe for concurrent callers because:
 *   1. JS is single-threaded, so Map.get + Map.set are atomic w.r.t. each other.
 *   2. The built automaton is a frozen-in-place snapshot: no mutation after construction.
 */
export function getOrBuildCachedAutomaton(
  projectId: string,
  entities: MatchableEntity[],
  buildFn: (entities: MatchableEntity[]) => {
    nodes: AutomatonNode[];
    entityOrderById: Map<string, number>;
  },
): CachedAutomaton {
  const existing = cache.get(projectId);
  if (existing) {
    return existing;
  }

  const { nodes, entityOrderById } = buildFn(entities);
  const built: CachedAutomaton = {
    nodes,
    entityOrderById,
    builtAt: Date.now(),
    entityCount: entities.length,
  };

  cache.set(projectId, built);
  return built;
}

/**
 * Invalidate the trie cache for a specific project, or all projects.
 *
 * Called after entity CRUD operations so the next matchEntities() call
 * rebuilds with fresh data.
 *
 * @invariant INV-2 — Map.delete is atomic in single-threaded JS.
 *   Concurrent readers either see the old cached value or miss and rebuild.
 */
export function trieCacheInvalidate(projectId?: string): void {
  if (projectId === undefined) {
    cache.clear();
    return;
  }
  cache.delete(projectId);
}

/**
 * Return the number of cached automatons. Useful for test assertions.
 */
export function trieCacheSize(): number {
  return cache.size;
}

/**
 * Check whether a cached automaton exists for the given project.
 */
export function trieCacheHas(projectId: string): boolean {
  return cache.has(projectId);
}
