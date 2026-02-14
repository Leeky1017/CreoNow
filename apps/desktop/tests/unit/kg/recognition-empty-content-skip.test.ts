import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EnqueueDto = {
  taskId: string | null;
  status: "started" | "queued" | "skipped";
  queuePosition: number;
};

type RecognitionStatsDto = {
  running: number;
  queued: number;
  maxConcurrency: number;
  peakRunning: number;
  completed: number;
  completionOrder: string[];
  canceledTaskIds: string[];
};

// KG3-S0-S1
// empty content returns skipped not queued
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const enqueueRes = await harness.invoke<EnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-empty-s1",
        sessionId: "session-empty-s1",
        contentText: "   ",
        traceId: "trace-empty-s1",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success for empty content");
    }

    assert.equal(enqueueRes.data.status, "skipped");
    assert.equal(enqueueRes.data.taskId, null);
    assert.equal(enqueueRes.data.queuePosition, 0);
  } finally {
    harness.close();
  }
}

// KG3-S0-S2
// empty content result is non-trackable when taskId is null
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const enqueueRes = await harness.invoke<EnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-empty-s2",
        sessionId: "session-empty-s2",
        contentText: "\n\t  ",
        traceId: "trace-empty-s2",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success for empty content");
    }

    const isTrackable = enqueueRes.data.taskId !== null;
    assert.equal(isTrackable, false);

    const statsRes = await harness.invoke<RecognitionStatsDto>(
      "knowledge:recognition:stats",
      {
        projectId: harness.projectId,
        sessionId: "session-empty-s2",
      },
    );

    assert.equal(statsRes.ok, true);
    if (!statsRes.ok) {
      assert.fail("expected stats success");
    }

    assert.equal(statsRes.data.running, 0);
    assert.equal(statsRes.data.queued, 0);
    assert.equal(statsRes.data.completed, 0);
    assert.equal(statsRes.data.completionOrder.length, 0);
    assert.equal(statsRes.data.canceledTaskIds.length, 0);
  } finally {
    harness.close();
  }
}
