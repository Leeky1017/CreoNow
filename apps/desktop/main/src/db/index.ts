/**
 * apps/desktop/main/src/db/index.ts
 *
 * Public API for the TypeScript-based SQLite migration system.
 *
 * This module is the single import point for consumers that need the
 * application database. It exposes lifecycle + bootstrap helpers:
 *
 *   getDb()          — return the open Database instance (throws if not init'd)
 *   runMigrations()  — apply all pending TypeScript migrations in order
 *   closeDb()        — cleanly close the database connection
 *   initConnection() — open/register singleton from a db path (rejects path mismatch)
 *   setDbInstance()  — register an externally-opened connection (no replacement)
 *
 * Startup path:
<<<<<<< Updated upstream
 *   The production startup path is init.ts → initDb(). It runs the legacy SQL
 *   migrations directly and returns the open connection, then bridges this TS
 *   migration layer.
 *
 *   This module is NOT a full standalone bootstrap for an empty application
 *   database. It assumes core legacy tables (for example `projects`) already
 *   exist. Use it as a migration layer on top of the established initDb flow.
 *
 *   init.ts startup path remains legacy-first by design, but now consumes the
 *   shared `DB_MIGRATIONS` registry so TS bridge registration stays consistent
 *   across init and direct migration entrypoints.
=======
 *   The production startup path is init.ts → initDb(). After running its
 *   legacy SQL migrations, initDb() calls setDbInstance(conn) to register the
 *   connection with the singleton here, then calls runMigrations (migrator.ts)
 *   to layer the TypeScript schema on top.
 *
 *   This means getDb() is safe to call after initDb() returns successfully.
 *   Do NOT call getDb() before initDb() completes in production.
>>>>>>> Stashed changes
 *
 * Test harnesses:
 *   Import setDbInstance(db) and runMigrations() from this module; seed legacy
 *   dependency tables (e.g. `projects`) when a test scenario needs FK-backed
 *   inserts.
 *
 * Invariant obligations (must be satisfied by callers):
 *
 *   INV-1  (原稿保护): `document_versions` is the live snapshot store used by
 *           document services; `versions`/`branches` remain as Task #87 baseline
 *           tables. Any AI write MUST snapshot before mutating document content.
 *
 *   INV-9  (成本追踪): cost_records table is the persistence layer for per-call
 *           AI cost logs. Every AI invocation MUST write a cost_records row.
 */

import { closeDb, getDb, initConnection, setDbInstance } from "./connection";
import { DB_MIGRATIONS } from "./migrations/registry";
import { runMigrations as _runMigrations } from "./migrator";

export { getDb, closeDb };

/**
 * Apply all registered TypeScript migrations to the database obtained via
 * getDb().
 *
<<<<<<< Updated upstream
 * In tests, call this after setDbInstance(db) to set up an isolated
 * in-memory test database.
=======
 * In production, initDb() (init.ts) handles this automatically via the bridge.
 * In tests, call this after _injectDbForTesting(db).
>>>>>>> Stashed changes
 *
 * Idempotent — safe to call on every startup; already-applied migrations are
 * skipped via the _migrations tracking table.
 */
export function runMigrations(): void {
  const db = getDb();
  _runMigrations(db, [...DB_MIGRATIONS]);
}

export { initConnection, setDbInstance };
