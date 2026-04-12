/**
 * P3-01 — Aho-Corasick Entity Recognition Integration Tests
 *
 * These tests exercise the real Aho-Corasick recognizer (createAhoCorasickRecognizer)
 * wired into the full IPC pipeline. No mock recognizer is used: every entity is
 * pre-created in the in-memory SQLite DB and then matched by the Aho-Corasick
 * automaton inside `matchEntities()`.
 *
 * T1: Happy-path — alias-based matches bypass dedup, produce push events
 * T2: Alias matching — entity detected via alias, not canonical name
 * T3: never-excluded — entity with aiContextLevel "never" produces no suggestion
 * T4: always-unconditional — entity with aiContextLevel "always" yields candidate
 *     even without text mention (tested via recognizer directly)
 * T5: Empty DB — no entities → empty candidates, degraded: false
 * T6: Dedup — entity name appears in text → matched, but deduplicated by processTask
 * T7: Mixed entity types — character + location + item with aliases → all detected
 */
import assert from "node:assert/strict";

import {
  KG_SUGGESTION_CHANNEL,
  type KgSuggestionEvent,
} from "@shared/types/kg";
import { createAhoCorasickRecognizer } from "../../../main/src/services/kg/kgRecognitionRuntime";
import { createKnowledgeGraphService } from "../../../main/src/services/kg/kgService";
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
  aliases: string[];
  aiContextLevel: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// T1 — Happy-path: alias matches bypass dedup, produce push events
// ---------------------------------------------------------------------------
// Three entities with aliases. Text uses the aliases (not canonical names).
// Because matchedTerm (alias) ≠ entity.name (canonical), dedup cannot
// filter them → 3 push events expected.
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    // Create 3 entities with aliases and when_detected level
    const entitySpecs = [
      {
        type: "character" as const,
        name: "林小雨",
        aliases: ["小雨"],
        aiContextLevel: "when_detected" as const,
      },
      {
        type: "location" as const,
        name: "龙脊山脉",
        aliases: ["龙脊"],
        aiContextLevel: "when_detected" as const,
      },
      {
        type: "item" as const,
        name: "天火淬炼剑",
        aliases: ["天火剑"],
        aiContextLevel: "when_detected" as const,
      },
    ];

    for (const spec of entitySpecs) {
      const createRes = await harness.invoke<EntityDto>(
        "knowledge:entity:create",
        {
          projectId: harness.projectId,
          ...spec,
        },
      );
      assert.equal(createRes.ok, true, `create ${spec.name}`);
    }

    // Enqueue recognition using aliases in the text (NOT canonical names)
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t1",
        sessionId: "session-t1",
        contentText: "小雨手持天火剑登上龙脊，迎风而立。",
        traceId: "trace-t1",
      },
    );

    assert.equal(enqueueRes.ok, true);
    if (!enqueueRes.ok) {
      assert.fail("expected enqueue success");
    }

    // Wait for push events (one per unique candidate that passes dedup)
    const hasPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      3,
      2_000,
    );
    assert.equal(hasPush, true, "expected 3 suggestion push events");

    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 3);

    // Collect suggestion names — should be the ALIASES (matchedTerm)
    const names = new Set(pushEvents.map((event) => event.payload.name));
    assert.ok(names.has("小雨"), "expected alias 小雨");
    assert.ok(names.has("天火剑"), "expected alias 天火剑");
    assert.ok(names.has("龙脊"), "expected alias 龙脊");
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T2 — Alias matching: entity detected via alias in text
// ---------------------------------------------------------------------------
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "云中君",
        aliases: ["云君", "小云"],
        aiContextLevel: "when_detected",
      },
    );
    assert.equal(createRes.ok, true);

    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t2",
        sessionId: "session-t2",
        contentText: "小云静静地站在那里。",
        traceId: "trace-t2",
      },
    );
    assert.equal(enqueueRes.ok, true);

    const hasPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      1,
      2_000,
    );
    assert.equal(hasPush, true, "expected 1 suggestion for alias match");

    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 1);
    assert.equal(pushEvents[0]?.payload.name, "小云");
    assert.equal(pushEvents[0]?.payload.type, "character");
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T3 — never-excluded: entity with aiContextLevel "never" produces no suggestion
// ---------------------------------------------------------------------------
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    // Create an entity with "never" — should be skipped by matchEntities
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "影子刺客",
        aliases: ["影子"],
        aiContextLevel: "never",
      },
    );
    assert.equal(createRes.ok, true);

    // Also create a when_detected entity so we can verify recognition runs
    const controlCreate = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "location",
        name: "暗影谷",
        aliases: ["暗谷"],
        aiContextLevel: "when_detected",
      },
    );
    assert.equal(controlCreate.ok, true);

    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t3",
        sessionId: "session-t3",
        contentText: "影子在暗谷中穿行。",
        traceId: "trace-t3",
      },
    );
    assert.equal(enqueueRes.ok, true);

    // Only the "暗谷" alias should produce a push event (not "影子")
    const hasPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      1,
      2_000,
    );
    assert.equal(hasPush, true, "expected exactly 1 push event (暗谷)");

    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 1);
    assert.equal(pushEvents[0]?.payload.name, "暗谷");

    // Small grace period to ensure no additional push comes for the "never" entity
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const extra = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(extra.length, 0, "never entity should produce no suggestion");
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T4 — always-unconditional: tested via recognizer directly
// ---------------------------------------------------------------------------
// "always" entities are added as candidates even when their names don't appear
// in the text. However, processTask deduplicates against existing entities by
// (name, type), so an "always" entity whose name matches an existing entity
// will be filtered out in the IPC pipeline. We test the recognizer directly
// to verify the candidate is emitted.
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "世界观旁白",
        aiContextLevel: "always",
      },
    );
    assert.equal(createRes.ok, true);

    // Build a real Aho-Corasick recognizer against the same DB
    const kgService = createKnowledgeGraphService({
      db: harness.db,
      logger: {
        logPath: ":memory:",
        info: () => {},
        error: () => {},
      },
    });
    const recognizer = createAhoCorasickRecognizer({ kgService });

    // Text does NOT mention "世界观旁白" at all
    const result = await recognizer.recognize({
      projectId: harness.projectId,
      documentId: "doc-t4",
      sessionId: "session-t4",
      contentText: "这是一段完全无关的文字。",
      traceId: "trace-t4",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail("expected recognition success");
    }
    assert.equal(result.data.degraded, false);
    assert.ok(
      result.data.candidates.length >= 1,
      "always entity should produce at least 1 candidate",
    );

    const alwaysCandidate = result.data.candidates.find(
      (candidate) => candidate.name === "世界观旁白",
    );
    assert.ok(alwaysCandidate, "expected 世界观旁白 as candidate");
    assert.equal(alwaysCandidate?.type, "character");
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T5 — Empty DB: no entities → no candidates, degraded: false
// ---------------------------------------------------------------------------
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    // No entities created — enqueue recognition immediately
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t5",
        sessionId: "session-t5",
        contentText: "这段文字里没有任何实体。",
        traceId: "trace-t5",
      },
    );
    assert.equal(enqueueRes.ok, true);

    // Give recognition time to complete — no push events should appear
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 0, "empty DB should produce no push events");
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T6 — Dedup: canonical name match is deduplicated by processTask
// ---------------------------------------------------------------------------
// Entity "林远" exists. Text contains "林远". matchedTerm = "林远" = entity.name.
// processTask's dedup logic at L785-809 will filter this candidate because
// normalizeSuggestionKey matches an existing entity → no push event.
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林远",
        aiContextLevel: "when_detected",
      },
    );
    assert.equal(createRes.ok, true);

    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t6",
        sessionId: "session-t6",
        contentText: "林远走出山门，踏入风雪。",
        traceId: "trace-t6",
      },
    );
    assert.equal(enqueueRes.ok, true);

    // Give recognition time to complete — candidate should be deduplicated
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents.length,
      0,
      "canonical name match should be deduplicated (entity already exists)",
    );
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T7 — Mixed entity types: character + location + item with aliases
// ---------------------------------------------------------------------------
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const specs = [
      {
        type: "character" as const,
        name: "风无痕",
        aliases: ["无痕"],
        aiContextLevel: "when_detected" as const,
      },
      {
        type: "location" as const,
        name: "碧水湖",
        aliases: ["碧湖"],
        aiContextLevel: "when_detected" as const,
      },
      {
        type: "item" as const,
        name: "破界之弓",
        aliases: ["破界弓"],
        aiContextLevel: "when_detected" as const,
      },
      {
        type: "faction" as const,
        name: "星辰教",
        aliases: ["星教"],
        aiContextLevel: "when_detected" as const,
      },
    ];

    for (const spec of specs) {
      const createRes = await harness.invoke<EntityDto>(
        "knowledge:entity:create",
        {
          projectId: harness.projectId,
          ...spec,
        },
      );
      assert.equal(createRes.ok, true, `create ${spec.name}`);
    }

    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t7",
        sessionId: "session-t7",
        contentText: "无痕手持破界弓站在碧湖畔，星教教众在远方集结。",
        traceId: "trace-t7",
      },
    );
    assert.equal(enqueueRes.ok, true);

    const hasPush = await harness.waitForPushCount(
      KG_SUGGESTION_CHANNEL,
      4,
      2_000,
    );
    assert.equal(hasPush, true, "expected 4 suggestion push events");

    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 4);

    const byName = new Map(
      pushEvents.map((event) => [event.payload.name, event.payload.type]),
    );
    assert.equal(byName.get("无痕"), "character");
    assert.equal(byName.get("碧湖"), "location");
    assert.equal(byName.get("破界弓"), "item");
    assert.equal(byName.get("星教"), "faction");
  } finally {
    harness.close();
  }
}
