/**
 * connection.ts — SQLite connection singleton for CreoNow
 *
 * Responsibilities:
 *  - Open exactly one Database instance per process (singleton pattern)
 *  - Apply mandatory pragmas on first open:
 *      journal_mode = WAL     (concurrent readers without blocking writers)
 *      foreign_keys = ON      (enforce referential integrity — required by INV-1)
 *  - Delegate performance pragmas to applyRecommendedPragmas
 *  - Provide closeDb() for clean shutdown
 *
 * Boundary: does NOT run migrations. Callers must call runMigrations() after
 * obtaining the db handle via getDb().
 *
 * INV-1: versions table write-path depends on foreign_keys being enforced here.
 * INV-9: cost_records table FK to sessions is enforced by this pragma setting.
 */

import Database from "better-sqlite3";

import { applyRecommendedPragmas } from "./recommendedPragmas";

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _instance: Database.Database | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the active Database instance.
 *
 * Throws if the connection has not been initialised with initConnection().
 * Why explicit error: silent null returns would let callers proceed with an
 * uninitialised DB and produce confusing runtime failures.
 */
export function getDb(): Database.Database {
  if (!_instance) {
    throw new Error(
      "DB connection not initialised. Call initConnection() before getDb().",
    );
  }
  return _instance;
}

/**
 * Open (or return cached) SQLite connection at `dbPath`.
 *
 * Safe to call multiple times — subsequent calls with the same path are no-ops
 * and return the existing instance.
 *
 * Why `:memory:` is allowed: integration tests use in-memory databases.
 *
 * @param dbPath  Absolute filesystem path or `:memory:` for in-memory DBs.
 */
export function initConnection(dbPath: string): Database.Database {
  if (_instance) {
    return _instance;
  }

  const db = new Database(dbPath);

  // Mandatory pragmas applied before any schema work.
  // journal_mode = WAL: allows concurrent reads during write; required for
  //   Electron where renderer IPC may read while main writes.
  // foreign_keys = ON: enforces FK constraints — INV-1 relies on this.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  applyRecommendedPragmas(db);

  _instance = db;
  return db;
}

/**
 * Close the active database connection and clear the singleton.
 *
 * Idempotent: safe to call when no connection is open.
 */
export function closeDb(): void {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

/**
 * Replace the singleton with a pre-constructed Database instance.
 *
 * Intended for test harnesses that need to inject an already-configured
 * in-memory database without going through the filesystem path.
 *
 * Why: avoids leaking the mutable singleton while keeping tests isolated.
 */
export function _injectDbForTesting(db: Database.Database): void {
  _instance = db;
}
