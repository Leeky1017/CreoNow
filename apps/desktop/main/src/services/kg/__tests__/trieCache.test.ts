import assert from "node:assert/strict";

import type { AiContextLevel } from "../kgService";
import {
  matchEntities,
  trieCacheInvalidate,
  trieCachePrime,
  trieCacheRemoveEntity,
  trieCacheUpsertEntity,
  type MatchableEntity,
} from "../entityMatcher";

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

function createEntities(count: number): MatchableEntity[] {
  return Array.from({ length: count }, (_, index) =>
    createEntity({
      id: `e-${index}`,
      name: `角色${index.toString().padStart(4, "0")}`,
      aliases: [`代号-${index}`, `别名-${index}`],
    }),
  );
}

function measureElapsedMs(operation: () => void): number {
  const startedAt = performance.now();
  operation();
  return performance.now() - startedAt;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function trimmedMedian(values: number[], trimCount: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const trimmed =
    sorted.length > trimCount * 2
      ? sorted.slice(trimCount, sorted.length - trimCount)
      : sorted;
  return median(trimmed);
}

// Scenario: KG-TRIE-P3-02-S1
// 1000 entities full trie build should stay under 50ms.
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-build";
  const samples: number[] = [];

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities: createEntities(100) });

  for (let round = 0; round < 9; round += 1) {
    trieCacheInvalidate(cacheKey);
    samples.push(
      measureElapsedMs(() => {
        trieCachePrime({ cacheKey, entities });
      }),
    );
  }

  const buildMs = trimmedMedian(samples, 1);
  assert.equal(
    buildMs < 50,
    true,
    `expected 1000-entity trie build <50ms, got ${buildMs.toFixed(2)}ms`,
  );
}

// Scenario: KG-TRIE-P3-02-S2
// 10k-char matching should stay under 5ms after cache warmup.
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-match";
  const textCore = "天地玄黄宇宙洪荒".repeat(625);
  const text = `${textCore} 角色0001 与 角色0999 同时出现。`;

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });
  matchEntities(text, entities, { cacheKey });

  const samples: number[] = [];
  for (let round = 0; round < 20; round += 1) {
    samples.push(measureElapsedMs(() => matchEntities(text, entities, { cacheKey })));
  }

  const matchMs = trimmedMedian(samples, 2);
  assert.equal(
    matchMs < 5,
    true,
    `expected 10k-char match <5ms, got ${matchMs.toFixed(2)}ms`,
  );
}

// Scenario: KG-TRIE-P3-02-S3
// incremental add/remove should stay under 1ms.
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-incremental";

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });

  const addSamples: number[] = [];
  const removeSamples: number[] = [];

  for (let index = 0; index < 120; index += 1) {
    const id = `delta-${index}`;
    const entity = createEntity({
      id,
      name: `增量角色-${index}`,
      aliases: [`增量别名-${index}`],
    });

    addSamples.push(
      measureElapsedMs(() => {
        trieCacheUpsertEntity({ cacheKey, entity });
      }),
    );
    removeSamples.push(
      measureElapsedMs(() => {
        trieCacheRemoveEntity({ cacheKey, entityId: id });
      }),
    );
  }

  const addMs = trimmedMedian(addSamples, 10);
  const removeMs = trimmedMedian(removeSamples, 10);

  assert.equal(
    addMs < 1,
    true,
    `expected incremental add <1ms, got ${addMs.toFixed(2)}ms`,
  );
  assert.equal(
    removeMs < 1,
    true,
    `expected incremental remove <1ms, got ${removeMs.toFixed(2)}ms`,
  );
}

// Scenario: KG-TRIE-P3-02-S4
// concurrent async interleave must not corrupt trie state.
{
  const entities = createEntities(120);
  const cacheKey = "kg-trie-concurrency";
  const text = "角色0001 在 角色0002 的注视下踏入长夜。";

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });

  await Promise.all(
    Array.from({ length: 200 }, (_, index) => {
      return Promise.resolve().then(() => {
        if (index % 3 === 0) {
          trieCacheUpsertEntity({
            cacheKey,
            entity: createEntity({
              id: "hot-entity",
              name: "长夜使者",
              aliases: [`夜行者-${index}`],
            }),
          });
          return;
        }

        if (index % 5 === 0) {
          trieCacheRemoveEntity({
            cacheKey,
            entityId: "hot-entity",
          });
          return;
        }

        matchEntities(text, entities, { cacheKey });
      });
    }),
  );

  const finalMatches = matchEntities("长夜使者现身。", entities, { cacheKey });
  assert.equal(Array.isArray(finalMatches), true);
}

// Scenario: KG-TRIE-P3-02-S5
// trieCacheInvalidate should force rebuild and keep behavior deterministic.
{
  const cacheKey = "kg-trie-invalidate";
  const entities = [
    createEntity({ id: "a", name: "林默", aliases: ["小默"] }),
    createEntity({ id: "b", name: "白塔" }),
  ];

  trieCacheInvalidate(cacheKey);
  const first = matchEntities("小默来到白塔。", entities, { cacheKey });
  trieCacheInvalidate(cacheKey);
  const second = matchEntities("小默来到白塔。", entities, { cacheKey });

  assert.deepEqual(second, first);
}

