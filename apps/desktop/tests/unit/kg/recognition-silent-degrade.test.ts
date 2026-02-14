import assert from "node:assert/strict";

import { KG_SUGGESTION_CHANNEL } from "@shared/types/kg";
import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type EntityDto = {
  id: string;
  name: string;
};

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error(timeoutMessage);
}

// KG3-R1-S4
// should log recognition failure without toast and keep manual create available
{
  const prevForceUnavailable =
    process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE;
  process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE = "1";

  const harness = createKnowledgeGraphIpcHarness();
  try {
    const enqueueRes = await harness.invoke<{ taskId: string }>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-fail",
        sessionId: "session-fail",
        contentText: "「林小雨」走进房间。",
        traceId: "trace-fail-1",
      },
    );

    assert.equal(enqueueRes.ok, true);

    await waitForCondition(
      () =>
        harness.logs.error.some(
          (event) => event.event === "kg_recognition_unavailable",
        ),
      2_000,
      "expected kg_recognition_unavailable log",
    );

    const pushEvents = harness.getPushEvents(KG_SUGGESTION_CHANNEL);
    assert.equal(pushEvents.length, 0);

    const errorEvents = harness.logs.error.filter(
      (event) => event.event === "kg_recognition_unavailable",
    );
    assert.equal(errorEvents.length > 0, true);

    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "手动创建角色",
      },
    );

    assert.equal(createRes.ok, true);
    if (!createRes.ok) {
      assert.fail("expected manual create to remain available");
    }
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
