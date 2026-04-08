/**
 * Unit tests for migrator.ts
 *
 * Scenario coverage:
 *   MIG-U1: detects pending migrations (none applied → all pending)
 *   MIG-U2: skips already-applied migrations
 *   MIG-U3: applies migrations in ascending version order regardless of array order
 *   MIG-U4: records applied version in _migrations table
 *   MIG-U5: idempotent second run (no re-apply)
 *   MIG-U6: partial apply continues from last applied version
 *   MIG-U7: duplicate migration versions fail fast before execution
 */

import assert from "node:assert/strict";

import Database from "better-sqlite3";

import {
  type Migration,
  buildPendingMigrations,
  ensureMigrationsTable,
  recordMigrationApplied,
  runMigrations,
} from "../migrator";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  return db;
}

function makeMigration(
  version: number,
  name: string,
  extraSql?: string,
): Migration {
  return {
    version,
    name,
    up(db: Database.Database): void {
      db.exec(
        `CREATE TABLE IF NOT EXISTS tbl_v${version.toString()} (id TEXT PRIMARY KEY)`,
      );
      if (extraSql) {
        db.exec(extraSql);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// MIG-U1: no migrations applied → all pending
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);

  const migrations: Migration[] = [
    makeMigration(1, "001_first"),
    makeMigration(2, "002_second"),
    makeMigration(3, "003_third"),
  ];

  const pending = buildPendingMigrations(db, migrations);
  assert.equal(pending.length, 3, "MIG-U1: all 3 should be pending");
  assert.equal(pending[0]?.version, 1);
  assert.equal(pending[1]?.version, 2);
  assert.equal(pending[2]?.version, 3);
}

// ---------------------------------------------------------------------------
// MIG-U2: already-applied migrations are skipped
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);
  recordMigrationApplied(db, 1, "001_first");
  recordMigrationApplied(db, 2, "002_second");

  const migrations: Migration[] = [
    makeMigration(1, "001_first"),
    makeMigration(2, "002_second"),
    makeMigration(3, "003_third"),
  ];

  const pending = buildPendingMigrations(db, migrations);
  assert.equal(pending.length, 1, "MIG-U2: only version 3 should be pending");
  assert.equal(pending[0]?.version, 3);
}

// ---------------------------------------------------------------------------
// MIG-U3: out-of-order array → applied in ascending version order
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);

  const order: number[] = [];
  const migrations: Migration[] = [
    {
      version: 3,
      name: "003",
      up(d: Database.Database): void {
        order.push(3);
        d.exec("CREATE TABLE t3 (id TEXT PRIMARY KEY)");
      },
    },
    {
      version: 1,
      name: "001",
      up(d: Database.Database): void {
        order.push(1);
        d.exec("CREATE TABLE t1 (id TEXT PRIMARY KEY)");
      },
    },
    {
      version: 2,
      name: "002",
      up(d: Database.Database): void {
        order.push(2);
        d.exec("CREATE TABLE t2 (id TEXT PRIMARY KEY)");
      },
    },
  ];

  runMigrations(db, migrations);

  assert.deepEqual(order, [1, 2, 3], "MIG-U3: must apply in ascending order");
}

// ---------------------------------------------------------------------------
// MIG-U4: applied version recorded in _migrations
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);

  const m = makeMigration(5, "005_test");
  runMigrations(db, [m]);

  const row = db
    .prepare(
      "SELECT version, name FROM _migrations WHERE version = 5 LIMIT 1",
    )
    .get() as { version: number; name: string } | undefined;

  assert.ok(row !== undefined, "MIG-U4: row should be recorded");
  assert.equal(row?.version, 5);
  assert.equal(row?.name, "005_test");
}

// ---------------------------------------------------------------------------
// MIG-U5: idempotent — second runMigrations call doesn't re-apply
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);

  let callCount = 0;
  const m: Migration = {
    version: 1,
    name: "001_idempotent",
    up(d: Database.Database): void {
      callCount += 1;
      d.exec("CREATE TABLE IF NOT EXISTS t_idem (id TEXT PRIMARY KEY)");
    },
  };

  runMigrations(db, [m]);
  runMigrations(db, [m]);

  assert.equal(callCount, 1, "MIG-U5: up() must be called exactly once");
}

// ---------------------------------------------------------------------------
// MIG-U6: partial state — second call applies only remaining
// ---------------------------------------------------------------------------
{
  const db = makeDb();
  ensureMigrationsTable(db);

  const m1 = makeMigration(1, "001_partial");
  runMigrations(db, [m1]);

  const m2 = makeMigration(2, "002_partial");
  const m3 = makeMigration(3, "003_partial");

  // Run with all three; only 2 and 3 should be applied
  let appliedVersions: number[] = [];
  const migrations: Migration[] = [
    m1,
    {
      ...m2,
      up(d: Database.Database): void {
        appliedVersions.push(2);
        m2.up(d);
      },
    },
    {
      ...m3,
      up(d: Database.Database): void {
        appliedVersions.push(3);
        m3.up(d);
      },
    },
  ];

  runMigrations(db, migrations);
  assert.deepEqual(
    appliedVersions,
    [2, 3],
    "MIG-U6: only unnapplied versions should run",
  );
}

// ---------------------------------------------------------------------------
// MIG-U7: duplicate version inputs are rejected before execution
// ---------------------------------------------------------------------------
{
  const db = makeDb();

  let executed = 0;
  const duplicateA: Migration = {
    version: 1,
    name: "001_dup_a",
    up(d: Database.Database): void {
      executed += 1;
      d.exec("CREATE TABLE t_dup_a (id TEXT PRIMARY KEY)");
    },
  };
  const duplicateB: Migration = {
    version: 1,
    name: "001_dup_b",
    up(d: Database.Database): void {
      executed += 1;
      d.exec("CREATE TABLE t_dup_b (id TEXT PRIMARY KEY)");
    },
  };

  assert.throws(
    () => runMigrations(db, [duplicateA, duplicateB]),
    /duplicate migration version detected: 1/i,
    "MIG-U7: duplicate versions must throw before applying any migration",
  );
  assert.equal(executed, 0, "MIG-U7: no up() function should execute");
}

console.log("migrator.test.ts: all assertions passed");
