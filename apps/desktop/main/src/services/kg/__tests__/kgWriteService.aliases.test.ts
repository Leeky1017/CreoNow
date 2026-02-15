import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeGraphService,
} from "../kgService";

type EntityCreateWithAliases = Omit<
  Parameters<KnowledgeGraphService["entityCreate"]>[0],
  "aliases"
> & {
  aliases?: unknown;
};

type EntityUpdateWithAliases = Omit<
  Parameters<KnowledgeGraphService["entityUpdate"]>[0],
  "patch"
> & {
  patch: Omit<
    Parameters<KnowledgeGraphService["entityUpdate"]>[0]["patch"],
    "aliases"
  > & {
    aliases?: unknown;
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
      last_seen_state TEXT,
      ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
      aliases TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX idx_kg_entities_project_type_name
      ON kg_entities(project_id, type, lower(trim(name)));
  `);

  const projectId = "proj-kg-write-aliases";
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

// KG-S2-AL-S1
// persists aliases on create/update/read
{
  const harness = createTestHarness();
  try {
    const createArgs: EntityCreateWithAliases = {
      projectId: harness.projectId,
      type: "character",
      name: "林默-S1",
      aliases: ["小默", "默哥"],
    };

    const created = harness.service.entityCreate(
      createArgs as Parameters<KnowledgeGraphService["entityCreate"]>[0],
    );

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    assert.deepEqual(created.data.aliases, ["小默", "默哥"]);

    const readAfterCreate = harness.service.entityRead({
      projectId: harness.projectId,
      id: created.data.id,
    });
    assert.equal(readAfterCreate.ok, true);
    if (!readAfterCreate.ok) {
      assert.fail("expected entityRead after create to succeed");
    }
    assert.deepEqual(readAfterCreate.data.aliases, ["小默", "默哥"]);

    const updateArgs: EntityUpdateWithAliases = {
      projectId: harness.projectId,
      id: created.data.id,
      expectedVersion: created.data.version,
      patch: {
        aliases: ["林侦探", "默哥"],
      },
    };

    const updated = harness.service.entityUpdate(
      updateArgs as Parameters<KnowledgeGraphService["entityUpdate"]>[0],
    );

    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate to succeed");
    }
    assert.deepEqual(updated.data.aliases, ["林侦探", "默哥"]);

    const readAfterUpdate = harness.service.entityRead({
      projectId: harness.projectId,
      id: created.data.id,
    });
    assert.equal(readAfterUpdate.ok, true);
    if (!readAfterUpdate.ok) {
      assert.fail("expected entityRead after update to succeed");
    }
    assert.deepEqual(readAfterUpdate.data.aliases, ["林侦探", "默哥"]);
  } finally {
    harness.close();
  }
}

// KG-S2-AL-S2
// handles empty long and duplicate aliases
{
  const harness = createTestHarness();
  try {
    const tooLongAlias = "超".repeat(257);
    const createArgs: EntityCreateWithAliases = {
      projectId: harness.projectId,
      type: "character",
      name: "林默-S2",
      aliases: ["小默", "", "  ", tooLongAlias, "小默", " 默哥 ", "默哥"],
    };

    const created = harness.service.entityCreate(
      createArgs as Parameters<KnowledgeGraphService["entityCreate"]>[0],
    );

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to keep write-path alive");
    }

    assert.deepEqual(created.data.aliases, ["小默", "默哥"]);

    const updateArgs: EntityUpdateWithAliases = {
      projectId: harness.projectId,
      id: created.data.id,
      expectedVersion: created.data.version,
      patch: {
        aliases: ["", "林默", "林默", tooLongAlias, " 林侦探 "],
      },
    };

    const updated = harness.service.entityUpdate(
      updateArgs as Parameters<KnowledgeGraphService["entityUpdate"]>[0],
    );

    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate to keep write-path alive");
    }

    assert.deepEqual(updated.data.aliases, ["林默", "林侦探"]);

    const readAfterUpdate = harness.service.entityRead({
      projectId: harness.projectId,
      id: created.data.id,
    });
    assert.equal(readAfterUpdate.ok, true);
    if (!readAfterUpdate.ok) {
      assert.fail("expected entityRead after boundary update to succeed");
    }

    assert.deepEqual(readAfterUpdate.data.aliases, ["林默", "林侦探"]);
  } finally {
    harness.close();
  }
}
