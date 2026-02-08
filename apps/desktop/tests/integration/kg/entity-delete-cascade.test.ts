import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
};

type RelationDto = {
  id: string;
};

type RelationListDto = {
  items: RelationDto[];
};

type DeleteEntityDto = {
  deleted: true;
  deletedRelationCount: number;
};

// KG1-R1-S3
// should delete related edges in same transaction when deleting entity
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const aRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "林远",
    });
    const bRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "张薇",
    });

    assert.equal(aRes.ok, true);
    assert.equal(bRes.ok, true);
    if (!aRes.ok || !bRes.ok) {
      assert.fail("failed to create fixtures");
    }

    const relationRes = await harness.invoke<RelationDto>(
      "knowledge:relation:create",
      {
        projectId: harness.projectId,
        sourceEntityId: aRes.data.id,
        targetEntityId: bRes.data.id,
        relationType: "ally",
      },
    );

    assert.equal(relationRes.ok, true);
    if (!relationRes.ok) {
      assert.fail("expected success");
    }

    const delRes = await harness.invoke<DeleteEntityDto>(
      "knowledge:entity:delete",
      {
        projectId: harness.projectId,
        id: aRes.data.id,
      },
    );

    assert.equal(delRes.ok, true);
    if (!delRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(delRes.data.deleted, true);
    assert.equal(delRes.data.deletedRelationCount, 1);

    const relationList = await harness.invoke<RelationListDto>(
      "knowledge:relation:list",
      {
        projectId: harness.projectId,
      },
    );

    assert.equal(relationList.ok, true);
    if (!relationList.ok) {
      assert.fail("expected success");
    }

    assert.equal(relationList.data.items.length, 0);
  } finally {
    harness.close();
  }
}
