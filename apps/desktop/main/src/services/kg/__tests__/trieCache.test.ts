import assert from "node:assert/strict";

import {
  getOrBuildCachedAutomaton,
  trieCacheInvalidate,
  trieCacheSize,
  trieCacheHas,
} from "../trieCache";
import {
  matchEntities,
  matchEntitiesCached,
  type MatchableEntity,
} from "../entityMatcher";
import type { AiContextLevel } from "../kgService";

function createEntity(args: {
  id: string;
  name: string;
  aliases?: string[];
  aiContextLevel?: AiContextLevel;
}): MatchableEntity {
  return {
    id: args.id,
    name: args.name,
    aliases: args.aliases ?? [],
    aiContextLevel: args.aiContextLevel ?? "when_detected",
  };
}

// Reset cache between each scenario block
function resetCache(): void {
  trieCacheInvalidate();
  assert.equal(trieCacheSize(), 0, "cache should be empty after full invalidate");
}

// Scenario TC-S1: cache miss → build → cache hit
{
  resetCache();

  const entities = [
    createEntity({ id: "e-1", name: "林远" }),
    createEntity({ id: "e-2", name: "张薇" }),
  ];
  const text = "林远和张薇在长安城相遇。";

  assert.equal(trieCacheHas("proj-1"), false);

  const results1 = matchEntitiesCached(text, entities, "proj-1");
  assert.equal(trieCacheHas("proj-1"), true, "cache entry created after first call");
  assert.equal(results1.length, 2);

  // Second call should hit cache (same results, no rebuild)
  const results2 = matchEntitiesCached(text, entities, "proj-1");
  assert.deepEqual(results2, results1, "cached results identical to first call");
}

// Scenario TC-S2: project-scoped isolation
{
  resetCache();

  const entitiesA = [createEntity({ id: "e-a1", name: "角色A" })];
  const entitiesB = [createEntity({ id: "e-b1", name: "角色B" })];
  const text = "角色A和角色B";

  matchEntitiesCached(text, entitiesA, "proj-A");
  matchEntitiesCached(text, entitiesB, "proj-B");

  assert.equal(trieCacheSize(), 2, "two project caches");
  assert.equal(trieCacheHas("proj-A"), true);
  assert.equal(trieCacheHas("proj-B"), true);

  trieCacheInvalidate("proj-A");
  assert.equal(trieCacheHas("proj-A"), false, "proj-A invalidated");
  assert.equal(trieCacheHas("proj-B"), true, "proj-B untouched");
}

// Scenario TC-S3: invalidation causes rebuild with new data
{
  resetCache();

  const entities1 = [createEntity({ id: "e-1", name: "林远" })];
  const text = "林远和张薇在长安城相遇。";

  const results1 = matchEntitiesCached(text, entities1, "proj-1");
  assert.equal(results1.length, 1);
  assert.equal(results1[0]?.matchedTerm, "林远");

  trieCacheInvalidate("proj-1");

  // Now add a new entity and rebuild via cache
  const entities2 = [
    createEntity({ id: "e-1", name: "林远" }),
    createEntity({ id: "e-2", name: "张薇" }),
  ];

  const results2 = matchEntitiesCached(text, entities2, "proj-1");
  assert.equal(results2.length, 2, "rebuilt cache includes new entity");
}

// Scenario TC-S4: full invalidation clears all projects
{
  resetCache();

  matchEntitiesCached("test", [createEntity({ id: "e-1", name: "test" })], "proj-1");
  matchEntitiesCached("test", [createEntity({ id: "e-2", name: "test" })], "proj-2");
  matchEntitiesCached("test", [createEntity({ id: "e-3", name: "test" })], "proj-3");

  assert.equal(trieCacheSize(), 3);

  trieCacheInvalidate();
  assert.equal(trieCacheSize(), 0, "all caches cleared");
}

// Scenario TC-S5: empty entities → no cache entry created
{
  resetCache();

  const results = matchEntitiesCached("some text", [], "proj-empty");
  assert.equal(results.length, 0);
  assert.equal(trieCacheHas("proj-empty"), false, "no cache for empty entity list");
}

// Scenario TC-S6: empty text → no cache entry created
{
  resetCache();

  const entities = [createEntity({ id: "e-1", name: "test" })];
  const results = matchEntitiesCached("", entities, "proj-empty-text");
  assert.equal(results.length, 0);
  assert.equal(trieCacheHas("proj-empty-text"), false, "no cache for empty text");
}

// Scenario TC-S7: matchEntities (uncached) still works correctly
{
  const entities = [
    createEntity({ id: "e-1", name: "林远" }),
    createEntity({ id: "e-2", name: "长安城" }),
  ];
  const text = "林远在长安城。";

  const results = matchEntities(text, entities);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.matchedTerm, "林远");
  assert.equal(results[1]?.matchedTerm, "长安城");
}

// Scenario TC-S8: cached and uncached produce identical results
{
  resetCache();

  const entities = [
    createEntity({ id: "e-1", name: "林远", aliases: ["小远", "阿远"] }),
    createEntity({ id: "e-2", name: "长安城", aliases: ["长安"] }),
    createEntity({ id: "e-3", name: "旁白", aiContextLevel: "always" }),
  ];
  const text = "林远推开门，小远回头看向长安城。";

  const uncachedResults = matchEntities(text, entities);
  const cachedResults = matchEntitiesCached(text, entities, "proj-parity");

  assert.deepEqual(cachedResults, uncachedResults, "cached ≡ uncached");
}

// Scenario TC-S9: getOrBuildCachedAutomaton calls buildFn only on cache miss
{
  resetCache();

  let buildCallCount = 0;
  const fakeBuild = (_entities: MatchableEntity[]) => {
    buildCallCount += 1;
    return { nodes: [{ transitions: new Map(), fail: 0, outputs: [] }], entityOrderById: new Map() };
  };

  const entities = [createEntity({ id: "e-1", name: "test" })];

  getOrBuildCachedAutomaton("proj-counter", entities, fakeBuild);
  assert.equal(buildCallCount, 1, "first call builds");

  getOrBuildCachedAutomaton("proj-counter", entities, fakeBuild);
  assert.equal(buildCallCount, 1, "second call hits cache, no rebuild");

  trieCacheInvalidate("proj-counter");
  getOrBuildCachedAutomaton("proj-counter", entities, fakeBuild);
  assert.equal(buildCallCount, 2, "after invalidation, rebuilds");
}

// Scenario TC-S10: concurrent reads around invalidation boundaries
//
// Why (Finding #6): In JS, the event loop is single-threaded so true data races
// are impossible, but we need to verify that interleaved sync operations —
// read → invalidate → read — behave correctly: a reader that starts before
// invalidation sees the old cache, and a reader after invalidation triggers
// a fresh rebuild with whatever entities are passed in.
{
  resetCache();

  const entitiesV1 = [createEntity({ id: "e-1", name: "林远" })];
  const entitiesV2 = [
    createEntity({ id: "e-1", name: "林远" }),
    createEntity({ id: "e-2", name: "张薇" }),
  ];
  const text = "林远和张薇在长安城相遇。";

  // Build initial cache with V1 entities
  const resultsPreInvalidate = matchEntitiesCached(text, entitiesV1, "proj-concurrent");
  assert.equal(resultsPreInvalidate.length, 1, "V1 has 1 match");
  assert.equal(trieCacheHas("proj-concurrent"), true);

  // Simulate interleaved operations: read (cache hit) → invalidate → read (cache miss → rebuild)
  const resultsStillCached = matchEntitiesCached(text, entitiesV1, "proj-concurrent");
  assert.equal(resultsStillCached.length, 1, "still V1 before invalidation");

  trieCacheInvalidate("proj-concurrent");
  assert.equal(trieCacheHas("proj-concurrent"), false, "cache cleared");

  // Next read with V2 entities should rebuild and see both entities
  const resultsAfterRebuild = matchEntitiesCached(text, entitiesV2, "proj-concurrent");
  assert.equal(resultsAfterRebuild.length, 2, "V2 sees both entities after rebuild");
  assert.equal(trieCacheHas("proj-concurrent"), true, "cache repopulated");

  // Verify that multiple rapid reads after rebuild all return the same V2 results
  for (let i = 0; i < 5; i += 1) {
    const repeatedResults = matchEntitiesCached(text, entitiesV2, "proj-concurrent");
    assert.deepEqual(repeatedResults, resultsAfterRebuild, `repeated read ${i} consistent`);
  }
}

// Cleanup
resetCache();

console.log("trieCache.test.ts: all assertions passed");
