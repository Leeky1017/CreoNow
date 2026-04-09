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

import path from "node:path";
import Database from "better-sqlite3";

import { applyRecommendedPragmas } from "./recommendedPragmas";

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _instance: Database.Database | null = null;
let _instancePath: string | null = null;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isClosedConnectionError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("database connection is not open") ||
    message.includes("database handle is closed") ||
    message.includes("already closed")
  );
}

function canUseConnection(db: Database.Database): boolean {
  try {
    db.prepare("SELECT 1").get();
    return true;
  } catch (error) {
    if (isClosedConnectionError(error)) {
      return false;
    }
    throw error;
  }
}

function clearSingletonState(): void {
  _instance = null;
  _instancePath = null;
}

function getLiveSingleton(): Database.Database | null {
  if (!_instance) {
    return null;
  }
  if (canUseConnection(_instance)) {
    return _instance;
  }
  clearSingletonState();
  return null;
}

function normaliseDbPath(dbPath: string): string {
  // better-sqlite3 reports in-memory DBs as an empty string in PRAGMA output.
  if (dbPath === "" || dbPath === ":memory:") {
    return ":memory:";
  }
  return path.resolve(dbPath);
}

function inferDbPath(db: Database.Database): string | null {
  const rows = db
    .prepare("PRAGMA database_list")
    .all() as Array<{ name: string; file: string }>;
  const main = rows.find((row) => row.name === "main");
  if (!main) {
    return null;
  }
  return normaliseDbPath(main.file);
}

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
  const instance = getLiveSingleton();
  if (!instance) {
    throw new Error(
      "DB connection not initialised. Call initConnection() or setDbInstance() first.",
    );
  }
  return instance;
}

/**
 * Open (or return cached) SQLite connection at `dbPath`.
 *
 * Safe to call multiple times with the same path.
 *
 * A different path is rejected explicitly: silently reusing an existing
 * singleton for a different dbPath can route writes to the wrong SQLite file.
 *
 * Why `:memory:` is allowed: integration tests use in-memory databases.
 */
export function initConnection(dbPath: string): Database.Database {
  const requestedPath = normaliseDbPath(dbPath);
  const instance = getLiveSingleton();
  if (instance) {
    const currentPath = _instancePath ?? inferDbPath(instance);
    if (currentPath && currentPath !== requestedPath) {
      throw new Error(
        `DB connection already initialised at '${currentPath}'. Refusing to reinitialise with different path '${requestedPath}'. Call closeDb() first.`,
      );
    }
    return instance;
  }

  const db = new Database(dbPath);

  // journal_mode = WAL: concurrent readers don't block writers — required for
  //   Electron where renderer IPC reads while main process writes.
  // foreign_keys = ON: enforces FK constraints — INV-1 / INV-9 rely on this.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  applyRecommendedPragmas(db);

  _instance = db;
  _instancePath = requestedPath;
  return db;
}

/**
 * Register an already-opened Database instance as the singleton.
 *
 * Primarily used by test harnesses and future integration points that open
 * their own connection and need getDb() to resolve it.
 *
 * Safety contract:
 *  - idempotent when called with the same instance
 *  - rejects replacing an existing singleton with a different live handle
 *
 * Why: silent replacement can orphan the old handle, violating the singleton
 * invariant and leaking a usable database connection in-process.
 */
export function setDbInstance(db: Database.Database): void {
  if (!canUseConnection(db)) {
    throw new Error(
      "Cannot register a closed database connection. Open a fresh connection first.",
    );
  }
  const current = getLiveSingleton();
  if (current && current !== db) {
    const currentPath = _instancePath ?? inferDbPath(current) ?? "<unknown>";
    const requestedPath = inferDbPath(db) ?? "<unknown>";
    throw new Error(
      `DB singleton already registered at '${currentPath}'. Refusing to replace with '${requestedPath}'. Call closeDb() first.`,
    );
  }
  _instance = db;
  _instancePath = inferDbPath(db);
}

/**
 * Clear singleton pointer only when it still references `db`.
 *
 * Why: initDb() failure cleanup must never clear or close a previously healthy
 * singleton that belongs to another successful initialization attempt.
 */
export function clearDbInstanceIfMatch(db: Database.Database): void {
  if (_instance === db) {
    clearSingletonState();
  }
}

/**
 * Close the active database connection and clear the singleton.
 *
 * Idempotent: safe to call when no connection is open.
 */
export function closeDb(): void {
  if (_instance) {
    const instance = _instance;
    clearSingletonState();
    try {
      instance.close();
    } catch (error) {
      if (!isClosedConnectionError(error)) {
        throw error;
      }
    }
  }
}
