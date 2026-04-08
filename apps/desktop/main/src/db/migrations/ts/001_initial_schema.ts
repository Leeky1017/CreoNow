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
 *   KG schema (6 tables, target design per kg-schema.md §4.7):
 *     entity_types      — entity type registry
 *     relation_types    — relation type registry
 *     property_types    — property type registry
 *     entities          — KG entity nodes
 *     entity_properties — attribute key-value pairs per entity
 *     relations         — directed edges between entities
 *
 *   entities_fts    — FTS5 virtual table (content='entities', content_rowid='rowid')
 *                     columns: name, description — NO entity_id column per §4.7
 *   _migrations     — applied migration log (managed by migrator.ts)
 *
 * INV-1: versions.branch_id → branches FK ensures snapshot integrity.
 * INV-9: cost_records.session_id → sessions FK ensures every cost entry is
 *         attributable to a session.
 *
 * @rollback: manual — dropping the baseline schema requires a full DB reset.
 *   Reason: no automated down() is safe for a baseline schema in production.
 *   To roll back, use a subsequent migration to ALTER/DROP individual tables.
 */

import type Database from "better-sqlite3";

import type { Migration } from "../../migrator";

// ---------------------------------------------------------------------------
// SQL statements
// ---------------------------------------------------------------------------

const UP_SQL = /* sql */ `
  -- =========================================================================
  -- Application configuration
  --
  -- COEXISTENCE NOTE: the legacy SQL migration (0001_init.sql) creates a
  -- settings table with schema (scope TEXT, key TEXT, value_json TEXT,
  -- updated_at INTEGER, PRIMARY KEY (scope, key)). On existing installs,
  -- CREATE TABLE IF NOT EXISTS preserves the legacy shape. On fresh installs
  -- (TS-only path), this schema is used instead. Consumers must not assume
  -- column names beyond the common subset until a reconciliation migration
  -- explicitly aligns the two schemas.
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT
  );

  -- =========================================================================
  -- AI interaction sessions (INV-9: cost_records FK root)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    started_at TEXT,
    ended_at   TEXT,
    state      TEXT
  );

  -- =========================================================================
  -- Document branches (INV-1: versions must reference a branch)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS branches (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    name             TEXT NOT NULL,
    parent_branch_id TEXT,
    fork_version_id  TEXT,
    created_at       TEXT NOT NULL,
    created_by       TEXT NOT NULL
  );

  -- =========================================================================
  -- Document snapshots (INV-1: write-path must snapshot before mutating)
  --
  -- branch_id → branches FK (NOT NULL): every snapshot belongs to a branch.
  -- parent_version_id forms a singly-linked history chain within a branch.
  -- operation: describes the write action (e.g. "edit", "revert", "merge").
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS versions (
    id               TEXT PRIMARY KEY,
    branch_id        TEXT NOT NULL REFERENCES branches (id),
    parent_version_id TEXT,
    content_snapshot TEXT,
    operation        TEXT,
    created_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_versions_branch_created
    ON versions (branch_id, created_at DESC);

  -- =========================================================================
  -- AI cost records (INV-9: every AI call must be logged with model + tokens)
  --
  -- session_id → sessions FK: every cost entry is attributable to a session.
  -- cache_hit_tokens: prompt tokens served from provider cache (reduce billing).
  -- duration_ms: wall-clock latency for SLA tracking.
  -- estimated_cost_usd: derived at write-time from model pricing tables.
  -- =========================================================================
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

  -- =========================================================================
  -- Knowledge Graph — type registries (target schema per kg-schema.md §4.7)
  -- =========================================================================
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

  -- =========================================================================
  -- Knowledge Graph — entities (nodes)
  --
  -- entity_type_id → entity_types FK: every entity must have a registered type.
  -- =========================================================================
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

  -- =========================================================================
  -- Knowledge Graph — entity properties (attribute key-value pairs per §4.7)
  --
  -- layer/known_by/valid_from/valid_until: narrative context dimensions.
  -- confidence: 0.0–1.0; lower values from uncertain AI extraction.
  -- source_chapter: which chapter introduced this property (provenance).
  -- =========================================================================
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
    FOREIGN KEY (entity_id)        REFERENCES entities (id),
    FOREIGN KEY (property_type_id) REFERENCES property_types (id)
  );

  CREATE INDEX IF NOT EXISTS idx_entity_properties_entity
    ON entity_properties (entity_id);

  -- =========================================================================
  -- Knowledge Graph — relations (directed edges per kg-schema.md §4.7)
  --
  -- Table is named 'kg_relations' to match the §4.7 target schema name and
  -- existing KG service expectations. Column structure follows §4.7 fully.
  -- target_value: free-text target when target_entity_id is NULL.
  -- relation_detail: qualifier or annotation on the edge.
  -- confidence/source_chapter: same semantics as entity_properties above.
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS kg_relations (
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

  CREATE INDEX IF NOT EXISTS idx_kg_relations_source
    ON kg_relations (source_entity_id);

  CREATE INDEX IF NOT EXISTS idx_kg_relations_target
    ON kg_relations (target_entity_id);

  -- =========================================================================
  -- Full-text search over entities (per kg-schema.md §4.7)
  --
  -- content='entities': FTS index backed by the entities table.
  -- content_rowid='rowid': links FTS rowids to entities.rowid for sync.
  -- Columns: name, description ONLY — no entity_id column per §4.7 spec.
  -- Triggers below keep the FTS index consistent on INSERT / UPDATE / DELETE.
  -- =========================================================================
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
    DELETE FROM entities_fts WHERE rowid = old.rowid;
    INSERT INTO entities_fts (rowid, name, description)
      VALUES (new.rowid, new.name, new.description);
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
