import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
};

// KG3-X-S3
// should reject cross-project entity access with KG_SCOPE_VIOLATION
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    harness.db.prepare("INSERT INTO projects (project_id) VALUES (?)").run("proj-2");

    const foreignEntityRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: "proj-2",
        type: "character",
        name: "异项目角色",
      },
    );

    assert.equal(foreignEntityRes.ok, true);
    if (!foreignEntityRes.ok) {
      assert.fail("expected foreign fixture create success");
    }

    const byIdsRes = await harness.invoke<{ items: EntityDto[] }>(
      "knowledge:query:byids",
      {
        projectId: harness.projectId,
        entityIds: [foreignEntityRes.data.id],
      },
    );

    assert.equal(byIdsRes.ok, false);
    if (byIdsRes.ok) {
      assert.fail("expected KG_SCOPE_VIOLATION from query:byids");
    }
    assert.equal(byIdsRes.error.code, "KG_SCOPE_VIOLATION");

    const relevantRes = await harness.invoke<{ items: EntityDto[] }>(
      "knowledge:query:relevant",
      {
        projectId: harness.projectId,
        excerpt: "异项目角色",
        entityIds: [foreignEntityRes.data.id],
      },
    );

    assert.equal(relevantRes.ok, false);
    if (relevantRes.ok) {
      assert.fail("expected KG_SCOPE_VIOLATION from query:relevant");
    }
    assert.equal(relevantRes.error.code, "KG_SCOPE_VIOLATION");

    const injectRes = await harness.invoke<{
      injectedEntities: EntityDto[];
      source: "kg-rules-mock";
    }>("knowledge:rules:inject", {
      projectId: harness.projectId,
      documentId: "doc-scope-guard",
      excerpt: "异项目角色",
      traceId: "trace-scope-guard",
      entityIds: [foreignEntityRes.data.id],
    });

    assert.equal(injectRes.ok, false);
    if (injectRes.ok) {
      assert.fail("expected KG_SCOPE_VIOLATION from rules injection");
    }
    assert.equal(injectRes.error.code, "KG_SCOPE_VIOLATION");

    const scopeViolationLogs = harness.logs.error.filter(
      (event) => event.event === "kg_scope_violation",
    );
    assert.equal(scopeViolationLogs.length > 0, true);
  } finally {
    harness.close();
  }
}
