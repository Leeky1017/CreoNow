import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createKnowledgeGraphService } from "../kgService";
import { createStateExtractor } from "../stateExtractor";

type LogEntry = {
  event: string;
  data?: Record<string, unknown>;
};

function createLogger(entries: {
  info: LogEntry[];
  error: LogEntry[];
}): Logger {
  return {
    logPath: "<test>",
    info: (event, data) => entries.info.push({ event, data }),
    error: (event, data) => entries.error.push({ event, data }),
  };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY
    );

    CREATE TABLE kg_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      attributes_json TEXT NOT NULL DEFAULT '{}',
      ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
      aliases TEXT NOT NULL DEFAULT '[]',
      last_seen_state TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX idx_kg_entities_project_type_name
      ON kg_entities(project_id, type, lower(trim(name)));
  `);

  return db;
}

// S3-STE-S1
// extracts state changes and updates matched entities
{
  const db = createDb();
  const logs = { info: [] as LogEntry[], error: [] as LogEntry[] };
  const logger = createLogger(logs);
  const projectId = "proj-state-s1";

  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(projectId);

  const kg = createKnowledgeGraphService({ db, logger });
  const createdA = kg.entityCreate({
    projectId,
    type: "character",
    name: "林远",
  });
  const createdB = kg.entityCreate({
    projectId,
    type: "character",
    name: "张薇",
  });

  assert.equal(createdA.ok, true);
  assert.equal(createdB.ok, true);

  const extractor = createStateExtractor({
    db,
    logger,
    llmClient: {
      extract: async () => ({
        ok: true,
        data: {
          stateChanges: [
            { characterName: "林远", state: "受伤但清醒" },
            { characterName: "张薇", state: "疲惫但坚定" },
          ],
        },
      }),
    },
  });

  const result = await extractor.extractAndApply({
    projectId,
    documentId: "chapter-10",
    contentText: "林远在雨夜受伤，张薇仍然保持冷静推进行动。",
    traceId: "trace-s3-ste-s1",
  });

  assert.equal(result.status, "applied");
  assert.equal(result.updatedEntityIds.length, 2);
  assert.deepEqual(result.unmatchedCharacters, []);

  const listed = kg.entityList({ projectId });
  assert.equal(listed.ok, true);
  if (!listed.ok) {
    throw new Error("expected entityList to succeed");
  }

  const byName = new Map(listed.data.items.map((item) => [item.name, item]));
  assert.equal(byName.get("林远")?.lastSeenState, "受伤但清醒");
  assert.equal(byName.get("张薇")?.lastSeenState, "疲惫但坚定");

  assert.equal(logs.error.length, 0);

  db.close();
}

// S3-STE-S2
// skips unknown entities and emits structured warning
{
  const db = createDb();
  const logs = { info: [] as LogEntry[], error: [] as LogEntry[] };
  const logger = createLogger(logs);
  const projectId = "proj-state-s2";

  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(projectId);

  const kg = createKnowledgeGraphService({ db, logger });
  const created = kg.entityCreate({
    projectId,
    type: "character",
    name: "林远",
  });
  assert.equal(created.ok, true);

  const extractor = createStateExtractor({
    db,
    logger,
    llmClient: {
      extract: async () => ({
        ok: true,
        data: {
          stateChanges: [
            { characterName: "林远", state: "轻伤" },
            { characterName: "沈墨", state: "失联" },
          ],
        },
      }),
    },
  });

  const result = await extractor.extractAndApply({
    projectId,
    documentId: "chapter-11",
    contentText: "林远与沈墨在码头分散撤离。",
    traceId: "trace-s3-ste-s2",
  });

  assert.equal(result.status, "applied");
  assert.deepEqual(result.unmatchedCharacters, ["沈墨"]);
  assert.equal(result.updatedEntityIds.length, 1);

  const listed = kg.entityList({ projectId });
  assert.equal(listed.ok, true);
  if (!listed.ok) {
    throw new Error("expected entityList to succeed");
  }

  const only = listed.data.items.find((item) => item.name === "林远");
  assert.equal(only?.lastSeenState, "轻伤");

  const warning = logs.info.find(
    (entry) => entry.event === "kg_state_extraction_entity_unmatched",
  );
  assert.ok(warning, "must emit structured unmatched warning");
  assert.equal(warning?.data?.character_name, "沈墨");
  assert.equal(warning?.data?.document_id, "chapter-11");
  assert.equal(typeof warning?.data?.chapter_excerpt, "string");

  db.close();
}
