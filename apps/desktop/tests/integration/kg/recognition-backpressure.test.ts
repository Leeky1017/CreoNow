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

// KG3-A-S1
// should keep max 4 concurrent recognition workers and preserve manual entity actions
{
  const prevDelayMs = process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS;
  process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS = "50";

  const harness = createKnowledgeGraphIpcHarness();

  try {
    const tasks: EnqueueDto[] = [];
    for (let i = 0; i < 20; i += 1) {
      const enqueueRes = await harness.invoke<EnqueueDto>(
        "knowledge:recognition:enqueue",
        {
          projectId: harness.projectId,
          documentId: "doc-backpressure",
          sessionId: "session-backpressure",
          contentText: `本段出现了新角色「队列角色-${i}」。`,
          traceId: `trace-backpressure-${i}`,
        },
      );

      assert.equal(enqueueRes.ok, true);
      if (!enqueueRes.ok) {
        assert.fail("expected enqueue success");
      }
      tasks.push(enqueueRes.data);
    }

    const startedCount = tasks.filter(
      (task) => task.status === "started",
    ).length;
    const queuedCount = tasks.filter((task) => task.status === "queued").length;
    assert.equal(startedCount >= 1, true);
    assert.equal(queuedCount >= 1, true);

    const manualCreateRes = await harness.invoke<{ id: string }>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "手动创建不受阻塞",
      },
    );

    assert.equal(manualCreateRes.ok, true);

    const timeoutMs = 5_000;
    const startedAt = Date.now();
    let drained = false;
    while (Date.now() - startedAt <= timeoutMs) {
      const statsRes = await harness.invoke<RecognitionStatsDto>(
        "knowledge:recognition:stats",
        {
          projectId: harness.projectId,
          sessionId: "session-backpressure",
        },
      );

      assert.equal(statsRes.ok, true);
      if (!statsRes.ok) {
        assert.fail("expected stats success");
      }

      if (statsRes.data.completed >= 20) {
        assert.equal(statsRes.data.maxConcurrency, 4);
        assert.equal(statsRes.data.peakRunning <= 4, true);
        drained = true;
        break;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
    }

    assert.equal(drained, true);
  } finally {
    harness.close();

    if (prevDelayMs === undefined) {
      delete process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS;
    } else {
      process.env.CREONOW_KG_RECOGNITION_MOCK_DELAY_MS = prevDelayMs;
    }
  }
}
