import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import {
  matchEntities,
  matchEntitiesCached,
  type MatchableEntity,
} from "../../../main/src/services/kg/entityMatcher";
import {
  trieCacheInvalidate,
  trieCacheHas,
} from "../../../main/src/services/kg/trieCache";

function createEntity(
  id: string,
  name: string,
  aliases: string[] = [],
): MatchableEntity {
  return { id, name, aliases, aiContextLevel: "when_detected" };
}

function measureMs(fn: () => void): number {
  const startedAt = performance.now();
  fn();
  return performance.now() - startedAt;
}

function medianMs(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

// Reset global cache
trieCacheInvalidate();

// Benchmark B1: 1000-entity trie full build should be < 50ms
//
// Why 50ms: spec requirement. Aho-Corasick trie build is O(total_pattern_chars),
// and 1000 entities × ~6 chars/name ≈ 10K chars — well within budget.
{
  const entities: MatchableEntity[] = Array.from(
    { length: 1000 },
    (_, i) =>
      createEntity(`e-${i}`, `角色名称${i}`, [
        `别名A${i}`,
        `别名B${i}`,
      ]),
  );

  // Warm up JIT
  matchEntities("warmup", entities);

  const samples: number[] = [];
  for (let round = 0; round < 5; round += 1) {
    samples.push(measureMs(() => matchEntities("dummy text", entities)));
  }

  const buildMedian = medianMs(samples);
  assert.equal(
    buildMedian < 50,
    true,
    `B1: 1000-entity trie build median=${buildMedian.toFixed(2)}ms exceeds 50ms budget`,
  );
  console.log(`B1: 1000-entity build median=${buildMedian.toFixed(2)}ms (budget: <50ms)`);
}

// Benchmark B2: single text match on 10,000-char text should be < 5ms (cached)
//
// Why 5ms: spec requirement. After cache hit, only the linear scan runs.
// Aho-Corasick scan is O(text_length + matches), independent of entity count.
{
  trieCacheInvalidate();

  const entities: MatchableEntity[] = Array.from(
    { length: 1000 },
    (_, i) =>
      createEntity(`e-${i}`, `角色${i}`, [`别名${i}`]),
  );

  // Generate 10K-char Chinese text with some entity names embedded
  const baseText = "天地玄黄宇宙洪荒日月盈昃辰宿列张";
  const textChunks: string[] = [];
  let totalLength = 0;
  let chunkIndex = 0;
  while (totalLength < 10_000) {
    // Embed entity references every ~200 chars
    if (chunkIndex % 6 === 0 && chunkIndex < 1000) {
      const entityRef = `角色${chunkIndex}`;
      textChunks.push(entityRef);
      totalLength += entityRef.length;
    }
    textChunks.push(baseText);
    totalLength += baseText.length;
    chunkIndex += 1;
  }
  const text = textChunks.join("").slice(0, 10_000);
  assert.equal(text.length, 10_000);

  // Prime the cache
  matchEntitiesCached(text, entities, "bench-b2");
  assert.equal(trieCacheHas("bench-b2"), true);

  const samples: number[] = [];
  for (let round = 0; round < 10; round += 1) {
    samples.push(
      measureMs(() => matchEntitiesCached(text, entities, "bench-b2")),
    );
  }

  const scanMedian = medianMs(samples);
  assert.equal(
    scanMedian < 5,
    true,
    `B2: 10K-char cached match median=${scanMedian.toFixed(2)}ms exceeds 5ms budget`,
  );
  console.log(`B2: 10K-char cached scan median=${scanMedian.toFixed(2)}ms (budget: <5ms)`);
}

// Benchmark B3: full invalidation → lazy rebuild cycle (1000 entities) < 50ms
//
// This measures the *absolute* end-to-end cost a user would experience after a
// CRUD operation: invalidate the stale cache entry, then call
// matchEntitiesCached() which triggers a lazy rebuild of the 1000-entity trie
// plus a linear scan.  The 50ms budget matches the spec performance target.
{
  trieCacheInvalidate();

  const entities: MatchableEntity[] = Array.from(
    { length: 1000 },
    (_, i) =>
      createEntity(`e-${i}`, `角色名称${i}`, [`别名A${i}`, `别名B${i}`]),
  );
  const text = "天地玄黄宇宙洪荒".repeat(200);

  // Measure full cycle: prime cache → invalidate → rebuild via matchEntitiesCached
  const cycleSamples: number[] = [];
  for (let round = 0; round < 10; round += 1) {
    const projId = `bench-b3-${round}`;
    // Prime
    matchEntitiesCached(text, entities, projId);
    assert.equal(trieCacheHas(projId), true, "cache primed");

    // Full cycle: invalidate + lazy rebuild (includes trie construction + scan)
    cycleSamples.push(
      measureMs(() => {
        trieCacheInvalidate(projId);
        matchEntitiesCached(text, entities, projId);
      }),
    );
    assert.equal(trieCacheHas(projId), true, "cache rebuilt after invalidation");
  }

  const cycleMedian = medianMs(cycleSamples);

  // Primary assertion: absolute cycle time < 50ms (spec target)
  assert.equal(
    cycleMedian < 50,
    true,
    `B3: 1000-entity invalidation+rebuild cycle median=${cycleMedian.toFixed(2)}ms exceeds 50ms budget`,
  );

  // Secondary: measure overhead vs raw uncached build for diagnostics
  const baselineSamples: number[] = [];
  for (let round = 0; round < 10; round += 1) {
    baselineSamples.push(measureMs(() => matchEntities(text, entities)));
  }
  const baselineMedian = medianMs(baselineSamples);
  const overhead = cycleMedian - baselineMedian;

  console.log(
    `B3: 1000-entity invalidation+rebuild cycle median=${cycleMedian.toFixed(2)}ms (budget: <50ms) | overhead vs uncached=${overhead.toFixed(4)}ms baseline=${baselineMedian.toFixed(2)}ms`,
  );
}

// Benchmark B4: cached vs uncached speedup factor
//
// Why: validates the cache actually provides meaningful speedup on the hot path.
// Expected: cached calls should be >= 3x faster than uncached for 1000 entities.
{
  trieCacheInvalidate();

  const entities: MatchableEntity[] = Array.from(
    { length: 1000 },
    (_, i) =>
      createEntity(`e-${i}`, `角色名称${i}`, [`别名A${i}`, `别名B${i}`]),
  );

  const text = "天地玄黄宇宙洪荒".repeat(200);

  // Warm up both paths
  matchEntities(text, entities);
  matchEntitiesCached(text, entities, "bench-b4");

  const uncachedSamples: number[] = [];
  const cachedSamples: number[] = [];

  for (let round = 0; round < 7; round += 1) {
    uncachedSamples.push(measureMs(() => matchEntities(text, entities)));
    cachedSamples.push(
      measureMs(() => matchEntitiesCached(text, entities, "bench-b4")),
    );
  }

  const uncachedMedian = medianMs(uncachedSamples);
  const cachedMedian = medianMs(cachedSamples);
  const speedup = uncachedMedian / Math.max(cachedMedian, 0.001);

  assert.equal(
    speedup >= 3,
    true,
    `B4: expected >= 3x speedup, got ${speedup.toFixed(1)}x (uncached=${uncachedMedian.toFixed(2)}ms cached=${cachedMedian.toFixed(2)}ms)`,
  );
  console.log(
    `B4: speedup=${speedup.toFixed(1)}x (uncached=${uncachedMedian.toFixed(2)}ms cached=${cachedMedian.toFixed(2)}ms)`,
  );
}

// Cleanup
trieCacheInvalidate();

console.log("trie-cache-benchmark.test.ts: all assertions passed");
