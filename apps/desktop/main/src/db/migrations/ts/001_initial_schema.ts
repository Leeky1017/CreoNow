/**
 * 001_initial_schema.ts — Baseline schema for the TypeScript migration system
 *
 * Creates the core tables required by CreoNow backend services:
 *
 *   settings        — application key-value configuration
 *   sessions        — AI interaction sessions (INV-9: cost attribution root)
 *   branches        — document branch metadata
 *   versions        — linear document snapshots; branch_id → branches (INV-1)
 *   cost_records    — per-call AI cost log (INV-9: cost tracking obligation)
 *
 *   KG schema (6 tables):
 *     entity_types      — registered entity type registry
 *     relation_types    — registered relation type registry
 *     property_types    — registered property type registry
 *     entities          — KG entity nodes
 *     entity_properties — KG entity attribute key-value pairs
 *     relations         — KG directed edges between entities
 *
 *   entities_fts    — FTS5 virtual table (content='entities', content_rowid='rowid')
 *   _migrations     — applied migration log (managed by migrator.ts)
 *
 * INV-1: versions.branch_id → branches FK ensures snapshot integrity.
 * INV-9: cost_records.session_id → sessions FK ensures every cost entry is
 *         attributable to a session.
 *
 * @rollback: manual — dropping the baseline schema requires a full DB reset.
 */

import type Database from "better-sqlite3";

import type { Migration } from "../../migrator";

// ---------------------------------------------------------------------------
// SQL statements
// ---------------------------------------------------------------------------

const UP_SQL = /* sql */ `
  -- =========================================================================
  -- Application configuration
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- =========================================================================
  -- AI interaction sessions
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS sessions (
    session_id    TEXT PRIMARY KEY,
    project_id    TEXT,
    started_at    TEXT NOT NULL,
    ended_at      TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}'
  );

  -- =========================================================================
  -- Document branches (version control, INV-1)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS branches (
    branch_id   TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    project_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    UNIQUE (document_id, name)
  );

  -- =========================================================================
  -- Linear document snapshots (INV-1: write-path must version before mutating)
  --
  -- branch_id → branches FK: a snapshot may be associated with a named branch.
  -- parent_snapshot_id forms a singly-linked list (linear chain, no forks).
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS versions (
    version_id         TEXT PRIMARY KEY,
    document_id        TEXT NOT NULL,
    project_id         TEXT NOT NULL,
    branch_id          TEXT REFERENCES branches (branch_id) ON DELETE SET NULL,
    actor              TEXT NOT NULL,
    reason             TEXT NOT NULL,
    content_json       TEXT NOT NULL,
    word_count         INTEGER NOT NULL DEFAULT 0,
    parent_snapshot_id TEXT,
    created_at         TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_versions_document_created
    ON versions (document_id, created_at DESC, version_id ASC);

  -- =========================================================================
  -- AI cost records (INV-9: every call must be logged with model + tokens)
  --
  -- session_id → sessions FK: cost is always attributable to a session.
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS cost_records (
    record_id         TEXT PRIMARY KEY,
    session_id        TEXT REFERENCES sessions (session_id) ON DELETE SET NULL,
    project_id        TEXT,
    model             TEXT NOT NULL,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd          REAL    NOT NULL DEFAULT 0.0,
    created_at        TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cost_records_session
    ON cost_records (session_id, created_at DESC);

  -- =========================================================================
  -- Knowledge Graph — type registries
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS entity_types (
    type_id      TEXT PRIMARY KEY,
    display_name TEXT    NOT NULL,
    is_builtin   INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS relation_types (
    type_id      TEXT PRIMARY KEY,
    display_name TEXT    NOT NULL,
    is_builtin   INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS property_types (
    type_id        TEXT PRIMARY KEY,
    display_name   TEXT    NOT NULL,
    value_type     TEXT    NOT NULL DEFAULT 'text',
    allow_multiple INTEGER NOT NULL DEFAULT 0,
    is_builtin     INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL
  );

  -- =========================================================================
  -- Knowledge Graph — entities (nodes)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS entities (
    entity_id  TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type_id    TEXT NOT NULL REFERENCES entity_types (type_id),
    name       TEXT NOT NULL,
    description TEXT,
    aliases    TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entities_project_type
    ON entities (project_id, type_id, updated_at DESC);

  -- =========================================================================
  -- Knowledge Graph — entity properties (attribute key-value pairs)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS entity_properties (
    id               TEXT PRIMARY KEY,
    entity_id        TEXT NOT NULL REFERENCES entities (entity_id) ON DELETE CASCADE,
    property_type_id TEXT NOT NULL REFERENCES property_types (type_id),
    value            TEXT NOT NULL,
    created_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entity_properties_entity
    ON entity_properties (entity_id, property_type_id);

  -- =========================================================================
  -- Knowledge Graph — relations (directed edges)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS relations (
    relation_id      TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    source_entity_id TEXT NOT NULL REFERENCES entities (entity_id) ON DELETE CASCADE,
    relation_type_id TEXT NOT NULL REFERENCES relation_types (type_id),
    target_entity_id TEXT REFERENCES entities (entity_id) ON DELETE SET NULL,
    target_value     TEXT,
    description      TEXT,
    created_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_relations_project_source
    ON relations (project_id, source_entity_id, relation_id ASC);

  CREATE INDEX IF NOT EXISTS idx_relations_project_target
    ON relations (project_id, target_entity_id, relation_id ASC);

  -- =========================================================================
  -- Full-text search over entities
  --
  -- content='entities': the FTS index is backed by the entities table.
  -- content_rowid='rowid': links FTS rowids to entities.rowid for content sync.
  -- Triggers below keep the FTS index in sync on INSERT / UPDATE / DELETE.
  -- =========================================================================
  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5 (
    entity_id UNINDEXED,
    name,
    description,
    content='entities',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS entities_ai_fts
    AFTER INSERT ON entities
  BEGIN
    INSERT INTO entities_fts (rowid, entity_id, name, description)
      VALUES (new.rowid, new.entity_id, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_au_fts
    AFTER UPDATE ON entities
  BEGIN
    DELETE FROM entities_fts WHERE rowid = old.rowid;
    INSERT INTO entities_fts (rowid, entity_id, name, description)
      VALUES (new.rowid, new.entity_id, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_ad_fts
    AFTER DELETE ON entities
  BEGIN
    DELETE FROM entities_fts WHERE rowid = old.rowid;
  END;
`;

// ---------------------------------------------------------------------------
// Migration export
// ---------------------------------------------------------------------------

function up(db: Database.Database): void {
  db.exec(UP_SQL);
}

// @rollback: manual — baseline schema removal requires full DB reset; no
// automated down() is safe in production. Use a new migration to ALTER/DROP.

export const initialSchemaMigration: Migration = {
  version: 1,
  name: "001_initial_schema",
  up,
};
