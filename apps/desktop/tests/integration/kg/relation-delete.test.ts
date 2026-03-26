import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };
type RelationDto = { id: string };
type RelationListDto = { items: RelationDto[] };
type EntityListDto = { items: EntityDto[] };

// KG1-R2-S3
// should delete selected relation without deleting endpoint entities
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

    const deleteRes = await harness.invoke<{ deleted: true }>(
      "knowledge:relation:delete",
      {
        projectId: harness.projectId,
        id: relationRes.data.id,
      },
    );

    assert.equal(deleteRes.ok, true);
    if (!deleteRes.ok) {
      assert.fail("expected success");
    }

    const relationListRes = await harness.invoke<RelationListDto>(
      "knowledge:relation:list",
      {
        projectId: harness.projectId,
      },
    );
    assert.equal(relationListRes.ok, true);
    if (!relationListRes.ok) {
      assert.fail("expected success");
    }
    assert.equal(relationListRes.data.items.length, 0);

    const entityListRes = await harness.invoke<EntityListDto>(
      "knowledge:entity:list",
      {
        projectId: harness.projectId,
      },
    );
    assert.equal(entityListRes.ok, true);
    if (!entityListRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(entityListRes.data.items.length, 2);
  } finally {
    harness.close();
  }
}
