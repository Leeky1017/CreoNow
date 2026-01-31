import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  ensureCreonowDirStructure,
  getCreonowDirStatus,
} from "../services/context/creonowDir";

type ProjectRow = {
  rootPath: string;
};

/**
 * Register `context:creonow:*` IPC handlers (minimal subset for P0 entry).
 *
 * Why: `.creonow` is the stable, project-relative metadata root required by P0.
 */
export function registerCreonowContextIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
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
            watching: false,
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
}
