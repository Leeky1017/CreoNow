/**
 * connection.ts — SQLite connection singleton for CreoNow
 *
 * Responsibilities:
 *  - Hold exactly one Database instance per process (singleton pattern)
 *  - Apply mandatory pragmas when opening a new connection:
 *      journal_mode = WAL     (concurrent reads without blocking writes)
 *      foreign_keys = ON      (referential integrity — required by INV-1)
 *  - Delegate performance pragmas to applyRecommendedPragmas
 *  - Allow init.ts to register its already-opened connection via setDbInstance
 *  - Provide closeDb() for clean shutdown
 *
 * Boundary: does NOT run migrations. Callers must call runMigrations() after
 * obtaining the db handle via getDb().
 *
 * INV-1: versions.branch_id FK depends on foreign_keys being ON.
 * INV-9: cost_records.session_id FK depends on foreign_keys being ON.
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
 * Throws if no connection has been registered.
 * Why explicit error: silent null returns hide initialisation ordering bugs.
 */
export function getDb(): Database.Database {
  if (!_instance) {
    throw new Error(
      "DB connection not initialised. Call initConnection() or setDbInstance() first.",
    );
  }
  return _instance;
}

/**
 * Open (or return cached) SQLite connection at `dbPath`.
 *
 * Safe to call multiple times — subsequent calls are no-ops and return the
 * existing instance.
 *
 * Why `:memory:` is allowed: integration tests use in-memory databases.
 */
export function initConnection(dbPath: string): Database.Database {
  if (_instance) {
    return _instance;
  }

  const db = new Database(dbPath);

  // journal_mode = WAL: concurrent readers don't block writers — required for
  //   Electron where renderer IPC reads while main process writes.
  // foreign_keys = ON: enforces FK constraints — INV-1 / INV-9 rely on this.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  applyRecommendedPragmas(db);

  _instance = db;
  return db;
}

/**
 * Register an already-opened Database instance as the singleton.
 *
 * Primarily used by test harnesses and future integration points that open
 * their own connection and need getDb() to resolve it. Idempotent when called
 * with the same instance.
 */
export function setDbInstance(db: Database.Database): void {
  _instance = db;
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
