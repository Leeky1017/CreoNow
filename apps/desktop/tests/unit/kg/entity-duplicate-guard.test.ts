import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

// KG1-X-S1
// should return KG_ENTITY_DUPLICATE for same type and normalized name
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const first = await harness.invoke("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: " 林远 ",
    });

    assert.equal(first.ok, true);

    const duplicate = await harness.invoke("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "林远",
    });

    assert.equal(duplicate.ok, false);
    if (duplicate.ok) {
      assert.fail("expected KG_ENTITY_DUPLICATE");
    }
    assert.equal(duplicate.error.code, "KG_ENTITY_DUPLICATE");
  } finally {
    harness.close();
  }
}
