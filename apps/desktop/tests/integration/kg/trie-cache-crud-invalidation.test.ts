import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";
import {
  matchEntitiesCached,
  type MatchableEntity,
} from "../../../main/src/services/kg/entityMatcher";
import {
  trieCacheInvalidate,
  trieCacheHas,
} from "../../../main/src/services/kg/trieCache";

type EntityDto = {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  aiContextLevel: string;
};

type EntityListDto = {
  items: EntityDto[];
  totalCount: number;
};

type ImpactPreviewDto = {
  revisionFingerprint: string;
};

// Reset cache state before integration tests
trieCacheInvalidate();

// Scenario CRUD-INV-S1: entityCreate invalidates trie cache
{
  const harness = createKnowledgeGraphIpcHarness();
  const projectId = harness.projectId;
  trieCacheInvalidate();

  try {
    // Create an initial entity and seed the cache
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId,
        type: "character",
        name: "林远",
      },
    );
    assert.equal(createRes.ok, true);

    // Seed the cache by fetching entities and running cached match
    const listRes = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      { projectId },
    );
    assert.equal(listRes.ok, true);
    if (!listRes.ok) assert.fail("list failed");

    const entities: MatchableEntity[] = listRes.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      aiContextLevel: item.aiContextLevel as "when_detected",
    }));

    const text = "林远和张薇在长安城相遇。";
    matchEntitiesCached(text, entities, projectId);
    assert.equal(trieCacheHas(projectId), true, "cache seeded");

    // Create a new entity — should invalidate cache
    const createRes2 = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId,
        type: "character",
        name: "张薇",
      },
    );
    assert.equal(createRes2.ok, true);
    assert.equal(
      trieCacheHas(projectId),
      false,
      "cache invalidated after entityCreate",
    );

    // Rebuild cache and verify new entity is detected
    const listRes2 = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      { projectId },
    );
    assert.equal(listRes2.ok, true);
    if (!listRes2.ok) assert.fail("list failed");

    const entities2: MatchableEntity[] = listRes2.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      aiContextLevel: item.aiContextLevel as "when_detected",
    }));

    const results = matchEntitiesCached(text, entities2, projectId);
    assert.equal(results.length, 2, "both entities detected after cache rebuild");
  } finally {
    harness.close();
  }
}

// Scenario CRUD-INV-S2: entityUpdate invalidates trie cache
{
  const harness = createKnowledgeGraphIpcHarness();
  const projectId = harness.projectId;
  trieCacheInvalidate();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId,
        type: "character",
        name: "林远",
      },
    );
    assert.equal(createRes.ok, true);
    if (!createRes.ok) assert.fail("create failed");
    const entityId = createRes.data.id;

    // Seed cache
    const listRes = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      { projectId },
    );
    if (!listRes.ok) assert.fail("list failed");

    const entities: MatchableEntity[] = listRes.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      aiContextLevel: item.aiContextLevel as "when_detected",
    }));

    matchEntitiesCached("林远", entities, projectId);
    assert.equal(trieCacheHas(projectId), true, "cache seeded before update");

    // Update entity name
    await harness.invoke("knowledge:entity:update", {
      projectId,
      id: entityId,
      expectedVersion: 1,
      patch: { name: "林远远" },
    });

    assert.equal(
      trieCacheHas(projectId),
      false,
      "cache invalidated after entityUpdate",
    );
  } finally {
    harness.close();
  }
}

// Scenario CRUD-INV-S3: entityDelete invalidates trie cache
{
  const harness = createKnowledgeGraphIpcHarness();
  const projectId = harness.projectId;
  trieCacheInvalidate();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId,
        type: "character",
        name: "林远",
      },
    );
    assert.equal(createRes.ok, true);
    if (!createRes.ok) assert.fail("create failed");
    const entityId = createRes.data.id;

    // Seed cache
    const listRes = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      { projectId },
    );
    if (!listRes.ok) assert.fail("list failed");

    const entities: MatchableEntity[] = listRes.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      aiContextLevel: item.aiContextLevel as "when_detected",
    }));

    matchEntitiesCached("林远", entities, projectId);
    assert.equal(trieCacheHas(projectId), true, "cache seeded before delete");

    // Delete entity
    const previewRes = await harness.invoke<ImpactPreviewDto>(
      "knowledge:impact:preview",
      {
        projectId,
        entityId,
      },
    );
    if (!previewRes.ok) {
      assert.fail("impact preview failed before delete");
    }

    await harness.invoke("knowledge:entity:delete", {
      confirmationToken: previewRes.data.revisionFingerprint,
      projectId,
      id: entityId,
    });

    assert.equal(
      trieCacheHas(projectId),
      false,
      "cache invalidated after entityDelete",
    );

    // Verify deleted entity is no longer matched
    const listRes2 = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      { projectId },
    );
    if (!listRes2.ok) assert.fail("list failed");

    const entities2: MatchableEntity[] = listRes2.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      aiContextLevel: item.aiContextLevel as "when_detected",
    }));

    const results = matchEntitiesCached("林远", entities2, projectId);
    assert.equal(results.length, 0, "deleted entity not matched after rebuild");
  } finally {
    harness.close();
  }
}

// Scenario CRUD-INV-S4: cross-project isolation — CRUD on project A does not
// invalidate project B's cache
{
  trieCacheInvalidate();

  const harnessA = createKnowledgeGraphIpcHarness({ projectId: "proj-A" });
  const harnessB = createKnowledgeGraphIpcHarness({ projectId: "proj-B" });

  try {
    // Seed both caches
    const entityA: MatchableEntity[] = [
      { id: "ea", name: "角色A", aliases: [], aiContextLevel: "when_detected" },
    ];
    const entityB: MatchableEntity[] = [
      { id: "eb", name: "角色B", aliases: [], aiContextLevel: "when_detected" },
    ];

    matchEntitiesCached("角色A", entityA, "proj-A");
    matchEntitiesCached("角色B", entityB, "proj-B");

    assert.equal(trieCacheHas("proj-A"), true);
    assert.equal(trieCacheHas("proj-B"), true);

    // Create entity in project A
    await harnessA.invoke("knowledge:entity:create", {
      projectId: "proj-A",
      type: "character",
      name: "新角色A",
    });

    assert.equal(trieCacheHas("proj-A"), false, "proj-A invalidated");
    assert.equal(trieCacheHas("proj-B"), true, "proj-B untouched");
  } finally {
    harnessA.close();
    harnessB.close();
  }
}

// Cleanup
trieCacheInvalidate();

console.log(
  "trie-cache-crud-invalidation.test.ts: all assertions passed",
);
