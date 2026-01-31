import fs from "node:fs";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

/**
 * Build a stable IPC error object.
 *
 * Why: filesystem watcher failures must not leak raw stacks across IPC.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

export type CreonowWatchService = {
  isWatching: (args: { projectId: string }) => boolean;
  start: (args: {
    projectId: string;
    creonowRootPath: string;
  }) => ServiceResult<{ watching: true }>;
  stop: (args: { projectId: string }) => ServiceResult<{ watching: false }>;
};

/**
 * Create a `.creonow` watch service.
 *
 * Why: watchers must be owned by the main process (Node APIs), be idempotent,
 * and provide observable failures via stable error codes + logs.
 */
export function createCreonowWatchService(deps: {
  logger: Logger;
}): CreonowWatchService {
  const watchers = new Map<string, fs.FSWatcher>();
  const supportsRecursiveWatch =
    process.platform === "win32" || process.platform === "darwin";

  const safeClose = (watcher: fs.FSWatcher): void => {
    try {
      watcher.close();
    } catch (error) {
      deps.logger.error("context_watch_close_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    isWatching: ({ projectId }) => watchers.has(projectId),

    start: ({ projectId, creonowRootPath }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }
      if (creonowRootPath.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "creonowRootPath is required");
      }

      const existing = watchers.get(projectId);
      if (existing) {
        return { ok: true, data: { watching: true } };
      }

      try {
        const watcher = fs.watch(
          creonowRootPath,
          { recursive: supportsRecursiveWatch },
          () => {
            // Intentionally ignored in P0: renderer will pull fresh context on demand.
          },
        );
        watcher.on("error", () => {
          deps.logger.error("context_watch_error", {
            projectId,
            code: "IO_ERROR",
          });
        });
        watchers.set(projectId, watcher);
        return { ok: true, data: { watching: true } };
      } catch (error) {
        deps.logger.error("context_watch_start_failed", {
          projectId,
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("IO_ERROR", "Failed to start .creonow watch");
      }
    },

    stop: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const watcher = watchers.get(projectId);
      if (!watcher) {
        return { ok: true, data: { watching: false } };
      }

      safeClose(watcher);
      watchers.delete(projectId);
      return { ok: true, data: { watching: false } };
    },
  };
}
