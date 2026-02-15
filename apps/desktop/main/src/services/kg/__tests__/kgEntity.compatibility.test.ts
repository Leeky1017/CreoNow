import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeGraphService,
} from "../kgService";

function createTestHarness(): {
  db: Database.Database;
  projectId: string;
  legacyEntityId: string;
  service: KnowledgeGraphService;
  close: () => void;
} {
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

  const projectId = "proj-last-seen-s2";
  const legacyEntityId = "character-legacy";
  const ts = "2026-02-15T00:00:00.000Z";

  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(projectId);
  db.prepare(
    "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, ai_context_level, aliases, last_seen_state, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    legacyEntityId,
    projectId,
    "character",
    "character-legacy",
    "legacy-desc",
    "{}",
    "when_detected",
    "[]",
    null,
    1,
    ts,
    ts,
  );

  const logger: Logger = {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };

  return {
    db,
    projectId,
    legacyEntityId,
    service: createKnowledgeGraphService({ db, logger }),
    close: () => db.close(),
  };
}

// S3-KGLS-S2
// legacy entities with null lastSeenState remain readable and updatable
{
  const harness = createTestHarness();
  try {
    const readLegacy = harness.service.entityRead({
      projectId: harness.projectId,
      id: harness.legacyEntityId,
    });

    assert.equal(readLegacy.ok, true);
    if (!readLegacy.ok) {
      assert.fail("expected entityRead for legacy entity to succeed");
    }

    const readData = readLegacy.data as { lastSeenState?: string };
    assert.equal("lastSeenState" in readData, true);
    assert.equal(readData.lastSeenState, undefined);

    const updated = harness.service.entityUpdate({
      projectId: harness.projectId,
      id: harness.legacyEntityId,
      expectedVersion: readLegacy.data.version,
      patch: {
        description: "legacy-desc-updated",
      },
    });

    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate for legacy entity to succeed");
    }

    const updatedData = updated.data as {
      description: string;
      lastSeenState?: string;
    };
    assert.equal(updatedData.description, "legacy-desc-updated");
    assert.equal("lastSeenState" in updatedData, true);
    assert.equal(updatedData.lastSeenState, undefined);

    const row = harness.db
      .prepare<
        [string],
        { description: string; lastSeenState: string | null }
      >(
        "SELECT description, last_seen_state as lastSeenState FROM kg_entities WHERE id = ?",
      )
      .get(harness.legacyEntityId);

    assert.equal(row?.description, "legacy-desc-updated");
    assert.equal(row?.lastSeenState, null);
  } finally {
    harness.close();
  }
}
