import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeGraphService,
} from "../kgService";

type EntityUpdateWithLastSeen = Omit<
  Parameters<KnowledgeGraphService["entityUpdate"]>[0],
  "patch"
> & {
  patch: Parameters<KnowledgeGraphService["entityUpdate"]>[0]["patch"] & {
    lastSeenState?: unknown;
  };
};

function createTestHarness(): {
  db: Database.Database;
  projectId: string;
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

  const projectId = "proj-last-seen-s1";
  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(projectId);

  const logger: Logger = {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };

  return {
    db,
    projectId,
    service: createKnowledgeGraphService({ db, logger }),
    close: () => db.close(),
  };
}

// S3-KGLS-S1
// updates lastSeenState and reads it back
{
  const harness = createTestHarness();
  try {
    const created = harness.service.entityCreate({
      projectId: harness.projectId,
      type: "character",
      name: "character-1",
    });

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const updateArgs: EntityUpdateWithLastSeen = {
      projectId: harness.projectId,
      id: created.data.id,
      expectedVersion: created.data.version,
      patch: {
        lastSeenState: "受伤但清醒",
      },
    };

    const updated = harness.service.entityUpdate(
      updateArgs as Parameters<KnowledgeGraphService["entityUpdate"]>[0],
    );
    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate to succeed");
    }

    const row = harness.db
      .prepare<
        [string],
        { lastSeenState: string | null }
      >("SELECT last_seen_state as lastSeenState FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.lastSeenState, "受伤但清醒");

    const readBack = harness.service.entityRead({
      projectId: harness.projectId,
      id: created.data.id,
    });

    assert.equal(readBack.ok, true);
    if (!readBack.ok) {
      assert.fail("expected entityRead to succeed");
    }

    const readData = readBack.data as { lastSeenState?: string };
    assert.equal(readData.lastSeenState, "受伤但清醒");
  } finally {
    harness.close();
  }
}
