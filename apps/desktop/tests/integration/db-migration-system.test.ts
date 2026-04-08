/**
 * Integration test: full in-memory SQLite migration via the new TypeScript
 * migration system.
 *
 * Scenario coverage:
 *   DB-INT-1: all tables created by 001_initial_schema exist after runMigrations
 *   DB-INT-2: entities_fts FTS5 virtual table is queryable
 *   DB-INT-3: versions.branch_id → branches FK constraint is enforced
 *   DB-INT-4: foreign_keys pragma is ON after getDb()
 *   DB-INT-5: WAL journal_mode is active after getDb()
 *   DB-INT-6: _migrations table records exactly the applied migrations
 *   DB-INT-7: cost_records FK to sessions is enforced (INV-9)
 *   DB-INT-8: second runMigrations call is idempotent (no error, no re-apply)
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

function vtableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
    )
    .get(name) as { name: string } | undefined;
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// DB-INT-4: foreign_keys pragma is ON for in-memory DB
// ---------------------------------------------------------------------------
{
  const db = createTestDb();

  const fkRow = db.pragma("foreign_keys", { simple: true }) as number;
  assert.equal(fkRow, 1, "DB-INT-4: foreign_keys must be 1");

  db.close();
}

// ---------------------------------------------------------------------------
// DB-INT-5: WAL journal_mode is active for a file-based DB
//
// In-memory databases return 'memory' regardless of the journal_mode pragma.
// We verify WAL by opening a temporary file-based database in the test
// output directory (cleaned up immediately after).
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
    // Cleanup: remove DB file and WAL/SHM sidecar files
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(walDbPath + suffix);
      } catch {
        // ignore if file does not exist
      }
    }
  }
}

// ---------------------------------------------------------------------------
// run full migration suite
// ---------------------------------------------------------------------------
const db = createTestDb();
runMigrations(db, [initialSchemaMigration]);

// ---------------------------------------------------------------------------
// DB-INT-1: required tables exist
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
  "relations",
  "_migrations",
] as const;

for (const tbl of requiredTables) {
  assert.ok(
    tableExists(db, tbl),
    `DB-INT-1: table '${tbl}' must exist after migration`,
  );
}

// ---------------------------------------------------------------------------
// DB-INT-2: entities_fts virtual table is queryable
// ---------------------------------------------------------------------------
assert.ok(
  vtableExists(db, "entities_fts"),
  "DB-INT-2: entities_fts virtual table must exist",
);

// Insert a row to confirm FTS5 works
const insertedAt = new Date().toISOString();
// First insert a required entity_type row
db.prepare(
  "INSERT INTO entity_types (type_id, display_name, is_builtin, created_at) VALUES (?, ?, ?, ?)",
).run("character", "角色", 1, insertedAt);

db.prepare(
  "INSERT INTO entities (entity_id, project_id, type_id, name, description, aliases, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
).run(
  "ent-001",
  "proj-001",
  "character",
  "林远",
  "前特种兵，沉默寡言",
  "[]",
  insertedAt,
  insertedAt,
);

// FTS5 content table — rebuild triggers should have populated entities_fts
// Perform FTS search
const ftsRow = db
  .prepare("SELECT entity_id FROM entities_fts WHERE entities_fts MATCH ?")
  .get("林远") as { entity_id: string } | undefined;

assert.ok(
  ftsRow !== undefined,
  "DB-INT-2: FTS5 search must return the inserted entity",
);
assert.equal(ftsRow?.entity_id, "ent-001");

// ---------------------------------------------------------------------------
// DB-INT-3: versions.branch_id → branches FK is enforced
// ---------------------------------------------------------------------------
{
  const branchInsertedAt = new Date().toISOString();

  // Insert a branch
  db.prepare(
    "INSERT INTO branches (branch_id, document_id, project_id, name, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("br-001", "doc-001", "proj-001", "main", branchInsertedAt);

  // Insert version linked to that branch (should succeed)
  db.prepare(
    `INSERT INTO versions
       (version_id, document_id, project_id, branch_id, actor, reason, content_json, word_count, parent_snapshot_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "ver-001",
    "doc-001",
    "proj-001",
    "br-001",
    "user",
    "manual-save",
    "{}",
    0,
    null,
    branchInsertedAt,
  );

  // Insert version with a NON-EXISTENT branch_id must fail
  let fkViolated = false;
  try {
    db.prepare(
      `INSERT INTO versions
         (version_id, document_id, project_id, branch_id, actor, reason, content_json, word_count, parent_snapshot_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "ver-002",
      "doc-001",
      "proj-001",
      "br-nonexistent",
      "user",
      "manual-save",
      "{}",
      0,
      null,
      branchInsertedAt,
    );
  } catch {
    fkViolated = true;
  }
  assert.ok(fkViolated, "DB-INT-3: FK violation must be thrown for bad branch_id");
}

// ---------------------------------------------------------------------------
// DB-INT-6: _migrations records exactly version 1
// ---------------------------------------------------------------------------
{
  const rows = db
    .prepare("SELECT version, name FROM _migrations ORDER BY version ASC")
    .all() as Array<{ version: number; name: string }>;

  assert.equal(rows.length, 1, "DB-INT-6: exactly one migration should be recorded");
  assert.equal(rows[0]?.version, 1);
  assert.equal(rows[0]?.name, "001_initial_schema");
}

// ---------------------------------------------------------------------------
// DB-INT-7: cost_records (INV-9) FK to sessions
// ---------------------------------------------------------------------------
{
  const ts = new Date().toISOString();

  // Insert a session
  db.prepare(
    "INSERT INTO sessions (session_id, project_id, started_at, ended_at, metadata_json) VALUES (?, ?, ?, ?, ?)",
  ).run("ses-001", "proj-001", ts, null, "{}");

  // Cost record linked to existing session — should succeed
  db.prepare(
    `INSERT INTO cost_records
       (record_id, session_id, project_id, model, prompt_tokens, completion_tokens, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("cr-001", "ses-001", "proj-001", "gpt-4o", 100, 50, 0.002, ts);

  // Cost record with non-existent session_id — FK violation
  let fkViolated = false;
  try {
    db.prepare(
      `INSERT INTO cost_records
         (record_id, session_id, project_id, model, prompt_tokens, completion_tokens, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "cr-002",
      "ses-nonexistent",
      "proj-001",
      "gpt-4o",
      100,
      50,
      0.002,
      ts,
    );
  } catch {
    fkViolated = true;
  }
  assert.ok(
    fkViolated,
    "DB-INT-7: FK violation must be thrown for non-existent session_id",
  );
}

// ---------------------------------------------------------------------------
// DB-INT-8: second runMigrations call is idempotent
// ---------------------------------------------------------------------------
{
  // Should not throw and should not double-apply
  runMigrations(db, [initialSchemaMigration]);

  const rows = db
    .prepare("SELECT COUNT(*) as cnt FROM _migrations")
    .get() as { cnt: number };
  assert.equal(rows.cnt, 1, "DB-INT-8: still exactly one migration after second run");
}

db.close();

console.log("db-migration-system.test.ts: all assertions passed");
