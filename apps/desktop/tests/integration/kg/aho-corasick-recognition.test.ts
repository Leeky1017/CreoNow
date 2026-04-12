/**
 * P3-01 — Aho-Corasick Entity Recognition Integration Tests
 *
 * These tests exercise the real Aho-Corasick recognizer (createAhoCorasickRecognizer)
 * wired into the full IPC pipeline. No mock recognizer is used: every entity is
 * pre-created in the in-memory SQLite DB and then matched by the Aho-Corasick
 * automaton inside `matchEntities()`.
 *
 * T1: Happy-path — recognizer detects 3 aliases; pipeline deduplicates them all
 * T2: Alias matching — recognizer detects alias; pipeline deduplicates it
 * T3: never-excluded — entity with aiContextLevel "never" produces no candidate
 * T4: always-unconditional — entity with aiContextLevel "always" yields candidate
 *     even without text mention (tested via recognizer directly)
 * T5: Empty DB — no entities → empty candidates, degraded: false
 * T6: Dedup — entity name appears in text → matched, but deduplicated by processTask
 * T7: Mixed entity types — character + location + item + faction → all detected
 * T8: Alias-dedup regression — alias match is deduplicated (prevents duplicate
 *     entity creation when user accepts)
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
// T1 — Happy-path: recognizer detects 3 aliases; pipeline deduplicates all
// ---------------------------------------------------------------------------
// Three entities with aliases. Text uses the aliases (not canonical names).
// The recognizer produces candidates for each alias. processTask dedup now
// includes aliases → all candidates are filtered → 0 push events.
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
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

    // Verify recognizer DETECTS all 3 aliases (direct recognizer test)
    const kgService = createKnowledgeGraphService({
      db: harness.db,
      logger: {
        logPath: ":memory:",
        info: () => {},
        error: () => {},
      },
    });
    const recognizer = createAhoCorasickRecognizer({ kgService });

    const result = await recognizer.recognize({
      projectId: harness.projectId,
      documentId: "doc-t1",
      sessionId: "session-t1",
      contentText: "小雨手持天火剑登上龙脊，迎风而立。",
      traceId: "trace-t1",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail("expected recognition success");
    }
    assert.equal(result.data.degraded, false);

    const candidateNames = new Set(
      result.data.candidates.map((c) => c.name),
    );
    assert.ok(candidateNames.has("小雨"), "recognizer should detect alias 小雨");
    assert.ok(candidateNames.has("天火剑"), "recognizer should detect alias 天火剑");
    assert.ok(candidateNames.has("龙脊"), "recognizer should detect alias 龙脊");

    // Verify pipeline DEDUPLICATES all (aliases now in dedup set)
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t1-ipc",
        sessionId: "session-t1-ipc",
        contentText: "小雨手持天火剑登上龙脊，迎风而立。",
        traceId: "trace-t1-ipc",
      },
    );
    assert.equal(enqueueRes.ok, true);

    // Give recognition time to complete — all candidates deduplicated → 0 push events
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents.length,
      0,
      "alias matches should be deduplicated (aliases belong to existing entities)",
    );
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T2 — Alias matching: recognizer detects alias; pipeline deduplicates it
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

    // Verify recognizer detects the alias
    const kgService = createKnowledgeGraphService({
      db: harness.db,
      logger: {
        logPath: ":memory:",
        info: () => {},
        error: () => {},
      },
    });
    const recognizer = createAhoCorasickRecognizer({ kgService });

    const result = await recognizer.recognize({
      projectId: harness.projectId,
      documentId: "doc-t2",
      sessionId: "session-t2",
      contentText: "小云静静地站在那里。",
      traceId: "trace-t2",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail("expected recognition success");
    }
    const aliasCandidate = result.data.candidates.find(
      (c) => c.name === "小云",
    );
    assert.ok(aliasCandidate, "recognizer should detect alias 小云");
    assert.equal(aliasCandidate?.type, "character");

    // Verify pipeline deduplicates the alias match
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t2-ipc",
        sessionId: "session-t2-ipc",
        contentText: "小云静静地站在那里。",
        traceId: "trace-t2-ipc",
      },
    );
    assert.equal(enqueueRes.ok, true);

    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents.length,
      0,
      "alias 小云 should be deduplicated (belongs to existing entity 云中君)",
    );
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T3 — never-excluded: entity with aiContextLevel "never" produces no candidate
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

    // Also create a when_detected entity to verify recognition runs
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

    // Verify recognizer: "影子" NOT detected, "暗谷" IS detected
    const kgService = createKnowledgeGraphService({
      db: harness.db,
      logger: {
        logPath: ":memory:",
        info: () => {},
        error: () => {},
      },
    });
    const recognizer = createAhoCorasickRecognizer({ kgService });

    const result = await recognizer.recognize({
      projectId: harness.projectId,
      documentId: "doc-t3",
      sessionId: "session-t3",
      contentText: "影子在暗谷中穿行。",
      traceId: "trace-t3",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail("expected recognition success");
    }

    const candidateNames = new Set(
      result.data.candidates.map((c) => c.name),
    );
    assert.ok(
      !candidateNames.has("影子"),
      "never-entity alias should NOT be detected",
    );
    assert.ok(
      !candidateNames.has("影子刺客"),
      "never-entity name should NOT be detected",
    );
    assert.ok(
      candidateNames.has("暗谷"),
      "when_detected entity alias should be detected",
    );

    // Verify pipeline: 0 push events (暗谷 is deduplicated as alias of existing entity)
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t3-ipc",
        sessionId: "session-t3-ipc",
        contentText: "影子在暗谷中穿行。",
        traceId: "trace-t3-ipc",
      },
    );
    assert.equal(enqueueRes.ok, true);

    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(pushEvents.length, 0, "no push events expected");
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
// processTask's dedup logic will filter this candidate because
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
// T7 — Mixed entity types: character + location + item + faction → all detected
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

    // Verify recognizer detects all 4 entity types via aliases
    const kgService = createKnowledgeGraphService({
      db: harness.db,
      logger: {
        logPath: ":memory:",
        info: () => {},
        error: () => {},
      },
    });
    const recognizer = createAhoCorasickRecognizer({ kgService });

    const result = await recognizer.recognize({
      projectId: harness.projectId,
      documentId: "doc-t7",
      sessionId: "session-t7",
      contentText: "无痕手持破界弓站在碧湖畔，星教教众在远方集结。",
      traceId: "trace-t7",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail("expected recognition success");
    }

    const byName = new Map(
      result.data.candidates.map((c) => [c.name, c.type]),
    );
    assert.equal(byName.get("无痕"), "character", "recognizer should detect character alias");
    assert.equal(byName.get("碧湖"), "location", "recognizer should detect location alias");
    assert.equal(byName.get("破界弓"), "item", "recognizer should detect item alias");
    assert.equal(byName.get("星教"), "faction", "recognizer should detect faction alias");

    // Verify pipeline deduplicates all alias matches
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t7-ipc",
        sessionId: "session-t7-ipc",
        contentText: "无痕手持破界弓站在碧湖畔，星教教众在远方集结。",
        traceId: "trace-t7-ipc",
      },
    );
    assert.equal(enqueueRes.ok, true);

    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents.length,
      0,
      "all alias matches should be deduplicated (aliases belong to existing entities)",
    );
  } finally {
    harness.close();
  }
}

// ---------------------------------------------------------------------------
// T8 — Alias-dedup regression: alias match must NOT create duplicate entity
// ---------------------------------------------------------------------------
// Reproduces the exact Duck audit finding:
//   1. Entity "林小雨" with alias "小雨" exists
//   2. Text mentions "小雨"
//   3. Recognizer emits candidate name: "小雨"
//   4. Before fix: dedup only checked canonical name "林小雨" → alias "小雨"
//      bypassed dedup → suggestion pushed → accepting creates duplicate entity
//   5. After fix: dedup includes aliases → "小雨" is in dedup set → filtered
{
  const harness = createKnowledgeGraphIpcHarness();

  try {
    const createRes = await harness.invoke<EntityDto>(
      "knowledge:entity:create",
      {
        projectId: harness.projectId,
        type: "character",
        name: "林小雨",
        aliases: ["小雨", "雨儿"],
        aiContextLevel: "when_detected",
      },
    );
    assert.equal(createRes.ok, true);

    // Use alias "小雨" in text — should be detected but deduplicated
    const enqueueRes = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t8",
        sessionId: "session-t8",
        contentText: "小雨站在窗前，望着远方。",
        traceId: "trace-t8",
      },
    );
    assert.equal(enqueueRes.ok, true);

    // Wait — should get 0 push events (alias is deduplicated)
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents.length,
      0,
      "alias match 小雨 must NOT produce suggestion (prevents duplicate entity creation)",
    );

    // Also try "雨儿" alias
    const enqueueRes2 = await harness.invoke<RecognitionEnqueueDto>(
      "knowledge:recognition:enqueue",
      {
        projectId: harness.projectId,
        documentId: "doc-t8b",
        sessionId: "session-t8b",
        contentText: "雨儿轻声叹了口气。",
        traceId: "trace-t8b",
      },
    );
    assert.equal(enqueueRes2.ok, true);

    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const pushEvents2 = harness.takePushEvents<KgSuggestionEvent>(
      KG_SUGGESTION_CHANNEL,
    );
    assert.equal(
      pushEvents2.length,
      0,
      "alias match 雨儿 must NOT produce suggestion (prevents duplicate entity creation)",
    );
  } finally {
    harness.close();
  }
}
