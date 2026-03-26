import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
  version: number;
  description: string;
  attributes: Record<string, string>;
};

// KG1-R1-S2
// should persist attributes and reject when key count exceeds 200
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        description: "初始",
        attributes: {},
      },
    );

    assert.equal(createRes.ok, true);
    if (!createRes.ok) {
      assert.fail("expected success");
    }

    const updateRes = await harness.invoke<EntityDto>(
      "knowledge:entity:update",
      {
        projectId: harness.projectId,
        id: createRes.data.id,
        expectedVersion: createRes.data.version,
        patch: {
          description: "冷静而克制",
          attributes: {
            年龄: "28",
            身份: "侦察员",
          },
        },
      },
    );

    assert.equal(updateRes.ok, true);
    if (!updateRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(updateRes.data.description, "冷静而克制");
    assert.equal(updateRes.data.attributes["年龄"], "28");

    const tooManyAttributes: Record<string, string> = {};
    for (let i = 0; i < 201; i += 1) {
      tooManyAttributes[`k${i}`] = `${i}`;
    }

    const rejected = await harness.invoke<EntityDto>(
      "knowledge:entity:update",
      {
        projectId: harness.projectId,
        id: createRes.data.id,
        expectedVersion: updateRes.data.version,
        patch: {
          attributes: tooManyAttributes,
        },
      },
    );

    assert.equal(rejected.ok, false);
    if (rejected.ok) {
      assert.fail("expected KG_ATTRIBUTE_KEYS_EXCEEDED");
    }

    assert.equal(rejected.error.code, "KG_ATTRIBUTE_KEYS_EXCEEDED");
  } finally {
    harness.close();
  }
}
