import type { IpcError } from "../../../../../packages/shared/types/ipc-generated";

let lastDbInitError: IpcError | null = null;

/**
 * Update the latest DB init error snapshot for IPC fallback responses.
 *
 * Why: handlers need startup diagnostics without importing DB migration modules.
 */
export function setDbInitError(error: IpcError | null): void {
  lastDbInitError = error;
}

/**
 * Resolve the DB-not-ready payload from an optional startup error.
 *
 * Why: unit tests should validate error shape without depending on process-global state.
 */
export function createDbNotReadyErrorFromInitError(
  dbInitError: IpcError | null,
): IpcError {
  if (dbInitError) {
    return dbInitError;
  }
  return { code: "DB_ERROR", message: "Database not ready" };
}

/**
 * Build a deterministic DB-not-ready error with startup diagnostics when present.
 *
 * Why: renderer needs actionable remediation details for native DB failures.
 */
export function createDbNotReadyError(): IpcError {
  return createDbNotReadyErrorFromInitError(lastDbInitError);
}
