import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createDocumentService } from "../services/documents/documentService";

type Actor = "user" | "auto" | "ai";
type SaveReason = "manual-save" | "autosave" | `ai-apply:${string}`;

function isAiApplyReason(reason: string): reason is `ai-apply:${string}` {
  const prefix = "ai-apply:";
  return (
    reason.startsWith(prefix) && reason.slice(prefix.length).trim().length > 0
  );
}

/**
 * Register `file:document:*` IPC handlers.
 *
 * Why: documents are DB SSOT in V1; renderer must persist TipTap JSON and read it
 * back across restarts without leaking DB details across IPC.
 */
export function registerFileIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "file:document:create",
    async (
      _e,
      payload: { projectId: string; title?: string },
    ): Promise<IpcResponse<{ documentId: string }>> => {
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

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.create({
        projectId: payload.projectId,
        title: payload.title,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:list",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{
        items: Array<{ documentId: string; title: string; updatedAt: number }>;
      }>
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

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.list({ projectId: payload.projectId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:read",
    async (
      _e,
      payload: { projectId: string; documentId: string },
    ): Promise<
      IpcResponse<{
        documentId: string;
        projectId: string;
        title: string;
        contentJson: string;
        contentText: string;
        contentMd: string;
        contentHash: string;
        updatedAt: number;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.projectId.trim().length === 0 ||
        payload.documentId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.read({
        projectId: payload.projectId,
        documentId: payload.documentId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:rename",
    async (
      _e,
      payload: { projectId: string; documentId: string; title: string },
    ): Promise<IpcResponse<{ updated: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.projectId.trim().length === 0 ||
        payload.documentId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.rename({
        projectId: payload.projectId,
        documentId: payload.documentId,
        title: payload.title,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:write",
    async (
      _e,
      payload: {
        projectId: string;
        documentId: string;
        contentJson: string;
        actor: Actor;
        reason: SaveReason;
      },
    ): Promise<IpcResponse<{ updatedAt: number; contentHash: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.projectId.trim().length === 0 ||
        payload.documentId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(payload.contentJson);
      } catch {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "contentJson must be valid JSON",
          },
        };
      }

      if (
        (payload.actor === "user" && payload.reason !== "manual-save") ||
        (payload.actor === "auto" && payload.reason !== "autosave") ||
        (payload.actor === "ai" && !isAiApplyReason(payload.reason))
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "actor/reason mismatch",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.write({
        projectId: payload.projectId,
        documentId: payload.documentId,
        contentJson: parsed,
        actor: payload.actor,
        reason: payload.reason,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:getCurrent",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ documentId: string }>> => {
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

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.getCurrent({ projectId: payload.projectId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:setCurrent",
    async (
      _e,
      payload: { projectId: string; documentId: string },
    ): Promise<IpcResponse<{ documentId: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.projectId.trim().length === 0 ||
        payload.documentId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.setCurrent({
        projectId: payload.projectId,
        documentId: payload.documentId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:delete",
    async (
      _e,
      payload: { projectId: string; documentId: string },
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.projectId.trim().length === 0 ||
        payload.documentId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.delete({
        projectId: payload.projectId,
        documentId: payload.documentId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
