import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };
type SubgraphDto = {
  nodeCount: number;
  edgeCount: number;
  queryCostMs: number;
};

// KG1-R3-S1
// should return nodeCount edgeCount queryCostMs and enforce k<=3
{
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
    const cRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "C",
    });

    assert.equal(aRes.ok, true);
    assert.equal(bRes.ok, true);
    assert.equal(cRes.ok, true);
    if (!aRes.ok || !bRes.ok || !cRes.ok) {
      assert.fail("failed to create fixtures");
    }

    await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: aRes.data.id,
      targetEntityId: bRes.data.id,
      relationType: "ally",
    });
    await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: bRes.data.id,
      targetEntityId: cRes.data.id,
      relationType: "ally",
    });

    const res = await harness.invoke<SubgraphDto>("knowledge:query:subgraph", {
      projectId: harness.projectId,
      centerEntityId: aRes.data.id,
      k: 2,
    });

    assert.equal(res.ok, true);
    if (!res.ok) {
      assert.fail("expected success");
    }

    assert.equal(res.data.nodeCount >= 3, true);
    assert.equal(res.data.edgeCount >= 2, true);
    assert.equal(Number.isFinite(res.data.queryCostMs), true);

    const rejected = await harness.invoke<SubgraphDto>(
      "knowledge:query:subgraph",
      {
        projectId: harness.projectId,
        centerEntityId: aRes.data.id,
        k: 4,
      },
    );

    assert.equal(rejected.ok, false);
    if (rejected.ok) {
      assert.fail("expected KG_SUBGRAPH_K_EXCEEDED");
    }

    assert.equal(rejected.error.code, "KG_SUBGRAPH_K_EXCEEDED");
  } finally {
    harness.close();
  }
}
