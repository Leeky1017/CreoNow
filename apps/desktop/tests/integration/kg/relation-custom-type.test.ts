import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };
type RelationDto = { relationType: string };

// KG1-R2-S2
// should persist custom relation type and reuse in next create
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const aRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "老师",
    });
    const bRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "徒弟甲",
    });
    const cRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "徒弟乙",
    });

    assert.equal(aRes.ok, true);
    assert.equal(bRes.ok, true);
    assert.equal(cRes.ok, true);
    if (!aRes.ok || !bRes.ok || !cRes.ok) {
      assert.fail("failed to create fixtures");
    }

    const first = await harness.invoke<RelationDto>(
      "knowledge:relation:create",
      {
        projectId: harness.projectId,
        sourceEntityId: aRes.data.id,
        targetEntityId: bRes.data.id,
        relationType: "mentor",
      },
    );

    assert.equal(first.ok, true);
    if (!first.ok) {
      assert.fail("expected success");
    }
    assert.equal(first.data.relationType, "mentor");

    const second = await harness.invoke<RelationDto>(
      "knowledge:relation:create",
      {
        projectId: harness.projectId,
        sourceEntityId: aRes.data.id,
        targetEntityId: cRes.data.id,
        relationType: "mentor",
      },
    );

    assert.equal(second.ok, true);
    if (!second.ok) {
      assert.fail("expected success");
    }
    assert.equal(second.data.relationType, "mentor");
  } finally {
    harness.close();
  }
}
