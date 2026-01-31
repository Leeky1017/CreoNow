import fs from "node:fs";

import Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { getDbPaths, redactUserDataPath } from "./paths";

import initSql from "./migrations/0001_init.sql?raw";

export type DbInitOk = {
  ok: true;
  db: Database.Database;
  schemaVersion: number;
};

export type DbInitErr = {
  ok: false;
  error: IpcError;
};

export type DbInitResult = DbInitOk | DbInitErr;

type Migration = {
  version: number;
  name: string;
  sql: string;
};

const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: "0001_init", sql: initSql },
];

/**
 * Build a stable IPC error object.
 *
 * Why: DB failures must not leak raw stacks or absolute paths across the IPC boundary.
 */
function ipcError(
  code: IpcErrorCode,
  message: string,
  details?: unknown,
): IpcError {
  return { code, message, details };
}

/**
 * Ensure a `schema_version` table exists and return its current version.
 *
 * Why: deterministic, recoverable migrations across launches and Windows E2E.
 */
function ensureSchemaVersion(db: Database.Database): number {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
  );
  const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as
    | { version: number }
    | undefined;
  if (!row) {
    db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
    return 0;
  }
  return row.version;
}

/**
 * Persist the schema version.
 *
 * Why: the app must be able to resume migrations after an interrupted run.
 */
function setSchemaVersion(db: Database.Database, version: number): void {
  db.prepare("UPDATE schema_version SET version = ?").run(version);
}

/**
 * Open and migrate the application SQLite database.
 *
 * Why: P0 requires deterministic DB + migrations + logs evidence in Windows E2E.
 */
export function initDb(args: {
  userDataDir: string;
  logger: Logger;
}): DbInitResult {
  const { dbDir, dbPath } = getDbPaths(args.userDataDir);
  const dbPathRedacted = redactUserDataPath(args.userDataDir, dbPath);
  let schemaVersion: number | null = null;
  let db: Database.Database | null = null;

  try {
    fs.mkdirSync(dbDir, { recursive: true });
    const conn = new Database(dbPath);
    db = conn;

    conn.pragma("foreign_keys = ON");
    conn.pragma("journal_mode = WAL");

    const current = ensureSchemaVersion(conn);
    schemaVersion = current;

    const pending = [...MIGRATIONS]
      .filter((m) => m.version > current)
      .sort((a, b) => a.version - b.version);

    const appliedVersions: number[] = [];

    conn.transaction(() => {
      for (const m of pending) {
        conn.exec(m.sql);
        setSchemaVersion(conn, m.version);
        appliedVersions.push(m.version);
      }
    })();

    const finalSchemaVersion = ensureSchemaVersion(conn);
    schemaVersion = finalSchemaVersion;

    args.logger.info("db_ready", {
      db_path: dbPathRedacted,
      schema_version: finalSchemaVersion,
      migration_applied: appliedVersions,
    });

    return { ok: true, db: conn, schemaVersion: finalSchemaVersion };
  } catch (error) {
    try {
      db?.close();
    } catch (closeError) {
      args.logger.error("db_close_failed", {
        message:
          closeError instanceof Error ? closeError.message : String(closeError),
      });
    }

    args.logger.error("migration_failed", {
      code: "DB_ERROR",
      message: error instanceof Error ? error.message : String(error),
      db_path: dbPathRedacted,
      schema_version: schemaVersion,
    });
    return {
      ok: false,
      error: ipcError("DB_ERROR", "Failed to initialize database"),
    };
  }
}
