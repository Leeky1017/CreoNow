/**
 * 001_initial_schema.ts — baseline schema for TypeScript migrations.
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
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT
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

  CREATE TABLE IF NOT EXISTS entity_types (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    aliases            TEXT,
    is_builtin         INTEGER DEFAULT 0,
    icon               TEXT,
    default_properties TEXT,
    project_id         TEXT
  );

  CREATE TABLE IF NOT EXISTS relation_types (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    aliases                TEXT,
    is_builtin             INTEGER DEFAULT 0,
    is_directional         INTEGER DEFAULT 1,
    allowed_source_types   TEXT,
    allowed_target_types   TEXT,
    allow_free_text_target INTEGER DEFAULT 1,
    project_id             TEXT
  );

  CREATE TABLE IF NOT EXISTS property_types (
    id                      TEXT PRIMARY KEY,
    name                    TEXT NOT NULL,
    aliases                 TEXT,
    is_builtin              INTEGER DEFAULT 0,
    value_type              TEXT NOT NULL,
    options                 TEXT,
    allow_multiple          INTEGER DEFAULT 0,
    applicable_entity_types TEXT,
    project_id              TEXT
  );

  CREATE TABLE IF NOT EXISTS entities (
    id             TEXT PRIMARY KEY,
    entity_type_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    description    TEXT,
    icon           TEXT,
    project_id     TEXT NOT NULL,
    created_by     TEXT DEFAULT 'user',
    created_at     TEXT NOT NULL,
    FOREIGN KEY (entity_type_id) REFERENCES entity_types (id)
  );

  CREATE INDEX IF NOT EXISTS idx_entities_project_type
    ON entities (project_id, entity_type_id);

  CREATE TABLE IF NOT EXISTS entity_properties (
    id               TEXT PRIMARY KEY,
    entity_id        TEXT NOT NULL,
    property_type_id TEXT NOT NULL,
    value            TEXT,
    layer            TEXT,
    known_by         TEXT,
    valid_from       TEXT,
    valid_until      TEXT,
    confidence       REAL DEFAULT 1.0,
    source_chapter   TEXT,
    created_by       TEXT DEFAULT 'user',
    FOREIGN KEY (entity_id) REFERENCES entities (id),
    FOREIGN KEY (property_type_id) REFERENCES property_types (id)
  );

  CREATE INDEX IF NOT EXISTS idx_entity_properties_entity
    ON entity_properties (entity_id);

  CREATE TABLE IF NOT EXISTS relations (
    id               TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    relation_type_id TEXT NOT NULL,
    target_entity_id TEXT,
    target_value     TEXT,
    layer            TEXT,
    known_by         TEXT,
    valid_from       TEXT,
    valid_until      TEXT,
    relation_detail  TEXT,
    confidence       REAL DEFAULT 1.0,
    source_chapter   TEXT,
    created_by       TEXT DEFAULT 'user',
    project_id       TEXT NOT NULL,
    FOREIGN KEY (source_entity_id) REFERENCES entities (id),
    FOREIGN KEY (relation_type_id) REFERENCES relation_types (id),
    FOREIGN KEY (target_entity_id) REFERENCES entities (id)
  );

  CREATE INDEX IF NOT EXISTS idx_relations_source
    ON relations (source_entity_id);

  CREATE INDEX IF NOT EXISTS idx_relations_target
    ON relations (target_entity_id);

  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5 (
    name,
    description,
    content='entities',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS entities_ai_fts
    AFTER INSERT ON entities
  BEGIN
    INSERT INTO entities_fts (rowid, name, description)
      VALUES (new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_au_fts
    AFTER UPDATE ON entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
    INSERT INTO entities_fts(rowid, name, description)
      VALUES(new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_ad_fts
    AFTER DELETE ON entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
  END;
`;

function up(db: Database.Database): void {
  db.exec(UP_SQL);
}

// @rollback: manual — baseline schema rollback requires a manual DB reset.
export const initialSchemaMigration: Migration = {
  version: 1,
  name: "001_initial_schema",
  up,
};

