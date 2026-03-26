import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = { id: string };
type ValidateDto = {
  cycles: string[][];
};
type PathDto = {
  pathEntityIds: string[];
  queryCostMs: number;
};

// KG1-R3-S2
// should return cycles and downgrade path query with KG_QUERY_TIMEOUT
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
    await harness.invoke("knowledge:relation:create", {
      projectId: harness.projectId,
      sourceEntityId: cRes.data.id,
      targetEntityId: aRes.data.id,
      relationType: "ally",
    });

    const validateRes = await harness.invoke<ValidateDto>(
      "knowledge:query:validate",
      {
        projectId: harness.projectId,
      },
    );

    assert.equal(validateRes.ok, true);
    if (!validateRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(validateRes.data.cycles.length > 0, true);

    const timeoutRes = await harness.invoke<PathDto>("knowledge:query:path", {
      projectId: harness.projectId,
      sourceEntityId: aRes.data.id,
      targetEntityId: cRes.data.id,
      timeoutMs: 0,
    });

    assert.equal(timeoutRes.ok, false);
    if (timeoutRes.ok) {
      assert.fail("expected KG_QUERY_TIMEOUT");
    }

    assert.equal(timeoutRes.error.code, "KG_QUERY_TIMEOUT");
  } finally {
    harness.close();
  }
}
