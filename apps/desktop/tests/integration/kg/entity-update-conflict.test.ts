import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
  version: number;
  description: string;
};

// KG1-X-S3
// should return KG_ENTITY_CONFLICT with latestSnapshot on stale version
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        description: "v1",
      },
    );

    assert.equal(createRes.ok, true);
    if (!createRes.ok) {
      assert.fail("expected success");
    }

    const firstUpdate = await harness.invoke<EntityDto>(
      "knowledge:entity:update",
      {
        projectId: harness.projectId,
        id: createRes.data.id,
        expectedVersion: createRes.data.version,
        patch: {
          description: "v2",
        },
      },
    );

    assert.equal(firstUpdate.ok, true);
    if (!firstUpdate.ok) {
      assert.fail("expected success");
    }

    const staleUpdate = await harness.invoke<EntityDto>(
      "knowledge:entity:update",
      {
        projectId: harness.projectId,
        id: createRes.data.id,
        expectedVersion: createRes.data.version,
        patch: {
          description: "stale",
        },
      },
    );

    assert.equal(staleUpdate.ok, false);
    if (staleUpdate.ok) {
      assert.fail("expected KG_ENTITY_CONFLICT");
    }

    assert.equal(staleUpdate.error.code, "KG_ENTITY_CONFLICT");

    const details = staleUpdate.error.details as {
      latestSnapshot?: EntityDto;
    };
    assert.ok(details.latestSnapshot);
    assert.equal(details.latestSnapshot?.version, firstUpdate.data.version);
  } finally {
    harness.close();
  }
}

// KG1-X-S4
// should reject rename to duplicated name within same project/type
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const first = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        description: "主角",
      },
    );
    assert.equal(first.ok, true);
    if (!first.ok) {
      assert.fail("expected first create success");
    }

    const second = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "张薇",
        description: "搭档",
      },
    );
    assert.equal(second.ok, true);
    if (!second.ok) {
      assert.fail("expected second create success");
    }

    const renamed = await harness.invoke<EntityDto>(
      "knowledge:entity:update",
      {
        projectId: harness.projectId,
        id: second.data.id,
        expectedVersion: second.data.version,
        patch: {
          name: "林远",
        },
      },
    );

    assert.equal(renamed.ok, false);
    if (renamed.ok) {
      assert.fail("expected KG_ENTITY_DUPLICATE");
    }
    assert.equal(renamed.error.code, "KG_ENTITY_DUPLICATE");
  } finally {
    harness.close();
  }
}
