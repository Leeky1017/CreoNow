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

  const projectId = "proj-aliases";
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

// S1
// should default aliases to empty array
{
  const harness = createTestHarness();
  try {
    const created = harness.service.entityCreate({
      projectId: harness.projectId,
      type: "character",
      name: "林默-S1",
      description: "侦探",
    });

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const entity = created.data as { aliases?: string[] };
    assert.deepEqual(entity.aliases, []);
  } finally {
    harness.close();
  }
}

// S2
// should store aliases when specified
{
  const harness = createTestHarness();
  try {
    const createArgs: EntityCreateWithAliases = {
      projectId: harness.projectId,
      type: "character",
      name: "林默-S2",
      aliases: ["小默", "默哥"],
    };
    const created = harness.service.entityCreate(
      createArgs as Parameters<KnowledgeGraphService["entityCreate"]>[0],
    );

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const entity = created.data as { aliases?: string[] };
    assert.deepEqual(entity.aliases, ["小默", "默哥"]);

    const row = harness.db
      .prepare<
        [string],
        { aliasesJson: string }
      >("SELECT aliases as aliasesJson FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.aliasesJson, '["小默","默哥"]');
  } finally {
    harness.close();
  }
}

// S3
// should update aliases
{
  const harness = createTestHarness();
  try {
    const created = harness.service.entityCreate({
      projectId: harness.projectId,
      type: "character",
      name: "林默-S3",
      description: "初始描述",
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const updateArgs: EntityUpdateWithAliases = {
      projectId: harness.projectId,
      id: created.data.id,
      expectedVersion: created.data.version,
      patch: {
        aliases: ["小默", "默哥", "林侦探"],
      },
    };
    const updated = harness.service.entityUpdate(
      updateArgs as Parameters<KnowledgeGraphService["entityUpdate"]>[0],
    );

    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate to succeed");
    }

    const entity = updated.data as { aliases?: string[] };
    assert.deepEqual(entity.aliases, ["小默", "默哥", "林侦探"]);

    const row = harness.db
      .prepare<
        [string],
        { aliasesJson: string }
      >("SELECT aliases as aliasesJson FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.aliasesJson, '["小默","默哥","林侦探"]');
  } finally {
    harness.close();
  }
}

// S4
// should reject non-array aliases
{
  const harness = createTestHarness();
  try {
    const createArgs: EntityCreateWithAliases = {
      projectId: harness.projectId,
      type: "character",
      name: "林默-S4",
      aliases: "not_an_array",
    };

    const rejected = harness.service.entityCreate(
      createArgs as Parameters<KnowledgeGraphService["entityCreate"]>[0],
    );

    assert.equal(rejected.ok, false);
    if (rejected.ok) {
      assert.fail("expected validation failure");
    }

    assert.equal(rejected.error.code, "VALIDATION_ERROR");

    const row = harness.db
      .prepare<
        [string, string],
        { count: number }
      >("SELECT COUNT(1) as count FROM kg_entities WHERE project_id = ? AND name = ?")
      .get(harness.projectId, "林默-S4");
    assert.equal(row?.count, 0);
  } finally {
    harness.close();
  }
}

// S5
// should filter empty strings from aliases
{
  const harness = createTestHarness();
  try {
    const createArgs: EntityCreateWithAliases = {
      projectId: harness.projectId,
      type: "character",
      name: "林默-S5",
      aliases: ["小默", "", "  "],
    };

    const created = harness.service.entityCreate(
      createArgs as Parameters<KnowledgeGraphService["entityCreate"]>[0],
    );

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const entity = created.data as { aliases?: string[] };
    assert.deepEqual(entity.aliases, ["小默"]);

    const row = harness.db
      .prepare<
        [string],
        { aliasesJson: string }
      >("SELECT aliases as aliasesJson FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.aliasesJson, '["小默"]');
  } finally {
    harness.close();
  }
}
