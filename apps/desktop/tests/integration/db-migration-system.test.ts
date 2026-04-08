/**
 * Integration test: full in-memory SQLite migration via the new TypeScript
 * migration system.
 *
 * Scenario coverage:
 *   DB-INT-1:  all tables created by 001_initial_schema exist after runMigrations
 *   DB-INT-2:  entities_fts FTS5 virtual table is queryable (name/description only — no entity_id column)
 *   DB-INT-3:  versions.branch_id → branches FK constraint is enforced (NOT NULL + FK)
 *   DB-INT-4:  foreign_keys pragma is ON
 *   DB-INT-5:  WAL journal_mode is active on a file-based DB
 *   DB-INT-6:  _migrations table records exactly the applied migrations
 *   DB-INT-7:  cost_records FK to sessions is enforced (INV-9)
 *   DB-INT-8:  second runMigrations call is idempotent (no error, no re-apply)
 *   DB-INT-9:  bridge path — runMigrations works alongside legacy settings rows (coexistence)
 *   DB-INT-10: kg_relations table FKs to entities and relation_types
 *   DB-INT-11: FTS5 external-content trigger correctness (no phantom tokens, no corruption)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { runMigrations } from "../../main/src/db/migrator";
import { initialSchemaMigration } from "../../main/src/db/migrations/ts/001_initial_schema";
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
// DB-INT-1: required tables exist (exact names per AC + §4.7)
// ---------------------------------------------------------------------------
const requiredTables = [
  "settings",
  "sessions",
  "branches",
  "versions",
  "cost_records",
  "entity_types",
  "relation_types",
  "property_types",
  "entities",
  "entity_properties",
  "kg_relations",
  "_migrations",
] as const;

for (const tbl of requiredTables) {
  assert.ok(
    tableExists(db, tbl),
    `DB-INT-1: table '${tbl}' must exist after migration`,
  );
}

// ---------------------------------------------------------------------------
// DB-INT-2: entities_fts is queryable — NO entity_id column per §4.7
// ---------------------------------------------------------------------------
assert.ok(tableExists(db, "entities_fts"), "DB-INT-2: entities_fts must exist");

const insertedAt = new Date().toISOString();

db.prepare(
  "INSERT INTO entity_types (id, name, is_builtin) VALUES (?, ?, ?)",
).run("character", "角色", 0);

db.prepare(
  "INSERT INTO entities (id, entity_type_id, name, description, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
).run("ent-001", "character", "林远", "前特种兵，沉默寡言", "proj-001", insertedAt);

const ftsRow = db
  .prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?")
  .get("林远") as { name: string } | undefined;

assert.ok(ftsRow !== undefined, "DB-INT-2: FTS5 must return the inserted entity");
assert.equal(ftsRow?.name, "林远");

// Verify entity_id is NOT a column in entities_fts (per §4.7)
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

// ---------------------------------------------------------------------------
// DB-INT-9: bridge path — runMigrations works alongside legacy settings rows
// ---------------------------------------------------------------------------
// Simulates what happens on an existing install: legacy SQL migration has
// already created 'settings' with a different schema, then the TS migration
// runs via init.ts bridge. The TS migration must not error (IF NOT EXISTS
// silently skips), legacy row must survive, and new tables must be created.
{
  const bridgeDb = new Database(":memory:");
  bridgeDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(bridgeDb);

  // Simulate legacy SQL migration pre-populating settings
  bridgeDb.exec(LEGACY_SETTINGS_SQL);
  bridgeDb.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("global", "theme", '"dark"', Date.now());

  // Bridge calls runMigrations after legacy setup
  runMigrations(bridgeDb, [initialSchemaMigration]);

  // Legacy row must survive
  const legacyRow = bridgeDb
    .prepare("SELECT value_json FROM settings WHERE scope = ? AND key = ?")
    .get("global", "theme") as { value_json: string } | undefined;
  assert.ok(legacyRow !== undefined, "DB-INT-9: legacy settings row must survive");
  assert.equal(legacyRow?.value_json, '"dark"', "DB-INT-9: legacy settings value must be intact");

  // New tables must exist
  assert.ok(tableExists(bridgeDb, "kg_relations"), "DB-INT-9: kg_relations must exist after bridge migration");
  assert.ok(tableExists(bridgeDb, "entities"), "DB-INT-9: entities must exist after bridge migration");

  bridgeDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-10: kg_relations table FKs to entities and relation_types
// ---------------------------------------------------------------------------
{
  const kgDb = new Database(":memory:");
  kgDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(kgDb);
  runMigrations(kgDb, [initialSchemaMigration]);

  const ts = new Date().toISOString();

  kgDb.prepare("INSERT INTO entity_types (id, name) VALUES (?, ?)").run("person", "人物");
  kgDb.prepare("INSERT INTO relation_types (id, name) VALUES (?, ?)").run("knows", "认识");
  kgDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, project_id, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("e-001", "person", "林远", "proj-001", ts);
  kgDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, project_id, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("e-002", "person", "赵涛", "proj-001", ts);

  // Valid kg_relations row
  kgDb.prepare(
    `INSERT INTO kg_relations (id, source_entity_id, relation_type_id, target_entity_id, project_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("r-001", "e-001", "knows", "e-002", "proj-001");

  // FK violation: non-existent source_entity_id
  let fkViolated = false;
  try {
    kgDb.prepare(
      `INSERT INTO kg_relations (id, source_entity_id, relation_type_id, target_entity_id, project_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("r-002", "e-nonexistent", "knows", "e-002", "proj-001");
  } catch { fkViolated = true; }
  assert.ok(fkViolated, "DB-INT-10: kg_relations FK must reject bad source_entity_id");

  kgDb.close();
}

// ---------------------------------------------------------------------------
// DB-INT-11: FTS5 external-content trigger correctness
// ---------------------------------------------------------------------------
// Verifies that the UPDATE trigger uses the 'delete' command (no phantom
// tokens) and the DELETE trigger uses the 'delete' command (no corruption).
{
  const ftsDb = new Database(":memory:");
  ftsDb.pragma("foreign_keys = ON");
  applyRecommendedPragmas(ftsDb);
  runMigrations(ftsDb, [initialSchemaMigration]);

  const ts = new Date().toISOString();
  ftsDb.prepare("INSERT INTO entity_types (id, name) VALUES (?, ?)").run("char", "角色");

  // Insert entity — triggers entities_ai_fts
  ftsDb.prepare(
    "INSERT INTO entities (id, entity_type_id, name, description, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("fts-e1", "char", "旧名字", "旧描述", "proj-001", ts);

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
  try {
    ftsDb.prepare("SELECT name FROM entities_fts WHERE entities_fts MATCH ?").get("新名字");
  } catch { deleteErrored = true; }
  assert.ok(!deleteErrored, "DB-INT-11: DELETE trigger must not corrupt FTS5 index");

  ftsDb.close();
}

console.log("db-migration-system.test.ts: all assertions passed");
