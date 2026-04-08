/**
 * apps/desktop/main/src/db/index.ts
 *
 * Public API for the TypeScript-based SQLite migration system.
 *
 * This module is the single import point for consumers that need the
 * application database. It exposes three lifecycle functions:
 *
 *   getDb()          — return the open Database instance (throws if not init'd)
 *   runMigrations()  — apply all pending TypeScript migrations in order
 *   closeDb()        — cleanly close the database connection
 *
 * Startup path:
 *   The production startup path is init.ts → initDb(). It runs the legacy SQL
 *   migrations directly and returns the open connection, then bridges this TS
 *   migration layer.
 *
 *   This module is NOT a full standalone bootstrap for an empty application
 *   database. It assumes core legacy tables (for example `projects`) already
 *   exist. Use it as a migration layer on top of the established initDb flow.
 *
 *   init.ts startup path is NOT modified — it remains untouched as required by
 *   "adapt carefully and do not break existing startup behavior".
 *
 * Test harnesses:
 *   Call _injectDbForTesting(db) from connection.ts, then call runMigrations()
 *   from this module; seed legacy dependency tables (e.g. `projects`) when a
 *   test scenario needs FK-backed inserts.
 *
 * Invariant obligations (must be satisfied by callers):
 *
 *   INV-1  (原稿保护): versions table provides the pre-write snapshot target.
 *           Any AI write MUST snapshot before mutating document content.
 *
 *   INV-9  (成本追踪): cost_records table is the persistence layer for per-call
 *           AI cost logs. Every AI invocation MUST write a cost_records row.
 */

import { closeDb, getDb, initConnection } from "./connection";
import { initialSchemaMigration } from "./migrations/001_initial_schema";
import { runMigrations as _runMigrations } from "./migrator";

export { getDb, closeDb };

/**
 * Apply all registered TypeScript migrations to the database obtained via
 * getDb().
 *
 * In tests, call this after _injectDbForTesting(db) to set up an isolated
 * in-memory test database.
 *
 * Idempotent — safe to call on every startup; already-applied migrations are
 * skipped via the _migrations tracking table.
 */
export function runMigrations(): void {
  const db = getDb();
  _runMigrations(db, [initialSchemaMigration]);
}

export { initConnection };
