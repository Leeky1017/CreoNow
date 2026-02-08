import assert from "node:assert/strict";

import {
  KG_SUGGESTION_CHANNEL,
  type KgSuggestionEvent,
} from "../../../../../packages/shared/types/kg";
import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type RecognitionEnqueueDto = {
  taskId: string;
  status: "started" | "queued";
  queuePosition: number;
};

// KG3-R1-S3
// should suppress repeated suggestion in same session after dismiss
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const firstEnqueue = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-dismiss",
        sessionId: "session-dismiss",
        contentText: "他们在「废弃仓库」外停下。",
        traceId: "trace-dismiss-1",
      },
    );

    assert.equal(firstEnqueue.ok, true);
    if (!firstEnqueue.ok) {
      assert.fail("expected first enqueue success");
    }

    const hasFirstPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      1,
    );
    assert.equal(hasFirstPush, true);

    const firstPush = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    )[0]?.payload;
    assert.ok(firstPush);
    if (!firstPush) {
      assert.fail("expected first pushed suggestion");
    }

    const dismissRes = await harness.invoke<{ dismissed: true }>(
      "knowledge:suggestion:dismiss",
      {
        projectId: harness.projectId,
        sessionId: firstPush.sessionId,
        suggestionId: firstPush.suggestionId,
      },
    );

    assert.equal(dismissRes.ok, true);

    const secondEnqueue = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-dismiss",
        sessionId: "session-dismiss",
        contentText: "他们再次提到「废弃仓库」。",
        traceId: "trace-dismiss-2",
      },
    );

    assert.equal(secondEnqueue.ok, true);

    const hasSecondPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      1,
      150,
    );

    // same session + same candidate should remain suppressed
    assert.equal(hasSecondPush, false);
  } finally {
    harness.close();
  }
}
