/**
 * Integration test: full in-memory SQLite migration via the new TypeScript
 * migration system.
 *
 * Scenario coverage:
 *   DB-INT-1:  baseline tables created by 001_initial_schema exist (incl. 6 KG tables)
 *   DB-INT-2:  entities_fts FTS5 virtual table is queryable (content='entities')
 *   DB-INT-3:  versions.branch_id → branches FK constraint is enforced (NOT NULL + FK)
 *   DB-INT-3B: baseline includes live document_versions/document_branches tables
 *   DB-INT-4:  foreign_keys pragma is ON
 *   DB-INT-5:  WAL journal_mode is active on a file-based DB
 *   DB-INT-6:  _migrations table records exactly the applied migrations
 *   DB-INT-7:  cost_records FK to sessions is enforced (INV-9)
 *   DB-INT-8:  second runMigrations call is idempotent (no error, no re-apply)
<<<<<<< Updated upstream
 *   DB-INT-9:  bridge path — migration bookkeeping remains truthful with legacy settings schema
 *   DB-INT-9B: bridge path rebuilds entities_fts for pre-existing entities rows
 *   DB-INT-9C: bridge path rejects shape drift and does not record migration
 *   DB-INT-9D: bridge path rejects same-column semantic drift (missing UNIQUE)
 *   DB-INT-9E: bridge path rejects same-column semantic drift (wrong type)
 *   DB-INT-9F: bridge path rejects kg_entities missing normalized-name UNIQUE index
 *   DB-INT-9G: bridge path rejects drifted versions table shape
 *   DB-INT-9H: bridge path rejects drifted cost_records table shape
 *   DB-INT-9I: bridge path rejects drifted sessions table shape
 *   DB-INT-9J: bridge path rejects drifted branches table shape
 *   DB-INT-10: kg_relations table FKs to kg_entities and project scope
 *   DB-INT-11: FTS5 external-content trigger correctness on entities (no phantom tokens; DELETE removes tokens)
=======
 *   DB-INT-9:  bridge-path: TS migration layered on top of legacy SQL preserves
 *              existing tables and creates only new tables
 *   DB-INT-10: kg_relations table FKs to entities and relation_types
 *   DB-INT-11: FTS5 external-content triggers — UPDATE and DELETE do not corrupt index
>>>>>>> Stashed changes
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { runMigrations } from "../../main/src/db/migrator";
import { initialSchemaMigration } from "../../main/src/db/migrations/001_initial_schema";
import { applyRecommendedPragmas } from "../../main/src/db/recommendedPragmas";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applyRecommendedPragmas(db);
  return db;
}

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
    )
    .get(name) as { name: string } | undefined;
  return row !== undefined;
}

// Legacy settings schema from 0001_init.sql — used in DB-INT-9
const LEGACY_SETTINGS_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, key)
  )
`;

// ---------------------------------------------------------------------------
// DB-INT-4: foreign_keys pragma is ON
// ---------------------------------------------------------------------------
{
  const db = createTestDb();
  const fkRow = db.pragma("foreign_keys", { simple: true }) as number;
  assert.equal(fkRow, 1, "DB-INT-4: foreign_keys must be 1");
  db.close();
}

// ---------------------------------------------------------------------------
// DB-INT-5: WAL journal_mode is active for a file-based DB
// ---------------------------------------------------------------------------
{
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const walDbPath = path.join(testDir, ".wal-pragma-test.db");

  try {
    const fileDb = new Database(walDbPath);
    fileDb.pragma("journal_mode = WAL");
    fileDb.pragma("foreign_keys = ON");
    applyRecommendedPragmas(fileDb);

    const walRow = fileDb.pragma("journal_mode", { simple: true }) as string;
    assert.equal(walRow, "wal", "DB-INT-5: journal_mode must be wal on file DB");
    fileDb.close();
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try { fs.unlinkSync(walDbPath + suffix); } catch { /* ignore */ }
    }
  }
}

// ---------------------------------------------------------------------------
// run full migration suite on a pristine in-memory DB
// ---------------------------------------------------------------------------
const db = createTestDb();
runMigrations(db, [initialSchemaMigration]);

// ---------------------------------------------------------------------------
// DB-INT-1: required tables exist (includes 6-table KG baseline)
// ---------------------------------------------------------------------------
const requiredTables = [
  "settings",
  "sessions",
  "branches",
  "versions",
  "document_versions",
  "document_branches",
  "cost_records",
  "entity_types",
  "relation_types",
  "property_types",
  "entities",
  "entity_properties",
<<<<<<< Updated upstream
  "relations",
  "kg_entities",
  "kg_relation_types",
  "kg_relations",
  "entities_fts",
=======
  "kg_relations",
>>>>>>> Stashed changes
  "_migrations",
] as const;

for (const tbl of requiredTables) {
  assert.ok(
    tableExists(db, tbl),
    `DB-INT-1: table '${tbl}' must exist after migration`,
  );
}

// ---------------------------------------------------------------------------
// DB-INT-2: entities_fts is queryable against entities content table
// ---------------------------------------------------------------------------
assert.ok(tableExists(db, "entities_fts"), "DB-INT-2: entities_fts must exist");

const insertedAt = new Date().toISOString();
db.exec("CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY)");
db.prepare("INSERT INTO projects (project_id) VALUES (?)").run("proj-001");
db.prepare(
  "INSERT INTO entity_types (id, name, aliases, is_builtin, icon, default_properties, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
).run("etype-001", "character", null, 1, null, null, "proj-001");

db.prepare(
  "INSERT INTO entities (id, entity_type_id, name, description, icon, project_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
).run("ent-001", "etype-001", "林远", "前特种兵，沉默寡言", null, "proj-001", "user", insertedAt);

const ftsRow = db
  .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
  .get("林远") as { name: string } | undefined;

assert.ok(ftsRow !== undefined, "DB-INT-2: FTS5 must return the inserted entity");
assert.equal(ftsRow?.name, "林远");

// Verify entities_fts remains name/description index table
const ftsInfo = db.pragma("table_info(entities_fts)") as Array<{ name: string }>;
const ftsColumns = ftsInfo.map((r) => r.name);
assert.ok(!ftsColumns.includes("entity_id"), "DB-INT-2: entities_fts must NOT have entity_id column");

// ---------------------------------------------------------------------------
// DB-INT-3: versions.branch_id → branches FK enforced (NOT NULL)
// ---------------------------------------------------------------------------
{
  const ts = new Date().toISOString();

  db.prepare(
    `INSERT INTO branches (id, project_id, name, parent_branch_id, fork_version_id, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run("br-001", "proj-001", "main", null, null, ts, "user");

  db.prepare(
    `INSERT INTO versions (id, branch_id, parent_version_id, content_snapshot, operation, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("ver-001", "br-001", null, "{}", "edit", ts);

  let fkViolated = false;
  try {
    db.prepare(
      `INSERT INTO versions (id, branch_id, parent_version_id, content_snapshot, operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("ver-002", "br-nonexistent", null, "{}", "edit", ts);
  } catch { fkViolated = true; }
  assert.ok(fkViolated, "DB-INT-3: FK violation for bad branch_id");
}

// ---------------------------------------------------------------------------
// DB-INT-3B: live document version-control tables exist in baseline
// ---------------------------------------------------------------------------
{
  const documentVersionColumns = (
    db.pragma("table_info(document_versions)") as Array<{ name: string }>
  ).map((column) => column.name);
  assert.deepEqual(
    documentVersionColumns,
    [
      "version_id",
      "project_id",
      "document_id",
      "actor",
      "content_json",
      "content_text",
      "content_md",
      "created_at",
      "reason",
      "content_hash",
      "diff_format",
      "diff_text",
      "word_count",
      "parent_snapshot_id",
    ],
    "DB-INT-3B: document_versions schema must match live runtime contract",
  );

  const documentBranchesColumns = (
    db.pragma("table_info(document_branches)") as Array<{ name: string }>
  ).map((column) => column.name);
  assert.deepEqual(
    documentBranchesColumns,
    [
      "branch_id",
      "document_id",
      "name",
      "base_snapshot_id",
      "head_snapshot_id",
      "created_by",
      "created_at",
    ],
    "DB-INT-3B: document_branches schema must match live runtime contract",
  );
}

// ---------------------------------------------------------------------------
// DB-INT-6: _migrations records exactly version 1
// ---------------------------------------------------------------------------
{
  const rows = db
    .prepare("SELECT version, name FROM _migrations ORDER BY version ASC")
    .all() as Array<{ version: number; name: string }>;
  assert.equal(rows.length, 1, "DB-INT-6: one migration recorded");
  assert.equal(rows[0]?.version, 1);
  assert.equal(rows[0]?.name, "001_initial_schema");
}

// ---------------------------------------------------------------------------
// DB-INT-7: cost_records FK to sessions (INV-9) — exact column names per AC
// ---------------------------------------------------------------------------
{
  const ts = new Date().toISOString();

  db.prepare(
    "INSERT INTO sessions (id, project_id, started_at, ended_at, state) VALUES (?, ?, ?, ?, ?)",
  ).run("ses-001", "proj-001", ts, null, "active");

  db.prepare(
    `INSERT INTO cost_records
       (id, session_id, model, input_tokens, output_tokens, cache_hit_tokens, duration_ms, estimated_cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("cr-001", "ses-001", "gpt-4o", 100, 50, 10, 800, 0.002, ts);

  let fkViolated = false;
  try {
    db.prepare(
      `INSERT INTO cost_records
         (id, session_id, model, input_tokens, output_tokens, cache_hit_tokens, duration_ms, estimated_cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("cr-002", "ses-nonexistent", "gpt-4o", 100, 50, 10, 800, 0.002, ts);
  } catch { fkViolated = true; }
  assert.ok(fkViolated, "DB-INT-7: FK violation for non-existent session_id");
}

// ---------------------------------------------------------------------------
// DB-INT-8: second runMigrations is idempotent
// ---------------------------------------------------------------------------
{
  runMigrations(db, [initialSchemaMigration]);
  const rows = db.prepare("SELECT COUNT(*) as cnt FROM _migrations").get() as { cnt: number };
  assert.equal(rows.cnt, 1, "DB-INT-8: still one migration after second run");
}

db.close();

// ---------------------------------------------------------------------------
<<<<<<< Updated upstream
// Legacy settings SQL — mirrors what 0001_init.sql creates on real installs.
// Used by DB-INT-9 to simulate the coexistence scenario (bridge path).
// ---------------------------------------------------------------------------
const LEGACY_SETTINGS_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, key)
  );
`;

const LEGACY_SESSIONS_SQL = `
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    started_at TEXT,
    ended_at   TEXT,
    state      TEXT
  );
`;

const LEGACY_PROJECTS_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY
  );
`;

const LEGACY_ENTITY_TYPES_SQL = `
  CREATE TABLE IF NOT EXISTS entity_types (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    aliases            TEXT,
    is_builtin         INTEGER DEFAULT 0,
    icon               TEXT,
    default_properties TEXT,
    project_id         TEXT
  );
`;

const LEGACY_ENTITIES_SQL = `
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
`;

const LEGACY_KG_ENTITIES_SQL = `
  CREATE TABLE IF NOT EXISTS kg_entities (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    type             TEXT NOT NULL CHECK (type IN ('character', 'location', 'event', 'item', 'faction')),
    name             TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    attributes_json  TEXT NOT NULL DEFAULT '{}',
    version          INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
    aliases          TEXT NOT NULL DEFAULT '[]',
    last_seen_state  TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
  );
`;

const LEGACY_KG_ENTITIES_UNIQUE_NAME_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_project_type_name
    ON kg_entities (project_id, type, lower(trim(name)));
`;

const LEGACY_BAD_KG_RELATION_TYPES_SQL = `
  CREATE TABLE IF NOT EXISTS kg_relation_types (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    builtin    INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    extra_col  TEXT
  );
`;

const LEGACY_BAD_KG_RELATION_TYPES_MISSING_UNIQUE_SQL = `
  CREATE TABLE IF NOT EXISTS kg_relation_types (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    builtin    INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
  );
`;

const LEGACY_BAD_SETTINGS_UPDATED_AT_TEXT_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (scope, key)
  );
`;

const LEGACY_BAD_SESSIONS_SQL = `
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    started_at TEXT,
    ended_at   TEXT,
    state      TEXT,
    extra_col  TEXT
  );
`;

const LEGACY_BAD_BRANCHES_SQL = `
  CREATE TABLE IF NOT EXISTS branches (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    name             TEXT NOT NULL,
    parent_branch_id TEXT,
    fork_version_id  TEXT,
    created_at       TEXT NOT NULL,
    created_by       INTEGER NOT NULL
  );
`;

const LEGACY_BAD_VERSIONS_SQL = `
  CREATE TABLE IF NOT EXISTS versions (
    id                TEXT PRIMARY KEY,
    branch_id         TEXT NOT NULL,
    parent_version_id TEXT,
    content_snapshot  TEXT,
    operation         TEXT,
    created_at        TEXT NOT NULL,
    extra_col         TEXT
  );
`;

const LEGACY_BAD_COST_RECORDS_SQL = `
  CREATE TABLE IF NOT EXISTS cost_records (
    id                 TEXT PRIMARY KEY,
    session_id         TEXT,
    model              TEXT NOT NULL,
    input_tokens       INTEGER,
    output_tokens      INTEGER,
    cache_hit_tokens   INTEGER,
    duration_ms        INTEGER,
    estimated_cost_usd REAL,
    created_at         TEXT NOT NULL,
    extra_col          TEXT
  );
`;

// ---------------------------------------------------------------------------
// DB-INT-9: bridge path — runMigrations works alongside legacy settings rows
// ---------------------------------------------------------------------------
// Simulates what happens on an existing install: legacy SQL migration has
// already created 'settings' with a different schema, then the TS migration
// runs via init.ts bridge. The TS migration must not error (IF NOT EXISTS
// + schema compatibility guard), legacy row must survive, and bookkeeping is
// truthful about the expected settings contract.
{
  const bridgeDb = new Database(":memory:");
  bridgeDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(bridgeDb);

  // Simulate legacy SQL migration pre-populating settings
  bridgeDb.exec(LEGACY_PROJECTS_SQL);
  bridgeDb.exec(LEGACY_SETTINGS_SQL);
  bridgeDb.exec(LEGACY_ENTITY_TYPES_SQL);
  bridgeDb.exec(LEGACY_ENTITIES_SQL);
  bridgeDb.exec(LEGACY_KG_ENTITIES_SQL);
  bridgeDb.exec(LEGACY_KG_ENTITIES_UNIQUE_NAME_INDEX_SQL);
  bridgeDb.prepare("INSERT INTO projects (project_id) VALUES (?)").run("proj-legacy");
  bridgeDb.prepare(
    "INSERT INTO entity_types (id, name, aliases, is_builtin, icon, default_properties, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run("etype-legacy", "character", null, 1, null, null, "proj-legacy");
  bridgeDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, description, icon, project_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "legacy-ent-fts-1",
    "etype-legacy",
    "旧角色",
    "桥接前已有实体",
    null,
    "proj-legacy",
    "user",
    new Date().toISOString(),
  );
  bridgeDb.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("global", "theme", '"dark"', Date.now());
  bridgeDb.prepare(
    "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, version, created_at, updated_at, ai_context_level, aliases, last_seen_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "legacy-ent-1",
    "proj-legacy",
    "character",
    "旧角色",
    "桥接前已有实体",
    "{}",
    1,
    new Date().toISOString(),
    new Date().toISOString(),
    "when_detected",
    "[]",
    null,
  );

  // Bridge calls runMigrations after legacy setup
  runMigrations(bridgeDb, [initialSchemaMigration]);

  // Legacy row must survive
  const legacyRow = bridgeDb
    .prepare("SELECT value_json FROM settings WHERE scope = ? AND key = ?")
    .get("global", "theme") as { value_json: string } | undefined;
  assert.ok(legacyRow !== undefined, "DB-INT-9: legacy settings row must survive");
  assert.equal(legacyRow?.value_json, '"dark"', "DB-INT-9: legacy settings value must be intact");

  const settingsColumns = (
    bridgeDb.pragma("table_info(settings)") as Array<{ name: string }>
  ).map((item) => item.name);
  assert.deepEqual(
    settingsColumns,
    ["scope", "key", "value_json", "updated_at"],
    "DB-INT-9: settings schema must remain legacy-compatible in bridge mode",
  );

  const migrationRow = bridgeDb
    .prepare("SELECT version, name FROM _migrations WHERE version = 1")
    .get() as { version: number; name: string } | undefined;
  assert.ok(migrationRow, "DB-INT-9: baseline migration must be recorded once schema is compatible");

  assert.ok(tableExists(bridgeDb, "kg_entities"), "DB-INT-9: kg_entities must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "kg_relations"), "DB-INT-9: kg_relations must exist after bridge migration");
  assert.ok(
    tableExists(bridgeDb, "document_versions"),
    "DB-INT-9: document_versions must exist after bridge migration",
  );
  assert.ok(
    tableExists(bridgeDb, "document_branches"),
    "DB-INT-9: document_branches must exist after bridge migration",
  );
  assert.ok(tableExists(bridgeDb, "entity_types"), "DB-INT-9: entity_types must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "relation_types"), "DB-INT-9: relation_types must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "property_types"), "DB-INT-9: property_types must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "entities"), "DB-INT-9: entities must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "entity_properties"), "DB-INT-9: entity_properties must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "relations"), "DB-INT-9: relations must exist after bridge migration");

  const rebuiltFtsRow = bridgeDb
    .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
    .get("旧角色") as { name: string } | undefined;
  assert.ok(
    rebuiltFtsRow !== undefined,
    "DB-INT-9B: entities_fts must be rebuilt to include pre-existing entities rows",
  );
  assert.equal(rebuiltFtsRow?.name, "旧角色");

  bridgeDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9C: bridge path rejects schema drift without recording migration
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_PROJECTS_SQL);
  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_UNIQUE_NAME_INDEX_SQL);
  mismatchDb.exec(LEGACY_BAD_KG_RELATION_TYPES_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for kg_relation_types/i,
    "DB-INT-9C: schema drift must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9C: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9D: bridge path rejects missing UNIQUE(project_id, key) constraint
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_PROJECTS_SQL);
  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_UNIQUE_NAME_INDEX_SQL);
  mismatchDb.exec(LEGACY_BAD_KG_RELATION_TYPES_MISSING_UNIQUE_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /missing unique index\/constraint unique\(project_id, key\)/i,
    "DB-INT-9D: missing UNIQUE(project_id, key) must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9D: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9E: bridge path rejects wrong settings.updated_at column type
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_PROJECTS_SQL);
  mismatchDb.exec(LEGACY_BAD_SETTINGS_UPDATED_AT_TEXT_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_UNIQUE_NAME_INDEX_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for settings\.updated_at: expected type integer, got text/i,
    "DB-INT-9E: wrong settings.updated_at type must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9E: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9F: bridge path rejects missing kg_entities normalized-name UNIQUE index
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_PROJECTS_SQL);
  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_KG_ENTITIES_SQL);
  // intentionally do NOT create idx_kg_entities_project_type_name

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for kg_entities: missing unique index\/constraint unique\(project_id, type, lower\(trim\(name\)\)\)/i,
    "DB-INT-9F: missing normalized-name UNIQUE index must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9F: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9G: bridge path rejects drifted versions table shape
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_BAD_VERSIONS_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for versions/i,
    "DB-INT-9G: drifted versions schema must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9G: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9H: bridge path rejects drifted cost_records table shape
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_SESSIONS_SQL);
  mismatchDb.exec(LEGACY_BAD_COST_RECORDS_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for cost_records/i,
    "DB-INT-9H: drifted cost_records schema must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9H: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9I: bridge path rejects drifted sessions table shape
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_BAD_SESSIONS_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for sessions/i,
    "DB-INT-9I: drifted sessions schema must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9I: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-9J: bridge path rejects drifted branches table shape
// ---------------------------------------------------------------------------
{
  const mismatchDb = new Database(":memory:");
  mismatchDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(mismatchDb);

  mismatchDb.exec(LEGACY_SETTINGS_SQL);
  mismatchDb.exec(LEGACY_BAD_BRANCHES_SQL);

  assert.throws(
    () => runMigrations(mismatchDb, [initialSchemaMigration]),
    /schema contract mismatch for branches\.created_by: expected type text, got integer/i,
    "DB-INT-9J: drifted branches schema must fail bridge migration",
  );

  const migrationRow = mismatchDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.equal(
    migrationRow,
    undefined,
    "DB-INT-9J: failed migration must not record version 1",
  );

  mismatchDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-10: kg_relations table FKs to entities and project scope
=======
// DB-INT-9: bridge-path — TS migration layered on top of legacy SQL
//
// Simulates the production bridge: init.ts runs legacy SQL migrations first
// (which creates settings with legacy schema), then the TS migrator runs on
// the same connection.
//
// Expected:
//   - Legacy 'settings' table preserved with original schema (IF NOT EXISTS)
//   - New tables (sessions, branches, versions, cost_records, KG) created
//   - _migrations records version 1
// ---------------------------------------------------------------------------
{
  const legacyDb = new Database(":memory:");
  legacyDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(legacyDb);

  // Simulate legacy SQL migration: create settings with legacy schema
  legacyDb.exec(LEGACY_SETTINGS_SQL);

  // Insert legacy data to verify preservation
  legacyDb.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("global", "theme", '"dark"', Date.now());

  // Run TS migration (the bridge call in init.ts)
  runMigrations(legacyDb, [initialSchemaMigration]);

  // Legacy settings table must still exist with original schema
  const legacyRow = legacyDb
    .prepare("SELECT scope, key, value_json FROM settings WHERE scope='global' AND key='theme'")
    .get() as { scope: string; key: string; value_json: string } | undefined;
  assert.ok(legacyRow !== undefined, "DB-INT-9: legacy settings row must be preserved");
  assert.equal(legacyRow?.value_json, '"dark"', "DB-INT-9: legacy value_json must be intact");

  // New tables must have been created
  const newTables = ["sessions", "branches", "versions", "cost_records",
                     "entity_types", "relation_types", "property_types",
                     "entities", "entity_properties", "kg_relations"] as const;
  for (const tbl of newTables) {
    assert.ok(
      tableExists(legacyDb, tbl),
      `DB-INT-9: '${tbl}' must be created on legacy DB`,
    );
  }

  // _migrations records version 1
  const migRow = legacyDb
    .prepare("SELECT version FROM _migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  assert.ok(migRow !== undefined, "DB-INT-9: _migrations must record version 1");

  legacyDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-10: kg_relations FKs to entities and relation_types
>>>>>>> Stashed changes
// ---------------------------------------------------------------------------
{
  const kgDb = new Database(":memory:");
  kgDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(kgDb);
  kgDb.exec("CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY)");
  kgDb.prepare("INSERT INTO projects (project_id) VALUES (?)").run("proj-001");
  runMigrations(kgDb, [initialSchemaMigration]);

  const ts = new Date().toISOString();

  kgDb.prepare(
    "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run("e-001", "proj-001", "character", "林远", "", "{}", ts, ts);
  kgDb.prepare(
    "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run("e-002", "proj-001", "character", "赵涛", "", "{}", ts, ts);

<<<<<<< Updated upstream
  // Valid kg_relations row
  kgDb.prepare(
    `INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run("r-001", "proj-001", "e-001", "e-002", "knows", "", ts);
=======
  // Valid kg_relation row
  kgDb.prepare(
    `INSERT INTO kg_relations (id, source_entity_id, relation_type_id, target_entity_id, project_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("r-001", "e-001", "knows", "e-002", "proj-001");
>>>>>>> Stashed changes

  // FK violation: non-existent source_entity_id
  let fkViolated = false;
  try {
    kgDb.prepare(
<<<<<<< Updated upstream
      `INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run("r-002", "proj-001", "e-nonexistent", "e-002", "knows", "", ts);
  } catch { fkViolated = true; }
  assert.ok(fkViolated, "DB-INT-10: kg_relations FK must reject bad source_entity_id");

  // FK violation: non-existent project_id
  let projectFkViolated = false;
  try {
    kgDb.prepare(
      `INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run("r-003", "proj-missing", "e-001", "e-002", "knows", "", ts);
  } catch { projectFkViolated = true; }
  assert.ok(projectFkViolated, "DB-INT-10: kg_relations FK must reject bad project_id");
=======
      `INSERT INTO kg_relations (id, source_entity_id, relation_type_id, target_entity_id, project_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("r-002", "e-nonexistent", "knows", "e-002", "proj-001");
  } catch { fkViolated = true; }
  assert.ok(fkViolated, "DB-INT-10: kg_relations FK must reject bad source_entity_id");
>>>>>>> Stashed changes

  kgDb.close();
}

// ---------------------------------------------------------------------------
<<<<<<< Updated upstream
// DB-INT-11: FTS5 external-content trigger correctness on entities
// ---------------------------------------------------------------------------
// Verifies that the UPDATE trigger uses the 'delete' command (no phantom
// tokens) and the DELETE trigger uses the 'delete' command (no corruption).
=======
// DB-INT-11: FTS5 external-content triggers — UPDATE and DELETE correctness
//
// Verifies that the 'delete' command pattern is used (not DELETE FROM ... WHERE
// rowid), which is the documented FTS5 external-content sync requirement.
// Using DELETE FROM causes phantom tokens on update and 'fts5: missing row'
// corruption on delete.
// ---------------------------------------------------------------------------
>>>>>>> Stashed changes
{
  const ftsDb = new Database(":memory:");
  ftsDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(ftsDb);
  runMigrations(ftsDb, [initialSchemaMigration]);

  const ts = new Date().toISOString();
<<<<<<< Updated upstream
  ftsDb.exec("CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY)");
  ftsDb.prepare("INSERT INTO projects (project_id) VALUES (?)").run("proj-001");
  ftsDb.prepare(
    "INSERT INTO entity_types (id, name, aliases, is_builtin, icon, default_properties, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run("etype-fts", "character", null, 1, null, null, "proj-001");

  // Insert entity — triggers entities_ai_fts
  ftsDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, description, icon, project_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run("fts-e1", "etype-fts", "旧名字", "旧描述", null, "proj-001", "user", ts);

  // Update entity — triggers entities_au_fts (must remove old tokens)
  ftsDb.prepare("UPDATE entities SET name = ?, description = ? WHERE id = ?")
    .run("新名字", "新描述", "fts-e1");

  // Old tokens must NOT appear — phantom token check
  const phantomRow = ftsDb
    .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
    .get("旧名字") as { name: string } | undefined;
  assert.ok(phantomRow === undefined, "DB-INT-11: UPDATE must remove old tokens (no phantom tokens)");

  // New tokens must be findable
  const newRow = ftsDb
    .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
    .get("新名字") as { name: string } | undefined;
  assert.ok(newRow !== undefined, "DB-INT-11: UPDATE must index new tokens");

  // Delete entity — triggers entities_ad_fts (must not corrupt FTS)
  ftsDb.prepare("DELETE FROM entities WHERE id = ?").run("fts-e1");

  // After delete, no rows for deleted name — no corruption check
  let deleteErrored = false;
  let deletedToken: { name: string } | undefined;
  try {
    deletedToken = ftsDb
      .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
      .get("新名字") as { name: string } | undefined;
  } catch { deleteErrored = true; }
  assert.ok(!deleteErrored, "DB-INT-11: DELETE trigger must not corrupt FTS5 index");
  assert.ok(deletedToken === undefined, "DB-INT-11: DELETE trigger must remove deleted tokens");
=======
  ftsDb.prepare("INSERT INTO entity_types (id, name) VALUES (?, ?)").run("char", "角色");

  // INSERT — entity inserted, FTS indexed
  ftsDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, description, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("fts-e1", "char", "旧名", "旧描述", "proj-001", ts);

  // UPDATE — name changes; FTS must reflect new name only (no phantom old tokens)
  ftsDb.prepare(
    "UPDATE entities SET name = '新名', description = '新描述' WHERE id = 'fts-e1'",
  ).run();

  // After update: old name must not match, new name must match
  const afterUpdate = ftsDb
    .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
    .all("新名") as Array<{ name: string }>;
  assert.equal(afterUpdate.length, 1, "DB-INT-11: updated name must be findable in FTS");
  assert.equal(afterUpdate[0]?.name, "新名");

  const phantom = ftsDb
    .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
    .all("旧名") as Array<{ name: string }>;
  assert.equal(phantom.length, 0, "DB-INT-11: old name must not remain as phantom token after update");

  // DELETE — must not corrupt the FTS index (no 'fts5: missing row' error)
  ftsDb.prepare("DELETE FROM entities WHERE id = 'fts-e1'").run();

  // Insert a second entity and query to prove FTS index is uncorrupted post-delete
  ftsDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, description, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("fts-e2", "char", "陈静", "侦探", "proj-001", ts);

  let ftsCorrupted = false;
  try {
    const postDelete = ftsDb
      .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
      .all("陈静") as Array<{ name: string }>;
    assert.equal(postDelete.length, 1, "DB-INT-11: FTS must find post-delete inserted entity");
  } catch { ftsCorrupted = true; }
  assert.ok(!ftsCorrupted, "DB-INT-11: FTS index must not be corrupted after DELETE");
>>>>>>> Stashed changes

  ftsDb.close();
}

console.log("db-migration-system.test.ts: all assertions passed");
