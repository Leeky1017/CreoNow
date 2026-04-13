/**
 * Shared database interface types for engagement services.
 *
 * Extends the base DbLike/DbStatement (read-only) with run() for
 * INSERT/UPDATE operations. Used by quickCaptureService and
 * foreshadowingTracker.
 */
import type { DbLike, DbStatement } from "./storyStatusService";

export type { DbLike, DbStatement };

/**
 * Extends DbStatement with run() for UPDATE/INSERT statements.
 * better-sqlite3 returns { changes: number } from run().
 */
export interface DbRunStatement extends DbStatement {
  run(...args: unknown[]): { changes: number };
}

export interface DbLikeWithRun extends DbLike {
  prepare(sql: string): DbRunStatement;
}
