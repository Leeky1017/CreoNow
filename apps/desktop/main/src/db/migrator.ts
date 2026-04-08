/**
 * migrator.ts — TypeScript-based migration runner for CreoNow SQLite
 *
 * Responsibilities:
 *  - Maintain the `_migrations` tracking table
 *  - Detect which migrations have not yet been applied
 *  - Apply pending migrations in ascending version order within a single transaction
 *  - Record each applied version in `_migrations`
 *
 * Boundary: this module only manages migration state. It does NOT open or close
 * database connections. Callers provide the Database instance.
 *
 * INV references: none directly, but migrations for versions and cost_records
 * must satisfy INV-1 (versions table) and INV-9 (cost_records table).
 */

import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A single migration unit.
 *
 * `down` is optional. If omitted the comment `// @rollback: manual` is implied
 * — callers must implement manual rollback procedures for that schema change.
 */
export type Migration = {
  /** Monotonically increasing integer. Gaps are allowed but ordering is strict. */
  version: number;
  /** Human-readable name used for logging and the _migrations record. */
  name: string;
  /** Apply this migration to the given database. Runs inside a transaction. */
  up: (db: Database.Database) => void;
  /**
   * Undo this migration.
   * @rollback: manual — if absent, schema rollback requires manual intervention.
   */
  down?: (db: Database.Database) => void;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    applied_at TEXT    NOT NULL
  )
`;

/**
 * Ensure the `_migrations` tracking table exists.
 *
 * Why: the table must be idempotently created before any read/write of
 * migration state so that the first launch creates it automatically.
 */
export function ensureMigrationsTable(db: Database.Database): void {
  db.exec(CREATE_MIGRATIONS_TABLE);
}

/**
 * Fetch the set of already-applied version numbers from `_migrations`.
 */
function getAppliedVersions(db: Database.Database): Set<number> {
  type Row = { version: number };
  const rows = db
    .prepare("SELECT version FROM _migrations")
    .all() as Row[];
  return new Set(rows.map((r) => r.version));
}

/**
 * Persist a single applied migration version in `_migrations`.
 * Called inside the enclosing transaction after `up()` succeeds.
 */
export function recordMigrationApplied(
  db: Database.Database,
  version: number,
  name: string,
): void {
  db.prepare(
    "INSERT OR IGNORE INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
  ).run(version, name, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the subset of `migrations` that have not yet been applied, sorted
 * in ascending version order.
 *
 * Exposed for unit-testing the detection logic in isolation.
 */
export function buildPendingMigrations(
  db: Database.Database,
  migrations: Migration[],
): Migration[] {
  const applied = getAppliedVersions(db);
  return [...migrations]
    .filter((m) => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);
}

/**
 * Apply all pending migrations in a single transaction.
 *
 * - Idempotent: safe to call on every app start; already-applied versions
 *   are skipped.
 * - Atomic: if any `up()` throws the entire batch is rolled back.
 * - Order: migrations are applied in ascending `version` order regardless
 *   of the order they appear in the `migrations` array.
 */
export function runMigrations(
  db: Database.Database,
  migrations: Migration[],
): void {
  ensureMigrationsTable(db);
  const pending = buildPendingMigrations(db, migrations);

  if (pending.length === 0) {
    return;
  }

  db.transaction(() => {
    for (const m of pending) {
      m.up(db);
      recordMigrationApplied(db, m.version, m.name);
    }
  })();
}
