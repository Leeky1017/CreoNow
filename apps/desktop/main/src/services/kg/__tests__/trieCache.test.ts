import { describe, expect, it } from "vitest";

import type { AiContextLevel } from "../kgService";
import {
  matchEntities,
  trieCacheDebugSnapshot,
  trieCacheInvalidate,
  trieCachePrime,
  trieCacheRemoveEntity,
  trieCacheUpsertEntity,
  type MatchableEntity,
} from "../entityMatcher";

function isCoverageInstrumentationRun(): boolean {
  return (
    process.argv.includes("--coverage") ||
    process.env.VITEST_COVERAGE === "true" ||
    "__coverage__" in globalThis
  );
}

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
  it("KG-TRIE-P3-02-S1: deterministic benchmark with realistic-scale dataset", () => {
    // Deterministic benchmark: exercises full pipeline with realistic-scale data
    const entities = createEntities(1000);
    const cacheKey = "kg-trie-benchmark-build";

    trieCacheInvalidate(cacheKey);
    const buildStart = performance.now();
    trieCachePrime({ cacheKey, entities });
    const buildDuration = performance.now() - buildStart;
    expect(buildDuration).toBeLessThan(50);

    const result = matchEntities("角色0001 与 角色0499 出现。", entities, {
      cacheKey,
    });
    expect(result.map((match) => match.entityId).sort()).toEqual([
      "e-1",
      "e-499",
    ]);
  });

  it("KG-TRIE-P3-02-S2: matches entities in 10k-char text", () => {
    const entities = createEntities(1000);
    const cacheKey = "kg-trie-benchmark-match";
    const textCore = "天地玄黄宇宙洪荒".repeat(625);
    const text = `${textCore} 角色0001 与 角色0999 同时出现。`;

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const matchStart = performance.now();
    const result = matchEntities(text, entities, { cacheKey });
    const matchDuration = performance.now() - matchStart;
    const matchBudgetMs = isCoverageInstrumentationRun() ? 15 : 5;
    expect(matchDuration).toBeLessThan(matchBudgetMs);
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

    const benchmarkRounds = 20;
    const incrementalStart = performance.now();
    for (let index = 0; index < benchmarkRounds; index += 1) {
      const benchmarkEntityId = `delta-benchmark-${index}`;
      trieCacheUpsertEntity({
        cacheKey,
        entity: createEntity({ id: benchmarkEntityId, name: `增量角色-基准-${index}` }),
      });
      trieCacheRemoveEntity({ cacheKey, entityId: benchmarkEntityId });
    }
    const incrementalDurationPerOp = (performance.now() - incrementalStart) / (benchmarkRounds * 2);
    expect(incrementalDurationPerOp).toBeLessThan(1);
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

    const finalMatches = matchEntities(text, entities, { cacheKey });
    expect(finalMatches.map((match) => match.entityId).sort()).toEqual([
      "e-1",
      "e-2",
    ]);
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

  it("KG-TRIE-P3-02-S6: upsert downgrade removes stale entity order entry", () => {
    const cacheKey = "kg-trie-order-cleanup";
    const first = createEntity({ id: "a", name: "同名角色" });
    const second = createEntity({ id: "b", name: "同名角色" });

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities: [first, second] });
    trieCacheUpsertEntity({
      cacheKey,
      entity: { ...first, aiContextLevel: "always" },
    });

    const snapshot = trieCacheDebugSnapshot(cacheKey);
    expect(snapshot?.entityIds).toEqual(["b"]);
    expect(snapshot?.entityOrderIds).toEqual(["b"]);
  });

  it("KG-TRIE-P3-02-S7: remove pattern keeps shared-prefix parent nodes", () => {
    const cacheKey = "kg-trie-shared-prefix";
    const left = createEntity({ id: "left", name: "王小明" });
    const right = createEntity({ id: "right", name: "王小红" });

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities: [left, right] });
    trieCacheRemoveEntity({ cacheKey, entityId: "left" });

    const matches = matchEntities("王小红出场。", [right], { cacheKey });
    expect(matches).toEqual([
      { entityId: "right", matchedTerm: "王小红", position: 0 },
    ]);
  });

  it("KG-TRIE-P3-02-S8: recycled node index is reused for later insertions", () => {
    const cacheKey = "kg-trie-recycle";
    const entity = createEntity({ id: "recycle-1", name: "甲乙" });

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities: [entity] });
    trieCacheRemoveEntity({ cacheKey, entityId: "recycle-1" });
    const beforeReuse = trieCacheDebugSnapshot(cacheKey);
    expect((beforeReuse?.freeIndicesCount ?? 0) > 0).toBe(true);

    trieCacheUpsertEntity({
      cacheKey,
      entity: createEntity({ id: "recycle-2", name: "丙丁" }),
    });

    const afterReuse = trieCacheDebugSnapshot(cacheKey);
    expect(afterReuse?.freeIndicesCount).toBeLessThan(
      beforeReuse?.freeIndicesCount ?? 0,
    );
  });

  it("KG-TRIE-P3-02-S9: upsert ignores entities with no viable normalized terms", () => {
    const cacheKey = "kg-trie-no-viable-terms";

    trieCacheInvalidate(cacheKey);
    trieCacheUpsertEntity({
      cacheKey,
      entity: createEntity({
        id: "blank",
        name: "   ",
        aliases: [" ", "\t"],
      }),
    });

    expect(trieCacheDebugSnapshot(cacheKey)?.entityIds).toEqual([]);
    const matches = matchEntities("blank", [], { cacheKey });
    expect(matches).toEqual([]);
  });

  it("KG-TRIE-P3-02-S10: failure-link outputs merge suffix matches", () => {
    const cacheKey = "kg-trie-failure-link-merge";
    const entities = [
      createEntity({ id: "abc", name: "abc" }),
      createEntity({ id: "bc", name: "bc" }),
    ];

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const matches = matchEntities("abc", entities, { cacheKey });
    expect(matches.map((match) => match.entityId).sort()).toEqual([
      "abc",
      "bc",
    ]);
  });

  it("KG-TRIE-P3-02-S11: match keeps earliest occurrence for same entity", () => {
    const cacheKey = "kg-trie-earliest-hit";
    const entities = [createEntity({ id: "x", name: "晨星" })];

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const matches = matchEntities("晨星在前，后来又出现晨星。", entities, { cacheKey });
    expect(matches).toEqual([
      { entityId: "x", matchedTerm: "晨星", position: 0 },
    ]);
  });

  it("KG-TRIE-P3-02-S12: sync merges duplicate ids and dedupes overlapping aliases", () => {
    const cacheKey = "kg-trie-merge-duplicate-ids";
    const duplicateIdEntities = [
      createEntity({ id: "dupe", name: "夜航者", aliases: ["旅人"] }),
      createEntity({ id: "dupe", name: "夜航者", aliases: ["旅人", "归客"] }),
    ];

    trieCacheInvalidate(cacheKey);
    const matches = matchEntities("归客与夜航者相遇。", duplicateIdEntities, {
      cacheKey,
    });

    expect(matches.map((match) => match.entityId)).toEqual(["dupe"]);
    expect(trieCacheDebugSnapshot(cacheKey)?.entityIds).toEqual(["dupe"]);
  });

  it("KG-TRIE-P3-02-S13: sync updates changed term set for existing entity", () => {
    const cacheKey = "kg-trie-sync-term-change";
    const baseEntity = createEntity({ id: "hero", name: "旧名" });
    const changedEntity = createEntity({
      id: "hero",
      name: "新名",
      aliases: ["旧名别称"],
    });

    trieCacheInvalidate(cacheKey);
    matchEntities("旧名登场。", [baseEntity], { cacheKey });
    const afterChange = matchEntities("旧名登场，新名也登场。", [changedEntity], {
      cacheKey,
    });

    expect(afterChange.some((match) => match.matchedTerm === "新名")).toBe(true);
    expect(afterChange.some((match) => match.matchedTerm === "旧名")).toBe(false);
  });

  it("KG-TRIE-P3-02-S14: match returns empty when entities normalize to zero patterns", () => {
    const cacheKey = "kg-trie-empty-normalized";
    const matches = matchEntities(
      "text",
      [createEntity({ id: "empty", name: " ", aliases: [" "] })],
      { cacheKey },
    );
    expect(matches).toEqual([]);
  });

  it("KG-TRIE-P3-02-S15: upsert with same terms is a no-op", () => {
    const cacheKey = "kg-trie-upsert-same-terms";
    const entity = createEntity({ id: "same", name: "青灯", aliases: ["夜雨"] });

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities: [entity] });
    const before = trieCacheDebugSnapshot(cacheKey);
    trieCacheUpsertEntity({
      cacheKey,
      entity: createEntity({ id: "same", name: "青灯", aliases: ["夜雨"] }),
    });
    const after = trieCacheDebugSnapshot(cacheKey);

    expect(after).toEqual(before);
  });

  it("KG-TRIE-P3-02-S16: upsert updates existing term set when terms change", () => {
    const cacheKey = "kg-trie-upsert-term-change";
    trieCacheInvalidate(cacheKey);
    trieCachePrime({
      cacheKey,
      entities: [createEntity({ id: "u", name: "旧称" })],
    });

    trieCacheUpsertEntity({
      cacheKey,
      entity: createEntity({ id: "u", name: "新称" }),
    });

    const matches = matchEntities("旧称和新称", [createEntity({ id: "u", name: "新称" })], {
      cacheKey,
    });
    expect(matches).toEqual([{ entityId: "u", matchedTerm: "新称", position: 3 }]);
  });

  it("KG-TRIE-P3-02-S17: remove gracefully handles missing cache/entity", () => {
    trieCacheInvalidate("kg-trie-remove-missing");
    trieCacheRemoveEntity({ cacheKey: "kg-trie-remove-missing", entityId: "none" });

    const cacheKey = "kg-trie-remove-missing-entity";
    trieCacheInvalidate(cacheKey);
    trieCachePrime({
      cacheKey,
      entities: [createEntity({ id: "exists", name: "存在" })],
    });
    trieCacheRemoveEntity({ cacheKey, entityId: "missing" });
    expect(trieCacheDebugSnapshot(cacheKey)?.entityIds).toEqual(["exists"]);
  });

  it("KG-TRIE-P3-02-S18: invalidate without key clears all cache entries", () => {
    trieCachePrime({
      cacheKey: "kg-trie-clear-a",
      entities: [createEntity({ id: "a", name: "甲" })],
    });
    trieCachePrime({
      cacheKey: "kg-trie-clear-b",
      entities: [createEntity({ id: "b", name: "乙" })],
    });

    trieCacheInvalidate();

    expect(trieCacheDebugSnapshot("kg-trie-clear-a")).toBeNull();
    expect(trieCacheDebugSnapshot("kg-trie-clear-b")).toBeNull();
  });

  it("KG-TRIE-P3-02-S19: result ordering prefers longer match at same position", () => {
    const cacheKey = "kg-trie-sort-length";
    const entities = [
      createEntity({ id: "short", name: "a" }),
      createEntity({ id: "long", name: "ab" }),
    ];

    trieCacheInvalidate(cacheKey);
    trieCachePrime({ cacheKey, entities });

    const matches = matchEntities("ab", entities, { cacheKey });
    expect(matches.map((match) => match.entityId)).toEqual(["long", "short"]);
  });
});
