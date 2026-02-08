import assert from "node:assert/strict";

import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EnqueueDto = {
  taskId: string;
  status: "started" | "queued";
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

// KG3-X-S2
// should enqueue overflow tasks and allow cancellation while preserving order
{
  const prevDelayMs = process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS;
  process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS = "70";

  const harness = createKnowledgeGraphIpcHarness();

  try {
    const enqueued: EnqueueDto[] = [];

    for (let i = 1; i <= 7; i += 1) {
      const enqueueRes = await harness.invoke<EnqueueDto>(
        "knowledge:recognition:enqueue",
        {
          projectId: harness.projectId,
          documentId: "doc-queue-cancel",
          sessionId: "session-queue-cancel",
          contentText: `本段包含新角色「队列取消-${i}」。`,
          traceId: `trace-queue-cancel-${i}`,
        },
      );

      assert.equal(enqueueRes.ok, true);
      if (!enqueueRes.ok) {
        assert.fail("expected enqueue success");
      }
      enqueued.push(enqueueRes.data);
    }

    const queuedOnly = enqueued.filter((task) => task.status === "queued");
    assert.equal(queuedOnly.length >= 3, true);

    const taskToCancel = queuedOnly[1];
    const taskQueuedBefore = queuedOnly[0];
    const taskQueuedAfter = queuedOnly[2];

    assert.ok(taskToCancel);
    assert.ok(taskQueuedBefore);
    assert.ok(taskQueuedAfter);
    if (!taskToCancel || !taskQueuedBefore || !taskQueuedAfter) {
      assert.fail("expected enough queued tasks for cancel-order assertion");
    }

    const cancelRes = await harness.invoke<{ canceled: true }>(
      "knowledge:recognition:cancel",
      {
        projectId: harness.projectId,
        sessionId: "session-queue-cancel",
        taskId: taskToCancel.taskId,
      },
    );

    assert.equal(cancelRes.ok, true);

    const timeoutMs = 5_000;
    const startedAt = Date.now();
    let finished = false;

    while (Date.now() - startedAt <= timeoutMs) {
      const statsRes = await harness.invoke<RecognitionStatsDto>(
        "knowledge:recognition:stats",
        {
          projectId: harness.projectId,
          sessionId: "session-queue-cancel",
        },
      );

      assert.equal(statsRes.ok, true);
      if (!statsRes.ok) {
        assert.fail("expected stats success");
      }

      const done = statsRes.data.completed >= 6 && statsRes.data.queued === 0;
      if (!done) {
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
        continue;
      }

      assert.equal(
        statsRes.data.canceledTaskIds.includes(taskToCancel.taskId),
        true,
      );
      assert.equal(
        statsRes.data.completionOrder.includes(taskToCancel.taskId),
        false,
      );

      const beforeIdx = statsRes.data.completionOrder.indexOf(
        taskQueuedBefore.taskId,
      );
      const afterIdx = statsRes.data.completionOrder.indexOf(
        taskQueuedAfter.taskId,
      );

      assert.equal(beforeIdx >= 0, true);
      assert.equal(afterIdx >= 0, true);
      assert.equal(beforeIdx < afterIdx, true);
      finished = true;
      break;
    }

    assert.equal(finished, true);
  } finally {
    harness.close();

    if (prevDelayMs === undefined) {
      delete process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS;
    } else {
      process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS = prevDelayMs;
    }
  }
}
