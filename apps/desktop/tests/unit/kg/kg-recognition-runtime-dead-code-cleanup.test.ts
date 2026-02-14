import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KG_SUGGESTION_CHANNEL,
  type KgSuggestionEvent,
} from "@shared/types/kg";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.resolve(
  __dirname,
  "../../../main/src/services/kg/kgRecognitionRuntime.ts",
);
const runtimeSource = readFileSync(runtimePath, "utf8");

// S2-DC-KG-S1
// runtime should call KG service directly without one-line wrapper function.
assert.equal(
  runtimeSource.includes("function service()"),
  false,
  "S2-DC-KG-S1: kgRecognitionRuntime should not keep service() wrapper",
);

// S2-DC-KG-S1
// recognition flow semantics must stay intact after wrapper removal.
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-s2-cleanup",
        sessionId: "session-s2-cleanup",
        contentText: "「林墨」在古城门前停下。",
        traceId: "trace-s2-cleanup",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected recognition enqueue success");
    }

    assert.equal(
      enqueueRes.data.status === "started" || enqueueRes.data.status === "queued",
      true,
    );

    const hasSuggestion = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      1,
      1_000,
    );
    assert.equal(hasSuggestion, true, "expected suggestion push event");

    const suggestion = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    )[0]?.payload;
    assert.ok(suggestion);
    if (!suggestion) {
      assert.fail("missing pushed suggestion payload");
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
      assert.fail("expected accept suggestion success");
    }

    const listRes = await harness.invoke<{ items: EntityDto[] }>(
      "knowledge:entity:list",
      {
        projectId: harness.projectId,
      },
    );
    assert.equal(listRes.ok, true);
    if (!listRes.ok) {
      assert.fail("expected entity list success");
    }

    const accepted = listRes.data.items.find((item) => item.id === acceptRes.data.id);
    assert.ok(accepted, "accepted suggestion must be discoverable via entity:list");

    const hasEntityListFailureLog = harness.logs.error.some(
      (entry) => entry.event === "kg_recognition_entity_list_failed",
    );
    assert.equal(
      hasEntityListFailureLog,
      false,
      "S2-DC-KG-S1: wrapper cleanup must not alter entity:list success semantics",
    );
  } finally {
    harness.close();
  }
}
