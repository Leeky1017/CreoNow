import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createExportService } from "../services/export/exportService";

/**
 * Register `export:*` IPC handlers.
 *
 * Why: export writes files from the main process (Node FS APIs) while the
 * renderer only receives relative paths and bytes written.
 */
export function registerExportIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
}): void {
  deps.ipcMain.handle(
    "export:markdown",
    async (
      _e,
      payload: { projectId: string; documentId?: string },
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createExportService({
        db: deps.db,
        logger: deps.logger,
        userDataDir: deps.userDataDir,
      });
      const res = await svc.exportMarkdown(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "export:pdf",
    async (
      _e,
      payload: { projectId: string; documentId?: string },
    ): Promise<IpcResponse<never>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createExportService({
        db: deps.db,
        logger: deps.logger,
        userDataDir: deps.userDataDir,
      });
      const res = svc.exportPdf(payload);
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "export:docx",
    async (
      _e,
      payload: { projectId: string; documentId?: string },
    ): Promise<IpcResponse<never>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createExportService({
        db: deps.db,
        logger: deps.logger,
        userDataDir: deps.userDataDir,
      });
      const res = svc.exportDocx(payload);
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
  );
}

