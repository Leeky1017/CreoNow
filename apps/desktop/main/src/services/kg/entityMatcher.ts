/**
 * @module entityMatcher
 * ## Responsibilities
 * Aho-Corasick trie-based entity matching for Retrieved-layer context injection.
 * Maintains a per-project in-memory trie cache to avoid full rebuilds on every
 * context assembly pass.  Exposes deterministic, synchronous pattern matching
 * plus incremental CRUD helpers (prime / upsert / remove / invalidate).
 *
 * ## Boundary (what this module does NOT do)
 * - Does NOT persist trie state — it is a pure in-memory acceleration layer.
 * - Does NOT call LLM or modify documents (INV-6 boundary).
 * - Does NOT handle token estimation or context budget (see context/ layer).
 *
 * ## Dependency direction
 * Allowed: kgService types (import type only).
 * Forbidden: ipc/, renderer/, db/ (accessed via service callers).
 *
 * ## Invariants
 * - INV-2: updates are synchronous per cache key — reads always observe a
 *   complete trie snapshot.
 * - INV-4: KG + FTS5 remain the primary retrieval path; this module accelerates
 *   the entity-detection step within that path.
 */
import type { AiContextLevel } from "./kgService";

export type MatchableEntity = {
  id: string;
  name: string;
  aliases: string[];
  aiContextLevel: AiContextLevel;
};

export type MatchResult = {
  entityId: string;
  matchedTerm: string;
  position: number;
};

type PatternOutput = {
  entityId: string;
  matchedTerm: string;
  length: number;
};

type AutomatonNode = {
  transitions: Map<string, number>;
  fail: number;
  directOutputs: PatternOutput[];
  outputs: PatternOutput[];
};

type MatchEntitiesOptions = {
  cacheKey?: string;
};

type CachedEntityPatternSet = {
  entityId: string;
  terms: string[];
};

type TrieState = {
  nodes: AutomatonNode[];
  freeIndices: number[];
  entityOrderById: Map<string, number>;
  entitiesById: Map<string, CachedEntityPatternSet>;
};

const DEFAULT_TRIE_CACHE_KEY = "__default__";

// Frozen to prevent accidental mutation by callers (.push() would corrupt a shared singleton).
const EMPTY_MATCH_RESULTS: MatchResult[] = Object.freeze(
  [] as MatchResult[],
) as MatchResult[];

/**
 * Trie cache for Aho-Corasick matcher.
 *
 * @why Keep automaton in-memory per project scope to avoid rebuilding on each
 * query and support incremental entity CRUD updates.
 * @invariant INV-2 — updates are applied synchronously per cache key so reads
 * always observe a complete trie snapshot.
 */
class TrieCache {
  private readonly stateByKey = new Map<string, TrieState>();

  match(args: {
    text: string;
    entities: MatchableEntity[];
    cacheKey?: string;
  }): MatchResult[] {
    if (args.text.length === 0 || args.entities.length === 0) {
      return EMPTY_MATCH_RESULTS;
    }

    const key = args.cacheKey ?? DEFAULT_TRIE_CACHE_KEY;
    const state = this.getOrCreateState(key);
    this.syncEntities(state, args.entities);
    if (state.nodes.length === 1) {
      return EMPTY_MATCH_RESULTS;
    }

    return runMatch({
      text: args.text,
      nodes: state.nodes,
      entityOrderById: state.entityOrderById,
    });
  }

  prime(args: { cacheKey: string; entities: MatchableEntity[] }): void {
    const state = this.getOrCreateState(args.cacheKey);
    this.syncEntities(state, args.entities);
  }

  upsert(args: { cacheKey: string; entity: MatchableEntity }): void {
    const state = this.getOrCreateState(args.cacheKey);
    const next = toCachedEntityPatternSet(args.entity);
    const previous = state.entitiesById.get(args.entity.id);

    if (!next) {
      if (previous) {
        this.removeEntityPatterns(state, previous);
        state.entitiesById.delete(args.entity.id);
        rebuildFailureLinks(state.nodes);
      }
      return;
    }

    if (!previous) {
      this.addEntityPatterns(state, next);
      state.entitiesById.set(next.entityId, next);
      if (!state.entityOrderById.has(next.entityId)) {
        state.entityOrderById.set(next.entityId, state.entityOrderById.size);
      }
      rebuildFailureLinks(state.nodes);
      return;
    }

    if (sameTerms(previous.terms, next.terms)) {
      return;
    }

    this.removeEntityPatterns(state, previous);
    this.addEntityPatterns(state, next);
    state.entitiesById.set(next.entityId, next);
    rebuildFailureLinks(state.nodes);
  }

  remove(args: { cacheKey: string; entityId: string }): void {
    const state = this.stateByKey.get(args.cacheKey);
    if (!state) {
      return;
    }

    const previous = state.entitiesById.get(args.entityId);
    if (!previous) {
      return;
    }

    this.removeEntityPatterns(state, previous);
    state.entitiesById.delete(args.entityId);
    state.entityOrderById = rebuildEntityOrder(state.entitiesById);
    rebuildFailureLinks(state.nodes);
  }

  invalidate(cacheKey?: string): void {
    if (cacheKey) {
      this.stateByKey.delete(cacheKey);
      return;
    }
    this.stateByKey.clear();
  }

  private getOrCreateState(cacheKey: string): TrieState {
    const existing = this.stateByKey.get(cacheKey);
    if (existing) {
      return existing;
    }

    const created: TrieState = {
      nodes: [createNode()],
      freeIndices: [],
      entityOrderById: new Map(),
      entitiesById: new Map(),
    };
    this.stateByKey.set(cacheKey, created);
    return created;
  }

  private syncEntities(state: TrieState, entities: MatchableEntity[]): void {
    const nextById = new Map<string, CachedEntityPatternSet>();
    const order: string[] = [];

    for (const entity of entities) {
      const normalized = toCachedEntityPatternSet(entity);
      if (!normalized) {
        continue;
      }
      const existing = nextById.get(normalized.entityId);
      if (existing) {
        existing.terms = mergeTerms(existing.terms, normalized.terms);
        continue;
      }
      nextById.set(normalized.entityId, normalized);
      order.push(normalized.entityId);
    }

    let mutated = false;

    for (const [entityId, existing] of state.entitiesById.entries()) {
      if (nextById.has(entityId)) {
        continue;
      }
      this.removeEntityPatterns(state, existing);
      mutated = true;
    }

    for (const [entityId, next] of nextById.entries()) {
      const existing = state.entitiesById.get(entityId);
      if (!existing) {
        this.addEntityPatterns(state, next);
        mutated = true;
        continue;
      }

      if (sameTerms(existing.terms, next.terms)) {
        continue;
      }

      this.removeEntityPatterns(state, existing);
      this.addEntityPatterns(state, next);
      mutated = true;
    }

    state.entitiesById = nextById;
    state.entityOrderById = new Map(
      order.map((entityId, index) => [entityId, index]),
    );

    if (mutated) {
      rebuildFailureLinks(state.nodes);
    }
  }

  private addEntityPatterns(
    state: TrieState,
    entityPatternSet: CachedEntityPatternSet,
  ): void {
    for (const term of entityPatternSet.terms) {
      addPattern(state, {
        entityId: entityPatternSet.entityId,
        matchedTerm: term,
        length: term.length,
      });
    }
  }

  private removeEntityPatterns(
    state: TrieState,
    entityPatternSet: CachedEntityPatternSet,
  ): void {
    for (const term of entityPatternSet.terms) {
      removePattern(state, {
        entityId: entityPatternSet.entityId,
        matchedTerm: term,
      });
    }
  }
}

const sharedTrieCache = new TrieCache();

/**
 * Match detected entity references from raw text for Retrieved-layer injection.
 *
 * Why: Context fetchers need deterministic, synchronous reference detection
 * without relying on async LLM recognition.
 */
export function matchEntities(
  text: string,
  entities: MatchableEntity[],
  options?: MatchEntitiesOptions,
): MatchResult[] {
  return sharedTrieCache.match({
    text,
    entities,
    cacheKey: options?.cacheKey,
  });
}

export function trieCachePrime(args: {
  cacheKey: string;
  entities: MatchableEntity[];
}): void {
  sharedTrieCache.prime(args);
}

export function trieCacheUpsertEntity(args: {
  cacheKey: string;
  entity: MatchableEntity;
}): void {
  sharedTrieCache.upsert(args);
}

export function trieCacheRemoveEntity(args: {
  cacheKey: string;
  entityId: string;
}): void {
  sharedTrieCache.remove(args);
}

export function trieCacheInvalidate(cacheKey?: string): void {
  sharedTrieCache.invalidate(cacheKey);
}

function addPattern(state: TrieState, output: PatternOutput): void {
  let currentState = 0;
  for (let index = 0; index < output.matchedTerm.length; index += 1) {
    const character = output.matchedTerm[index]!;
    const next = state.nodes[currentState].transitions.get(character);
    if (next !== undefined) {
      currentState = next;
      continue;
    }

    const created = allocateNodeIndex(state);
    state.nodes[currentState].transitions.set(character, created);
    currentState = created;
  }
  if (
    state.nodes[currentState].directOutputs.some(
      (existing) =>
        existing.entityId === output.entityId &&
        existing.matchedTerm === output.matchedTerm,
    )
  ) {
    return;
  }
  state.nodes[currentState].directOutputs.push(output);
}

function removePattern(
  state: TrieState,
  args: { entityId: string; matchedTerm: string },
): void {
  // Walk down recording the path so we can prune orphaned nodes afterwards.
  const path: { parentIndex: number; character: string; childIndex: number }[] =
    [];
  let currentState = 0;
  for (let index = 0; index < args.matchedTerm.length; index += 1) {
    const character = args.matchedTerm[index]!;
    const next = state.nodes[currentState].transitions.get(character);
    if (next === undefined) {
      return;
    }
    path.push({ parentIndex: currentState, character, childIndex: next });
    currentState = next;
  }

  state.nodes[currentState].directOutputs = state.nodes[
    currentState
  ].directOutputs.filter(
    (output) =>
      !(
        output.entityId === args.entityId &&
        output.matchedTerm === args.matchedTerm
      ),
  );

  // Walk back up and prune nodes that have become orphaned (no directOutputs
  // AND no remaining transitions).  This prevents memory leaks during long
  // writing sessions with frequent entity CRUD.
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const { parentIndex, character, childIndex } = path[i]!;
    const child = state.nodes[childIndex];
    if (child.directOutputs.length > 0 || child.transitions.size > 0) {
      break;
    }
    state.nodes[parentIndex].transitions.delete(character);
    recycleNodeIndex(state, childIndex);
  }
}

function rebuildFailureLinks(nodes: AutomatonNode[]): void {
  const visited = new Set<number>([0]);
  nodes[0].fail = 0;
  nodes[0].outputs = nodes[0].directOutputs.slice();
  const queue: number[] = [];
  for (const nextState of nodes[0].transitions.values()) {
    nodes[nextState].fail = 0;
    nodes[nextState].outputs = nodes[nextState].directOutputs.slice();
    visited.add(nextState);
    queue.push(nextState);
  }

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const state = queue[queueIndex]!;

    for (const [character, nextState] of nodes[state].transitions.entries()) {
      if (!visited.has(nextState)) {
        nodes[nextState].outputs = nodes[nextState].directOutputs.slice();
        visited.add(nextState);
        queue.push(nextState);
      }

      let failureState = nodes[state].fail;
      while (
        failureState !== 0 &&
        !nodes[failureState].transitions.has(character)
      ) {
        failureState = nodes[failureState].fail;
      }

      const fallback = nodes[failureState].transitions.get(character);
      nodes[nextState].fail = fallback === undefined ? 0 : fallback;

      if (nodes[nodes[nextState].fail].outputs.length > 0) {
        const merged = nodes[nextState].outputs.concat(
          nodes[nodes[nextState].fail].outputs,
        );
        nodes[nextState].outputs = dedupeOutputs(merged);
      }
    }
  }
}

function allocateNodeIndex(state: TrieState): number {
  const recycled = state.freeIndices.pop();
  if (recycled !== undefined) {
    state.nodes[recycled] = createNode();
    return recycled;
  }
  state.nodes.push(createNode());
  return state.nodes.length - 1;
}

function recycleNodeIndex(state: TrieState, index: number): void {
  if (index === 0) {
    return;
  }
  state.nodes[index] = createNode();
  state.freeIndices.push(index);
}

function runMatch(args: {
  text: string;
  nodes: AutomatonNode[];
  entityOrderById: Map<string, number>;
}): MatchResult[] {
  const bestMatchesByEntityId = new Map<string, MatchResult>();
  let state = 0;

  for (let index = 0; index < args.text.length; index += 1) {
    const character = args.text[index]!;

    while (state !== 0 && !args.nodes[state].transitions.has(character)) {
      state = args.nodes[state].fail;
    }

    const transitionedState = args.nodes[state].transitions.get(character);
    state = transitionedState === undefined ? 0 : transitionedState;

    if (args.nodes[state].outputs.length === 0) {
      continue;
    }

    for (const output of args.nodes[state].outputs) {
      const position = index - output.length + 1;
      const existing = bestMatchesByEntityId.get(output.entityId);

      if (
        existing &&
        (position > existing.position ||
          (position === existing.position &&
            output.matchedTerm.length <= existing.matchedTerm.length))
      ) {
        continue;
      }

      bestMatchesByEntityId.set(output.entityId, {
        entityId: output.entityId,
        matchedTerm: output.matchedTerm,
        position,
      });
    }
  }

  return [...bestMatchesByEntityId.values()].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    if (left.matchedTerm.length !== right.matchedTerm.length) {
      return right.matchedTerm.length - left.matchedTerm.length;
    }
    return (
      (args.entityOrderById.get(left.entityId) ?? Number.MAX_SAFE_INTEGER) -
      (args.entityOrderById.get(right.entityId) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function toCachedEntityPatternSet(
  entity: MatchableEntity,
): CachedEntityPatternSet | null {
  if (entity.aiContextLevel !== "when_detected") {
    return null;
  }

  const terms: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [entity.name, ...entity.aliases]) {
    const normalized = candidate.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    terms.push(normalized);
  }

  if (terms.length === 0) {
    return null;
  }

  return {
    entityId: entity.id,
    terms,
  };
}

function dedupeOutputs(outputs: PatternOutput[]): PatternOutput[] {
  const deduped: PatternOutput[] = [];
  const seen = new Set<string>();
  for (const output of outputs) {
    const key = `${output.entityId}::${output.matchedTerm}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(output);
  }
  return deduped;
}

function sameTerms(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  for (const term of right) {
    if (!leftSet.has(term)) {
      return false;
    }
  }
  return true;
}

function mergeTerms(left: string[], right: string[]): string[] {
  const merged = [...left];
  const seen = new Set(left);
  for (const term of right) {
    if (seen.has(term)) {
      continue;
    }
    seen.add(term);
    merged.push(term);
  }
  return merged;
}

function rebuildEntityOrder(
  entitiesById: Map<string, CachedEntityPatternSet>,
): Map<string, number> {
  return new Map(
    Array.from(entitiesById.keys()).map((entityId, index) => [entityId, index]),
  );
}

function createNode(): AutomatonNode {
  return {
    transitions: new Map<string, number>(),
    fail: 0,
    directOutputs: [],
    outputs: [],
  };
}
