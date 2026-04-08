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
 *   The production startup path is init.ts → initDb(). After running its
 *   legacy SQL migrations, initDb() calls setDbInstance(conn) to register the
 *   connection with the singleton here, then calls runMigrations (migrator.ts)
 *   to layer the TypeScript schema on top.
 *
 *   This means getDb() is safe to call after initDb() returns successfully.
 *   Do NOT call getDb() before initDb() completes in production.
 *
 * Test harnesses:
 *   Call _injectDbForTesting(db) from connection.ts, then call runMigrations()
 *   from this module, to set up an isolated in-memory test database.
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
import { initialSchemaMigration } from "./migrations/ts/001_initial_schema";
import { runMigrations as _runMigrations } from "./migrator";

export { getDb, closeDb };

/**
 * Apply all registered TypeScript migrations to the database obtained via
 * getDb().
 *
 * In production, initDb() (init.ts) handles this automatically via the bridge.
 * In tests, call this after _injectDbForTesting(db).
 *
 * Idempotent — safe to call on every startup; already-applied migrations are
 * skipped via the _migrations tracking table.
 */
export function runMigrations(): void {
  const db = getDb();
  _runMigrations(db, [initialSchemaMigration]);
}

export { initConnection };
