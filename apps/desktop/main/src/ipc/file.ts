import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createDocumentService,
  type DocumentStatus,
  type DocumentType,
} from "../services/documents/documentService";
import { deriveContent } from "../services/documents/derive";
import { createStatsService } from "../services/stats/statsService";

type Actor = "user" | "auto" | "ai";
type SaveReason = "manual-save" | "autosave" | `ai-apply:${string}`;

const WORDS_PER_SECOND = 3;

function isAiApplyReason(reason: string): reason is `ai-apply:${string}` {
  const prefix = "ai-apply:";
  return (
    reason.startsWith(prefix) && reason.slice(prefix.length).trim().length > 0
  );
}

function countWords(text: string): number {
  const tokens = text
    .trim()
    .split(/\s+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tokens.length;
}

function estimateWritingSeconds(wordsAdded: number): number {
  const words = Math.max(0, Math.floor(wordsAdded));
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_SECOND));
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
      payload: { projectId: string; title?: string; type?: DocumentType },
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
        type: payload.type,
      });

      if (res.ok) {
        const stats = createStatsService({ db: deps.db, logger: deps.logger });
        const inc = stats.increment({
          ts: Date.now(),
          delta: { documentsCreated: 1 },
        });
        if (!inc.ok) {
          deps.logger.error("stats_increment_documents_created_failed", {
            code: inc.error.code,
            message: inc.error.message,
          });
        }
      }

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
        items: Array<{
          documentId: string;
          type: DocumentType;
          title: string;
          status: DocumentStatus;
          sortOrder: number;
          parentId?: string;
          updatedAt: number;
        }>;
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
        type: DocumentType;
        title: string;
        status: DocumentStatus;
        sortOrder: number;
        parentId?: string;
        contentJson: string;
        contentText: string;
        contentMd: string;
        contentHash: string;
        createdAt: number;
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
    "file:document:update",
    async (
      _e,
      payload: {
        projectId: string;
        documentId: string;
        title?: string;
        type?: DocumentType;
        status?: DocumentStatus;
        sortOrder?: number;
        parentId?: string;
      },
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
      const res = svc.update({
        projectId: payload.projectId,
        documentId: payload.documentId,
        title: payload.title,
        type: payload.type,
        status: payload.status,
        sortOrder: payload.sortOrder,
        parentId: payload.parentId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:save",
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

      type ContentTextRow = { contentText: string };
      const beforeRow = deps.db
        .prepare<
          [string, string],
          ContentTextRow
        >("SELECT content_text as contentText FROM documents WHERE project_id = ? AND document_id = ?")
        .get(payload.projectId, payload.documentId);
      const beforeWords = beforeRow ? countWords(beforeRow.contentText) : 0;

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.save({
        projectId: payload.projectId,
        documentId: payload.documentId,
        contentJson: parsed,
        actor: payload.actor,
        reason: payload.reason,
      });

      if (res.ok) {
        const derived = deriveContent({ contentJson: parsed });
        if (derived.ok) {
          const afterWords = countWords(derived.data.contentText);
          const deltaWords = Math.max(0, afterWords - beforeWords);
          if (deltaWords > 0) {
            const stats = createStatsService({
              db: deps.db,
              logger: deps.logger,
            });
            const inc = stats.increment({
              ts: res.data.updatedAt,
              delta: {
                wordsWritten: deltaWords,
                writingSeconds: estimateWritingSeconds(deltaWords),
              },
            });
            if (!inc.ok) {
              deps.logger.error("stats_increment_words_failed", {
                code: inc.error.code,
                message: inc.error.message,
              });
            }
          }
        } else {
          deps.logger.error("stats_derive_failed", {
            code: derived.error.code,
            message: derived.error.message,
          });
        }
      }

      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:getcurrent",
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
    "file:document:setcurrent",
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
    "file:document:reorder",
    async (
      _e,
      payload: { projectId: string; orderedDocumentIds: string[] },
    ): Promise<IpcResponse<{ updated: true }>> => {
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
      const res = svc.reorder({
        projectId: payload.projectId,
        orderedDocumentIds: payload.orderedDocumentIds,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "file:document:updatestatus",
    async (
      _e,
      payload: {
        projectId: string;
        documentId: string;
        status: DocumentStatus;
      },
    ): Promise<IpcResponse<{ updated: true; status: DocumentStatus }>> => {
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
      const res = svc.updateStatus({
        projectId: payload.projectId,
        documentId: payload.documentId,
        status: payload.status,
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
