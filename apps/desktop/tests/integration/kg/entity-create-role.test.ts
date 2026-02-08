import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
  projectId: string;
  type: "character" | "location" | "event" | "item" | "faction";
  name: string;
  description: string;
  attributes: Record<string, string>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

// KG1-R1-S1
// should create character entity via knowledge:entity:create and open detail panel
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        description: "前特种兵",
        attributes: { 年龄: "28" },
      },
    );

    assert.equal(createRes.ok, true);
    if (!createRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(createRes.data.type, "character");
    assert.equal(createRes.data.name, "林远");
    assert.equal(createRes.data.attributes["年龄"], "28");

    const readRes = await harness.invoke<EntityDto>("knowledge:entity:read", {
      projectId: harness.projectId,
      id: createRes.data.id,
    });

    assert.equal(readRes.ok, true);
    if (!readRes.ok) {
      assert.fail("expected success");
    }

    assert.equal(readRes.data.id, createRes.data.id);
    assert.equal(readRes.data.name, "林远");
  } finally {
    harness.close();
  }
}
