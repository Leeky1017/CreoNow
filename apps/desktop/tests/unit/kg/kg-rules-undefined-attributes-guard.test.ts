import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
};

type RulesInjectionDto = {
  injectedEntities: Array<{
    id: string;
    name: string;
    attributes: Record<string, string>;
  }>;
  source: "kg-rules-mock";
};

// KG3-R2-S2
// should inject only defined fields for sparse entities
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const createRes = await harness.invoke<EntityDto>("knowledge:entity:create", {
      projectId: harness.projectId,
      type: "character",
      name: "神秘老人",
      description: "",
      attributes: {},
    });

    assert.equal(createRes.ok, true);
    if (!createRes.ok) {
      assert.fail("expected fixture create success");
    }

    const injectRes = await harness.invoke<RulesInjectionDto>(
      "knowledge:rules:inject",
      {
        projectId: harness.projectId,
        documentId: "doc-rules-sparse",
        excerpt: "神秘老人望向远方，没有继续说话。",
        traceId: "trace-rules-sparse",
      },
    );

    assert.equal(injectRes.ok, true);
    if (!injectRes.ok) {
      assert.fail("expected injection success");
    }

    assert.equal(injectRes.data.source, "kg-rules-mock");

    const injected = injectRes.data.injectedEntities.find(
      (item) => item.name === "神秘老人",
    );
    assert.ok(injected);
    if (!injected) {
      assert.fail("expected sparse entity to be injected");
    }

    assert.deepEqual(Object.keys(injected.attributes), []);
  } finally {
    harness.close();
  }
}
