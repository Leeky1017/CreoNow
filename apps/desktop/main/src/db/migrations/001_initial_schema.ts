/**
 * 001_initial_schema.ts — baseline schema for TypeScript migrations.
 *
 * IMPORTANT:
 * This baseline mirrors the repository's live SQLite runtime contract so the
 * init.ts bridge can record migration state truthfully on existing databases.
 * We intentionally reuse legacy table shapes for `settings` and `kg_*`.
 *
 * INV-1: versions + branches provide persistent snapshot lineage.
 * INV-9: cost_records provides persistent AI cost attribution.
 *
 * @rollback: manual — baseline schema rollback requires manual DB reset.
 */

import type Database from "better-sqlite3";

import type { Migration } from "../migrator";

const UP_SQL = /* sql */ `
  CREATE TABLE IF NOT EXISTS settings (
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, key)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    started_at TEXT,
    ended_at   TEXT,
    state      TEXT
  );

  CREATE TABLE IF NOT EXISTS branches (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    name             TEXT NOT NULL,
    parent_branch_id TEXT,
    fork_version_id  TEXT,
    created_at       TEXT NOT NULL,
    created_by       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS versions (
    id                TEXT PRIMARY KEY,
    branch_id         TEXT NOT NULL REFERENCES branches (id),
    parent_version_id TEXT,
    content_snapshot  TEXT,
    operation         TEXT,
    created_at        TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_versions_branch_created
    ON versions (branch_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS cost_records (
    id                 TEXT PRIMARY KEY,
    session_id         TEXT REFERENCES sessions (id),
    model              TEXT NOT NULL,
    input_tokens       INTEGER,
    output_tokens      INTEGER,
    cache_hit_tokens   INTEGER,
    duration_ms        INTEGER,
    estimated_cost_usd REAL,
    created_at         TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cost_records_session
    ON cost_records (session_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS kg_entities (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('character', 'location', 'event', 'item', 'faction')),
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    attributes_json TEXT NOT NULL DEFAULT '{}',
    version        INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
    aliases        TEXT NOT NULL DEFAULT '[]',
    last_seen_state TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project
    ON kg_entities (project_id);

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_type
    ON kg_entities (project_id, type);

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_name
    ON kg_entities (project_id, name);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_project_type_name
    ON kg_entities (project_id, type, lower(trim(name)));

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_context_level
    ON kg_entities (project_id, ai_context_level);

  CREATE TABLE IF NOT EXISTS kg_relation_types (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    builtin    INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (project_id, key),
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kg_relations (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relation_type    TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
    FOREIGN KEY (source_entity_id) REFERENCES kg_entities (id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES kg_entities (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_kg_relations_project
    ON kg_relations (project_id);

  CREATE INDEX IF NOT EXISTS idx_kg_relations_source
    ON kg_relations (project_id, source_entity_id);

  CREATE INDEX IF NOT EXISTS idx_kg_relations_target
    ON kg_relations (project_id, target_entity_id);

  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5 (
    name,
    description,
    content='kg_entities',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS entities_ai_fts
    AFTER INSERT ON kg_entities
  BEGIN
    INSERT INTO entities_fts (rowid, name, description)
      VALUES (new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_au_fts
    AFTER UPDATE ON kg_entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
    INSERT INTO entities_fts(rowid, name, description)
      VALUES(new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_ad_fts
    AFTER DELETE ON kg_entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
  END;
`;

function assertTableColumns(
  db: Database.Database,
  args: { table: string; expected: readonly string[] },
): void {
  const tableExists = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .get(args.table);
  if (!tableExists) {
    return;
  }

  const actual = (
    db.pragma(`table_info(${args.table})`) as Array<{ name: string }>
  ).map((item) => item.name);
  const expected = [...args.expected];

  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `schema contract mismatch for ${args.table}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`,
    );
  }
}

function up(db: Database.Database): void {
  const entitiesFtsExistsBeforeMigration = Boolean(
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get("entities_fts"),
  );

  // Guard migration bookkeeping truthfulness:
  // if a table already exists with an incompatible shape, fail instead of
  // silently recording version 1 as applied.
  assertTableColumns(db, {
    table: "settings",
    expected: ["scope", "key", "value_json", "updated_at"],
  });
  assertTableColumns(db, {
    table: "kg_entities",
    expected: [
      "id",
      "project_id",
      "type",
      "name",
      "description",
      "attributes_json",
      "version",
      "created_at",
      "updated_at",
      "ai_context_level",
      "aliases",
      "last_seen_state",
    ],
  });
  assertTableColumns(db, {
    table: "kg_relations",
    expected: [
      "id",
      "project_id",
      "source_entity_id",
      "target_entity_id",
      "relation_type",
      "description",
      "created_at",
    ],
  });

  db.exec(UP_SQL);

  // Bridge path fix: when entities_fts is first created on existing databases
  // with pre-existing kg_entities rows, rebuild the FTS index immediately so
  // search coverage is truthful right after migration.
  if (!entitiesFtsExistsBeforeMigration) {
    db.prepare("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')").run();
  }
}

// @rollback: manual — baseline schema rollback requires a manual DB reset.
export const initialSchemaMigration: Migration = {
  version: 1,
  name: "001_initial_schema",
  up,
};
