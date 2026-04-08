/**
 * apps/desktop/main/src/db/index.ts
 *
 * Public API for the TypeScript-based SQLite migration system.
 *
 * This module is the single import point for consumers that need the
 * application database. It composes the connection singleton, the migration
 * runner, and the baseline schema into three lifecycle functions:
 *
 *   getDb()          — return the open Database instance (throws if not init'd)
 *   runMigrations()  — apply all pending TypeScript migrations in order
 *   closeDb()        — cleanly close the database connection
 *
 * Invariant obligations (must be satisfied by callers):
 *
 *   INV-1  (原稿保护): versions table created by 001_initial_schema provides
 *           the pre-write snapshot target. Any AI write MUST call a version
 *           snapshot before mutating document content.
 *
 *   INV-9  (成本追踪): cost_records table created by 001_initial_schema
 *           is the persistence layer for per-call AI cost logs. Every AI
 *           invocation MUST write a cost_records row.
 *
 * Compatibility note:
 *   The legacy SQL-based init flow (init.ts → initDb()) is NOT replaced here.
 *   apps/desktop/main/src/index.ts continues to use initDb() for the
 *   production Electron startup path. This module is the forward-looking API
 *   for test harnesses and future incremental adoption.
 */

import { closeDb, getDb, initConnection } from "./connection";
import { initialSchemaMigration } from "./migrations/ts/001_initial_schema";
import { runMigrations as _runMigrations } from "./migrator";

export { getDb, closeDb };

/**
 * Apply all registered TypeScript migrations to the database obtained via
 * getDb().
 *
 * Must be called after initConnection(). Idempotent — safe to call on every
 * startup; already-applied migrations are skipped.
 */
export function runMigrations(): void {
  const db = getDb();
  _runMigrations(db, [initialSchemaMigration]);
}

export { initConnection };
