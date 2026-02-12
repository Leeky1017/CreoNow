import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeGraphService,
} from "../kgService";

type EntityCreateWithAiContext = Parameters<
  KnowledgeGraphService["entityCreate"]
>[0] & {
  aiContextLevel?: string;
};

type EntityUpdateWithAiContext = Parameters<
  KnowledgeGraphService["entityUpdate"]
>[0] & {
  patch: Parameters<KnowledgeGraphService["entityUpdate"]>[0]["patch"] & {
    aiContextLevel?: string;
  };
};

type EntityListWithAiContextFilter = Parameters<
  KnowledgeGraphService["entityList"]
>[0] & {
  filter?: {
    aiContextLevel?: string;
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
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX idx_kg_entities_project_type_name
      ON kg_entities(project_id, type, lower(trim(name)));
  `);

  const projectId = "proj-context-level";
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
// should default aiContextLevel to when_detected when omitted on create
{
  const harness = createTestHarness();
  try {
    const created = harness.service.entityCreate({
      projectId: harness.projectId,
      type: "character",
      name: "Entity-S1",
      description: "detective",
    });

    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const entity = created.data as { aiContextLevel?: string };
    assert.equal(entity.aiContextLevel, "when_detected");

    const row = harness.db
      .prepare<
        [string],
        { aiContextLevel: string }
      >("SELECT ai_context_level as aiContextLevel FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.aiContextLevel, "when_detected");
  } finally {
    harness.close();
  }
}

// S2
// should update aiContextLevel to always via entityUpdate patch
{
  const harness = createTestHarness();
  try {
    const created = harness.service.entityCreate({
      projectId: harness.projectId,
      type: "character",
      name: "Entity-S2",
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      assert.fail("expected entityCreate to succeed");
    }

    const updateArgs: EntityUpdateWithAiContext = {
      projectId: harness.projectId,
      id: created.data.id,
      expectedVersion: created.data.version,
      patch: {
        aiContextLevel: "always",
      },
    };
    const updated = harness.service.entityUpdate(updateArgs);
    assert.equal(updated.ok, true);
    if (!updated.ok) {
      assert.fail("expected entityUpdate to succeed");
    }

    const entity = updated.data as { aiContextLevel?: string };
    assert.equal(entity.aiContextLevel, "always");

    const row = harness.db
      .prepare<
        [string],
        { aiContextLevel: string }
      >("SELECT ai_context_level as aiContextLevel FROM kg_entities WHERE id = ?")
      .get(created.data.id);
    assert.equal(row?.aiContextLevel, "always");
  } finally {
    harness.close();
  }
}

// S3
// should filter entities by aiContextLevel
{
  const harness = createTestHarness();
  try {
    const createA: EntityCreateWithAiContext = {
      projectId: harness.projectId,
      type: "character",
      name: "A",
      aiContextLevel: "always",
    };
    const createB: EntityCreateWithAiContext = {
      projectId: harness.projectId,
      type: "character",
      name: "B",
      aiContextLevel: "when_detected",
    };
    const createC: EntityCreateWithAiContext = {
      projectId: harness.projectId,
      type: "character",
      name: "C",
      aiContextLevel: "never",
    };

    assert.equal(harness.service.entityCreate(createA).ok, true);
    assert.equal(harness.service.entityCreate(createB).ok, true);
    assert.equal(harness.service.entityCreate(createC).ok, true);

    const listArgs: EntityListWithAiContextFilter = {
      projectId: harness.projectId,
      filter: {
        aiContextLevel: "always",
      },
    };
    const listed = harness.service.entityList(listArgs);

    assert.equal(listed.ok, true);
    if (!listed.ok) {
      assert.fail("expected entityList to succeed");
    }

    assert.equal(listed.data.items.length, 1);
    assert.equal(listed.data.items[0]?.name, "A");
  } finally {
    harness.close();
  }
}

// S4
// should reject invalid aiContextLevel with VALIDATION_ERROR and no DB write
{
  const harness = createTestHarness();
  try {
    const createArgs: EntityCreateWithAiContext = {
      projectId: harness.projectId,
      type: "character",
      name: "Entity-S4",
      aiContextLevel:
        "invalid_value" as unknown as EntityCreateWithAiContext["aiContextLevel"],
    };
    const rejected = harness.service.entityCreate(createArgs);

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
      .get(harness.projectId, "Entity-S4");
    assert.equal(row?.count, 0);
  } finally {
    harness.close();
  }
}
