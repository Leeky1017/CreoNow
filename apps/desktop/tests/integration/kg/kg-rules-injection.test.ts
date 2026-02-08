import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
  name: string;
  type: "character" | "location" | "event" | "item" | "faction";
};

type RulesInjectionDto = {
  injectedEntities: Array<{
    id: string;
    name: string;
    type: "character" | "location" | "event" | "item" | "faction";
    attributes: Record<string, string>;
    relationsSummary: string[];
  }>;
  source: "kg-rules-mock";
};

// KG3-R2-S1
// should inject relevant entity settings into mocked rules layer payload
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const linyuanRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        description: "前特种兵",
        attributes: {
          年龄: "28",
          性格: "冷静",
        },
      },
    );

    const teammateRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "张薇",
        description: "行动搭档",
      },
    );

    assert.equal(linyuanRes.ok, true);
    assert.equal(teammateRes.ok, true);
    if (!linyuanRes.ok || !teammateRes.ok) {
      assert.fail("failed to create fixtures");
    }

    const relationRes = await harness.invoke<{ id: string }>(
      "knowledge:relation:create",
      {
        projectId: harness.projectId,
        sourceEntityId: linyuanRes.data.id,
        targetEntityId: teammateRes.data.id,
        relationType: "ally",
      },
    );
    assert.equal(relationRes.ok, true);

    const injectRes = await harness.invoke<RulesInjectionDto>(
      "knowledge:rules:inject",
      {
        projectId: harness.projectId,
        documentId: "doc-rules-1",
        excerpt: "林远握紧武器，示意张薇继续前进。",
        traceId: "trace-rules-1",
      },
    );

    assert.equal(injectRes.ok, true);
    if (!injectRes.ok) {
      assert.fail("expected injection success");
    }

    assert.equal(injectRes.data.source, "kg-rules-mock");
    assert.equal(injectRes.data.injectedEntities.length > 0, true);

    const first = injectRes.data.injectedEntities[0];
    assert.ok(first);
    if (!first) {
      assert.fail("expected injected entity");
    }

    assert.equal(first.name, "林远");
    assert.equal(first.type, "character");
    assert.equal(first.attributes["年龄"], "28");
    assert.equal(first.attributes["性格"], "冷静");
    assert.equal(first.relationsSummary.length > 0, true);
  } finally {
    harness.close();
  }
}
