import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type RecognitionEnqueueDto = {
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

async function waitForCondition(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 1_000,
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return true;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return false;
}

// KG-METRICS-SPLIT-S1
// Success task should increment completed once (mapped to succeeded+completed).
{
  const harness = createKnowledgeGraphIpcHarness();
  try {
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-metrics-split-success",
        sessionId: "session-metrics-split-success",
        contentText: "「林远」走进古城。",
        traceId: "trace-metrics-split-success",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success");
    }
    assert.notEqual(enqueueRes.data.taskId, null);

    const settled = await waitForCondition(async () => {
      const statsRes = await harness.invoke<RecognitionStatsDto>(
        "knowledge:recognition:stats",
        {
          projectId: harness.projectId,
          sessionId: "session-metrics-split-success",
        },
      );
      if (!statsRes.ok) {
        return false;
      }
      return (
        statsRes.data.completed === 1 &&
        statsRes.data.completionOrder.length === 1 &&
        statsRes.data.running === 0 &&
        statsRes.data.queued === 0
      );
    });

    assert.equal(settled, true, "expected success task metrics to settle");

    const statsRes = await harness.invoke<RecognitionStatsDto>(
      "knowledge:recognition:stats",
      {
        projectId: harness.projectId,
        sessionId: "session-metrics-split-success",
      },
    );
    assert.equal(statsRes.ok, true);
    if (!statsRes.ok) {
      assert.fail("expected stats success");
    }
    assert.equal(statsRes.data.completed, 1);
    assert.equal(statsRes.data.completionOrder.length, 1);
    assert.equal(statsRes.data.canceledTaskIds.length, 0);
    assert.equal(
      harness.logs.error.some(
        (entry) => entry.event === "kg_recognition_failed",
      ),
      false,
    );
  } finally {
    harness.close();
  }
}

// KG-METRICS-SPLIT-S2
// Failure task should increase failed path only and must not increase completed.
{
  const prevForceUnavailable =
    process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE;
  process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE = "1";

  const harness = createKnowledgeGraphIpcHarness();
  try {
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-metrics-split-failure",
        sessionId: "session-metrics-split-failure",
        contentText: "「林小雨」走进房间。",
        traceId: "trace-metrics-split-failure",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success for failure path");
    }

    const failedLogged = await waitForCondition(
      () =>
        harness.logs.error.some(
          (entry) => entry.event === "kg_recognition_unavailable",
        ),
      1_000,
    );
    assert.equal(failedLogged, true, "expected failure log event");

    const settled = await waitForCondition(async () => {
      const statsRes = await harness.invoke<RecognitionStatsDto>(
        "knowledge:recognition:stats",
        {
          projectId: harness.projectId,
          sessionId: "session-metrics-split-failure",
        },
      );
      if (!statsRes.ok) {
        return false;
      }
      return statsRes.data.running === 0 && statsRes.data.queued === 0;
    });
    assert.equal(settled, true, "expected failure task queue to settle");

    const statsRes = await harness.invoke<RecognitionStatsDto>(
      "knowledge:recognition:stats",
      {
        projectId: harness.projectId,
        sessionId: "session-metrics-split-failure",
      },
    );
    assert.equal(statsRes.ok, true);
    if (!statsRes.ok) {
      assert.fail("expected stats success");
    }

    assert.equal(
      harness.logs.error.filter(
        (entry) => entry.event === "kg_recognition_unavailable",
      ).length,
      1,
    );
    assert.equal(statsRes.data.completed, 0);
    assert.equal(statsRes.data.completionOrder.length, 0);
  } finally {
    harness.close();

    if (prevForceUnavailable === undefined) {
      delete process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE;
    } else {
      process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE =
        prevForceUnavailable;
    }
  }
}
