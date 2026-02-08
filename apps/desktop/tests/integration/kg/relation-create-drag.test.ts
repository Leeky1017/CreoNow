import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };

type RelationDto = {
  id: string;
  relationType: string;
};

// KG1-R2-S1
// should create ally relation from drag action
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const sourceRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
      },
    );
    const targetRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "张薇",
      },
    );

    assert.equal(sourceRes.ok, true);
    assert.equal(targetRes.ok, true);
    if (!sourceRes.ok || !targetRes.ok) {
      assert.fail("failed to create fixtures");
    }

    const relationRes = await harness.invoke<RelationDto>(
      "knowledge:relation:create",
      {
        projectId: harness.projectId,
        sourceEntityId: sourceRes.data.id,
        targetEntityId: targetRes.data.id,
        relationType: "ally",
      },
    );

    assert.equal(relationRes.ok, true);
    if (!relationRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(relationRes.data.relationType, "ally");
    assert.ok(relationRes.data.id.length > 0);
  } finally {
    harness.close();
  }
}
