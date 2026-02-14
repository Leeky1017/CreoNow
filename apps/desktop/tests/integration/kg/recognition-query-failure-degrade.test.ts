import assert from "node:assert/strict";

import { KG_SUGGESTION_CHANNEL } from "@shared/types/kg";
import { createKnowledgeGraphIpcHarness } from "../../helpers/kg/harness";

type RelevantQueryDto = {
  items: Array<{ id: string; name: string }>;
  queryCostMs: number;
};

type RulesInjectionDto = {
  injectedEntities: Array<{
    id: string;
    name: string;
  }>;
  source: "kg-rules-mock";
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

// KG3-X-S1
// should return structured codes and fallback to empty rules injection
{
  const prevRecognitionUnavailable =
    process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE;
  const prevRelevantQueryFail =
    process.env.CREONOW_KG_FORCE_RELEVANT_QUERY_FAIL;

  process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE = "1";
  process.env.CREONOW_KG_FORCE_RELEVANT_QUERY_FAIL = "1";

  const harness = createKnowledgeGraphIpcHarness();

  try {
    const enqueueRes = await harness.invoke<{ taskId: string }>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-failure-degrade",
        sessionId: "session-failure-degrade",
        contentText: "「失败候选」应触发识别降级。",
        traceId: "trace-failure-degrade-1",
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

    const pushedSuggestions = harness.getPushEvents(KG_SUGGESTION_CHANNEL);
    assert.equal(pushedSuggestions.length, 0);

    const recognitionFailureLogs = harness.logs.error.filter(
      (event) => event.event === "kg_recognition_unavailable",
    );
    assert.equal(recognitionFailureLogs.length > 0, true);

    const relevantRes = await harness.invoke<RelevantQueryDto>(
      "knowledge:query:relevant",
      {
        projectId: harness.projectId,
        excerpt: "林远走进房间。",
        maxEntities: 5,
      },
    );

    assert.equal(relevantRes.ok, false);
    if (relevantRes.ok) {
      assert.fail("expected KG_RELEVANT_QUERY_FAILED");
    }

    assert.equal(relevantRes.error.code, "KG_RELEVANT_QUERY_FAILED");

    const injectRes = await harness.invoke<RulesInjectionDto>(
      "knowledge:rules:inject",
      {
        projectId: harness.projectId,
        documentId: "doc-failure-degrade",
        excerpt: "林远走进房间。",
        traceId: "trace-failure-degrade-2",
      },
    );

    assert.equal(injectRes.ok, true);
    if (!injectRes.ok) {
      assert.fail("expected fallback injection success");
    }

    assert.equal(injectRes.data.source, "kg-rules-mock");
    assert.deepEqual(injectRes.data.injectedEntities, []);
  } finally {
    harness.close();

    if (prevRecognitionUnavailable === undefined) {
      delete process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE;
    } else {
      process.env.CREONOW_KG_RECOGNITION_FORCE_UNAVAILABLE =
        prevRecognitionUnavailable;
    }

    if (prevRelevantQueryFail === undefined) {
      delete process.env.CREONOW_KG_FORCE_RELEVANT_QUERY_FAIL;
    } else {
      process.env.CREONOW_KG_FORCE_RELEVANT_QUERY_FAIL = prevRelevantQueryFail;
    }
  }
}
