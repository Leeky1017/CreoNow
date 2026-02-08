import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };

// KG1-X-S2
// should return KG_RELATION_INVALID for dangling or cross-project entity refs
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const source = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "A",
    });

    assert.equal(source.ok, true);
    if (!source.ok) {
      assert.fail("expected success");
    }

    const dangling = await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: source.data.id,
      targetEntityId: "missing-target",
      relationType: "ally",
    });

    assert.equal(dangling.ok, false);
    if (dangling.ok) {
      assert.fail("expected KG_RELATION_INVALID for dangling ref");
    }
    assert.equal(dangling.error.code, "KG_RELATION_INVALID");

    const otherProjectHarness = createKnowledgeGraphIpcHarness({
      projectId: "proj-2",
    });
    try {
      const foreignEntity = await otherProjectHarness.invoke<EntityDto>(
        "knowledge:entity:create",
        {
          projectId: "proj-2",
          type: "character",
          name: "foreign",
        },
      );

      assert.equal(foreignEntity.ok, true);
      if (!foreignEntity.ok) {
        assert.fail("expected success");
      }

      const crossProject = await harness.invoke("knowledge:relation:create", {
        projectId: harness.projectId,
        sourceEntityId: source.data.id,
        targetEntityId: foreignEntity.data.id,
        relationType: "ally",
      });

      assert.equal(crossProject.ok, false);
      if (crossProject.ok) {
        assert.fail("expected KG_RELATION_INVALID for cross-project ref");
      }
      assert.equal(crossProject.error.code, "KG_RELATION_INVALID");
    } finally {
      otherProjectHarness.close();
    }
  } finally {
    harness.close();
  }
}
