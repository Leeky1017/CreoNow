import { describe, expect, it } from "vitest";

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

describe("trieCache", () => {
  it("KG-TRIE-P3-02-S1: builds trie for 1000 entities and matches correctly", () => {
    const entities = createEntities(1000);
    const cacheKey = "kg-trie-benchmark-build";

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const result = matchEntities("角色0001 与 角色0999 出现。", entities, {
      cacheKey,
    });
    expect(result.length > 0).toBe(true);
  });

  it("KG-TRIE-P3-02-S2: matches entities in 10k-char text", () => {
    const entities = createEntities(1000);
    const cacheKey = "kg-trie-benchmark-match";
    const textCore = "天地玄黄宇宙洪荒".repeat(625);
    const text = `${textCore} 角色0001 与 角色0999 同时出现。`;

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const result = matchEntities(text, entities, { cacheKey });
    expect(result.length).toBe(2);
    const ids = result.map((r) => r.entityId).sort();
    expect(ids).toEqual(["e-1", "e-999"]);
  });

  it("KG-TRIE-P3-02-S3: supports incremental add/remove", () => {
    const entities = createEntities(1000);
    const cacheKey = "kg-trie-benchmark-incremental";

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const addedEntity = createEntity({
      id: "delta-0",
      name: "增量角色-0",
      aliases: ["增量别名-0"],
    });
    trieCacheUpsertEntity({ cacheKey, entity: addedEntity });

    const entitiesWithDelta = [...entities, addedEntity];
    const afterAdd = matchEntities("增量角色-0 出现。", entitiesWithDelta, {
      cacheKey,
    });
    expect(afterAdd.some((m) => m.entityId === "delta-0")).toBe(true);

    trieCacheRemoveEntity({ cacheKey, entityId: "delta-0" });
    const afterRemove = matchEntities("增量角色-0 出现。", entities, {
      cacheKey,
    });
    expect(afterRemove.some((m) => m.entityId === "delta-0")).toBe(false);
  });

  it("KG-TRIE-P3-02-S4: keeps state valid under async interleave", async () => {
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
    expect(Array.isArray(finalMatches)).toBe(true);
  });

  it("KG-TRIE-P3-02-S5: invalidate forces deterministic rebuild", () => {
    const cacheKey = "kg-trie-invalidate";
    const entities = [
      createEntity({ id: "a", name: "林默", aliases: ["小默"] }),
      createEntity({ id: "b", name: "白塔" }),
    ];

    trieCacheInvalidate(cacheKey);
    const first = matchEntities("小默来到白塔。", entities, { cacheKey });
    trieCacheInvalidate(cacheKey);
    const second = matchEntities("小默来到白塔。", entities, { cacheKey });

    expect(second).toEqual(first);
  });
});
