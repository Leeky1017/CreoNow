import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };

// KG1-X-S4
// should return KG_CAPACITY_EXCEEDED when node or edge limit reached
{
  const prevNodeLimit = process.env.CREONOW_KG_NODE_LIMIT;
  const prevEdgeLimit = process.env.CREONOW_KG_EDGE_LIMIT;
  process.env.CREONOW_KG_NODE_LIMIT = "2";
  process.env.CREONOW_KG_EDGE_LIMIT = "1";

  const harness = createKnowledgeGraphIpcHarness();
  try {
    const aRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "A",
    });
    const bRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "B",
    });

    assert.equal(aRes.ok, true);
    assert.equal(bRes.ok, true);
    if (!aRes.ok || !bRes.ok) {
      assert.fail("failed to create fixtures");
    }

    const thirdEntity = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "C",
      },
    );

    assert.equal(thirdEntity.ok, false);
    if (thirdEntity.ok) {
      assert.fail("expected KG_CAPACITY_EXCEEDED for node limit");
    }
    assert.equal(thirdEntity.error.code, "KG_CAPACITY_EXCEEDED");

    const firstEdge = await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: aRes.data.id,
      targetEntityId: bRes.data.id,
      relationType: "ally",
    });

    assert.equal(firstEdge.ok, true);

    const secondEdge = await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: bRes.data.id,
      targetEntityId: aRes.data.id,
      relationType: "ally",
    });

    assert.equal(secondEdge.ok, false);
    if (secondEdge.ok) {
      assert.fail("expected KG_CAPACITY_EXCEEDED for edge limit");
    }
    assert.equal(secondEdge.error.code, "KG_CAPACITY_EXCEEDED");
  } finally {
    harness.close();

    if (prevNodeLimit === undefined) {
      delete process.env.CREONOW_KG_NODE_LIMIT;
    } else {
      process.env.CREONOW_KG_NODE_LIMIT = prevNodeLimit;
    }

    if (prevEdgeLimit === undefined) {
      delete process.env.CREONOW_KG_EDGE_LIMIT;
    } else {
      process.env.CREONOW_KG_EDGE_LIMIT = prevEdgeLimit;
    }
  }
}
