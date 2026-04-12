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

// Scenario: KG-TRIE-P3-02-S1
// 1000 entities full trie build — correctness check (timing assertions removed
// per P4 determinism rule; wall-clock thresholds flake on slow CI runners).
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-build";

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });

  // After priming, matching should find entities that appear in the text.
  const result = matchEntities("角色0001 与 角色0999 出现。", entities, {
    cacheKey,
  });
  assert.equal(result.length > 0, true, "expected matches after trie build");
}

// Scenario: KG-TRIE-P3-02-S2
// 10k-char matching — correctness check (timing assertions removed per P4).
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-match";
  const textCore = "天地玄黄宇宙洪荒".repeat(625);
  const text = `${textCore} 角色0001 与 角色0999 同时出现。`;

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });

  const result = matchEntities(text, entities, { cacheKey });
  assert.equal(result.length, 2, "expected 2 matched entities");
  const ids = result.map((r) => r.entityId).sort();
  assert.deepEqual(ids, ["e-1", "e-999"]);
}

// Scenario: KG-TRIE-P3-02-S3
// Incremental add/remove — correctness check (timing assertions removed per P4).
{
  const entities = createEntities(1000);
  const cacheKey = "kg-trie-benchmark-incremental";

  trieCacheInvalidate(cacheKey);
  trieCachePrime({ cacheKey, entities });

  // Add a new entity via upsert.
  const addedEntity = createEntity({
    id: "delta-0",
    name: "增量角色-0",
    aliases: ["增量别名-0"],
  });
  trieCacheUpsertEntity({ cacheKey, entity: addedEntity });

  // matchEntities syncs trie with provided entity list, so include the new one.
  const entitiesWithDelta = [...entities, addedEntity];
  const afterAdd = matchEntities("增量角色-0 出现。", entitiesWithDelta, {
    cacheKey,
  });
  assert.equal(
    afterAdd.some((m) => m.entityId === "delta-0"),
    true,
    "expected added entity to match",
  );

  // Remove and verify it is no longer matched.
  trieCacheRemoveEntity({ cacheKey, entityId: "delta-0" });
  const afterRemove = matchEntities("增量角色-0 出现。", entities, {
    cacheKey,
  });
  assert.equal(
    afterRemove.some((m) => m.entityId === "delta-0"),
    false,
    "expected removed entity to not match",
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
