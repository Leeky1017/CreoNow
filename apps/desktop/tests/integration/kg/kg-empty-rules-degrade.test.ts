import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type RulesInjectionDto = {
  injectedEntities: Array<{
    id: string;
    name: string;
    attributes: Record<string, string>;
    relationsSummary: string[];
  }>;
  source: "kg-rules-mock";
};

// KG3-R2-S3
// should return empty injection result and continue compose flow
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const injectRes = await harness.invoke<RulesInjectionDto>(
      "knowledge:rules:inject",
      {
        projectId: harness.projectId,
        documentId: "doc-empty-rules",
        excerpt: "夜风穿过走廊。",
        traceId: "trace-empty-rules-1",
      },
    );

    assert.equal(injectRes.ok, true);
    if (!injectRes.ok) {
      assert.fail("expected injection success");
    }

    assert.equal(injectRes.data.source, "kg-rules-mock");
    assert.deepEqual(injectRes.data.injectedEntities, []);
  } finally {
    harness.close();
  }
}
