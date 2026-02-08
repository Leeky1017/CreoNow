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

type EntityDto = {
  id: string;
  projectId: string;
  type: "character" | "location" | "event" | "item" | "faction";
  name: string;
  description: string;
  attributes: Record<string, string>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

// KG3-R1-S2
// should create entity via knowledge:suggestion:accept and open entity detail
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-accept",
        sessionId: "session-accept",
        contentText: "「林小雨」在夜色中第一次出现。",
        traceId: "trace-accept-1",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success");
    }

    const hasPush = await harness.waitForPushCount(KG_SUGGESTION_CHANNEL, 1);
    assert.equal(hasPush, true);

    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    const suggestion = pushEvents[0]?.payload;
    assert.ok(suggestion);
    if (!suggestion) {
      assert.fail("expected pushed suggestion");
    }

    const acceptRes = await harness.invoke<EntityDto>(
      "knowledge:suggestion:accept",
      {
        projectId: harness.projectId,
        sessionId: suggestion.sessionId,
        suggestionId: suggestion.suggestionId,
      },
    );

    assert.equal(acceptRes.ok, true);
    if (!acceptRes.ok) {
      assert.fail("expected accept success");
    }

    assert.equal(acceptRes.data.name.includes("林小雨"), true);
    assert.equal(acceptRes.data.type, "character");

    const readRes = await harness.invoke<EntityDto>("knowledge:entity:read", {
      projectId: harness.projectId,
      id: acceptRes.data.id,
    });

    assert.equal(readRes.ok, true);
    if (!readRes.ok) {
      assert.fail("expected entity read success");
    }

    assert.equal(readRes.data.name, acceptRes.data.name);
    assert.equal(readRes.data.type, "character");
  } finally {
    harness.close();
  }
}
