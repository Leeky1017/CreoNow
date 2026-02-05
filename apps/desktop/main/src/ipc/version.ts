import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createDocumentService } from "../services/documents/documentService";

/**
 * Register `version:*` IPC handlers (minimal subset for P0).
 *
 * Why: autosave evidence and restores must be observable and testable via IPC.
 */
export function registerVersionIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "version:list",
    async (
      _e,
      payload: { documentId: string },
    ): Promise<
      IpcResponse<{
        items: Array<{
          versionId: string;
          actor: "user" | "auto" | "ai";
          reason: string;
          contentHash: string;
          createdAt: number;
        }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.documentId.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.listVersions({ documentId: payload.documentId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "version:read",
    async (
      _e,
      payload: { documentId: string; versionId: string },
    ): Promise<
      IpcResponse<{
        documentId: string;
        projectId: string;
        versionId: string;
        actor: "user" | "auto" | "ai";
        reason: string;
        contentJson: string;
        contentText: string;
        contentMd: string;
        contentHash: string;
        createdAt: number;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.documentId.trim().length === 0 ||
        payload.versionId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId/versionId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.readVersion({
        documentId: payload.documentId,
        versionId: payload.versionId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "version:restore",
    async (
      _e,
      payload: { documentId: string; versionId: string },
    ): Promise<IpcResponse<{ restored: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.documentId.trim().length === 0 ||
        payload.versionId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId/versionId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.restoreVersion({
        documentId: payload.documentId,
        versionId: payload.versionId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "version:aiApply:logConflict",
    async (
      _e,
      payload: { documentId: string; runId: string },
    ): Promise<IpcResponse<{ logged: true }>> => {
      if (
        payload.documentId.trim().length === 0 ||
        payload.runId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId/runId is required",
          },
        };
      }

      deps.logger.info("ai_apply_conflict", {
        runId: payload.runId,
        document_id: payload.documentId,
      });
      return { ok: true, data: { logged: true } };
    },
  );
}
