import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

type EntityDto = { id: string };

type SubgraphDto = {
  nodeCount: number;
  edgeCount: number;
  queryCostMs: number;
};

// KG1-A-S1
// should satisfy CRUD and subgraph latency baseline at target dataset
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const createDurations: number[] = [];
    const subgraphDurations: number[] = [];
    const ids: string[] = [];

    for (let i = 0; i < 200; i += 1) {
      const startedAt = performance.now();
      const createRes = await harness.invoke<EntityDto>(
        "knowledge:entity:create",
        {
          projectId: harness.projectId,
          type: "character",
          name: `角色-${i}`,
        },
      );
      createDurations.push(performance.now() - startedAt);

      assert.equal(createRes.ok, true);
      if (!createRes.ok) {
        assert.fail("expected success");
      }
      ids.push(createRes.data.id);
    }

    for (let i = 0; i < ids.length - 1; i += 1) {
      const sourceEntityId = ids[i];
      const targetEntityId = ids[i + 1];
      assert.ok(sourceEntityId);
      assert.ok(targetEntityId);

      const relationRes = await harness.invoke("knowledge:relation:create", {
        projectId: harness.projectId,
        sourceEntityId,
        targetEntityId,
        relationType: "ally",
      });
      assert.equal(relationRes.ok, true);
    }

    for (let i = 0; i < 50; i += 1) {
      const centerEntityId = ids[i];
      assert.ok(centerEntityId);

      const startedAt = performance.now();
      const subgraphRes = await harness.invoke<SubgraphDto>(
        "knowledge:query:subgraph",
        {
          projectId: harness.projectId,
          centerEntityId,
          k: 2,
        },
      );
      subgraphDurations.push(performance.now() - startedAt);

      assert.equal(subgraphRes.ok, true);
      if (!subgraphRes.ok) {
        assert.fail("expected success");
      }
      assert.equal(subgraphRes.data.nodeCount >= 1, true);
      assert.equal(subgraphRes.data.edgeCount >= 0, true);
      assert.equal(Number.isFinite(subgraphRes.data.queryCostMs), true);
    }

    const createP95 = percentile(createDurations, 95);
    const subgraphP95 = percentile(subgraphDurations, 95);

    assert.equal(createP95 < 220, true);
    assert.equal(subgraphP95 < 300, true);
  } finally {
    harness.close();
  }
}
