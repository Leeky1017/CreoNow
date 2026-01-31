import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  ensureCreonowDirStructure,
  getCreonowDirStatus,
  getCreonowRootPath,
} from "../services/context/contextFs";
import { redactUserDataPath } from "../db/paths";
import type { CreonowWatchService } from "../services/context/watchService";

type ProjectRow = {
  rootPath: string;
};

/**
 * Register `context:creonow:*` IPC handlers (P0 subset).
 *
 * Why: `.creonow` is the stable, project-relative metadata root required by P0,
 * and watch start/stop must be owned by the main process (Node APIs).
 */
export function registerContextIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
  watchService: CreonowWatchService;
}): void {
  deps.ipcMain.handle(
    "context:creonow:ensure",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ rootPath: string; ensured: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        deps.logger.info("context_ensure", {
          projectId: payload.projectId,
          rootPath: redactUserDataPath(deps.userDataDir, row.rootPath),
        });

        return { ok: true, data: { rootPath: row.rootPath, ensured: true } };
      } catch (error) {
        deps.logger.error("creonow_ensure_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to ensure .creonow" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:creonow:status",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{ exists: boolean; watching: boolean; rootPath?: string }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const status = getCreonowDirStatus(row.rootPath);
        if (!status.ok) {
          return { ok: false, error: status.error };
        }

        return {
          ok: true,
          data: {
            exists: status.data.exists,
            watching: deps.watchService.isWatching({
              projectId: payload.projectId,
            }),
            rootPath: row.rootPath,
          },
        };
      } catch (error) {
        deps.logger.error("creonow_status_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: {
            code: "IO_ERROR",
            message: "Failed to read .creonow status",
          },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:creonow:watch:start",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ watching: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const creonowRootPath = getCreonowRootPath(row.rootPath);
        const started = deps.watchService.start({
          projectId: payload.projectId,
          creonowRootPath,
        });
        if (!started.ok) {
          return { ok: false, error: started.error };
        }

        deps.logger.info("context_watch_started", { projectId: payload.projectId });
        return { ok: true, data: started.data };
      } catch (error) {
        deps.logger.error("context_watch_start_ipc_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to start .creonow watch" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:creonow:watch:stop",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ watching: false }>> => {
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const stopped = deps.watchService.stop({ projectId: payload.projectId });
        if (!stopped.ok) {
          return { ok: false, error: stopped.error };
        }

        deps.logger.info("context_watch_stopped", { projectId: payload.projectId });
        return { ok: true, data: stopped.data };
      } catch (error) {
        deps.logger.error("context_watch_stop_ipc_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to stop .creonow watch" },
        };
      }
    },
  );
}
