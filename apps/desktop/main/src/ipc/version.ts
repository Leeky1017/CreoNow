import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { VersionDiffPayload } from "../../../../../packages/shared/types/version-diff";
import type { Logger } from "../logging/logger";
import {
  createDocumentService,
  type VersionSnapshotActor,
  type VersionSnapshotReason,
} from "../services/documents/documentService";

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
    "version:snapshot:create",
    async (
      _e,
      payload: {
        projectId: string;
        documentId: string;
        contentJson: string;
        actor: VersionSnapshotActor;
        reason: VersionSnapshotReason;
      },
    ): Promise<
      IpcResponse<{
        versionId: string;
        contentHash: string;
        wordCount: number;
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

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const saved = svc.save({
        projectId: payload.projectId,
        documentId: payload.documentId,
        contentJson: parsed,
        actor: payload.actor,
        reason: payload.reason,
      });
      if (!saved.ok) {
        return { ok: false, error: saved.error };
      }

      const listed = svc.listVersions({ documentId: payload.documentId });
      if (!listed.ok) {
        return { ok: false, error: listed.error };
      }
      const latest = listed.data.items[0];
      if (!latest) {
        return {
          ok: false,
          error: {
            code: "DB_ERROR",
            message: "Snapshot create succeeded but no snapshot found",
          },
        };
      }

      return {
        ok: true,
        data: {
          versionId: latest.versionId,
          contentHash: latest.contentHash,
          wordCount: latest.wordCount,
          createdAt: latest.createdAt,
        },
      };
    },
  );

  deps.ipcMain.handle(
    "version:snapshot:list",
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
          wordCount: number;
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
    "version:snapshot:read",
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
        wordCount: number;
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
    "version:snapshot:diff",
    async (
      _e,
      payload: {
        documentId: string;
        baseVersionId: string;
        targetVersionId?: string;
      },
    ): Promise<IpcResponse<VersionDiffPayload>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (
        payload.documentId.trim().length === 0 ||
        payload.baseVersionId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId/baseVersionId is required",
          },
        };
      }
      if (
        payload.targetVersionId !== undefined &&
        payload.targetVersionId.trim().length === 0
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "targetVersionId must be a non-empty string when provided",
          },
        };
      }

      const svc = createDocumentService({ db: deps.db, logger: deps.logger });
      const res = svc.diffVersions({
        documentId: payload.documentId,
        baseVersionId: payload.baseVersionId,
        targetVersionId: payload.targetVersionId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "version:snapshot:rollback",
    async (
      _e,
      payload: { documentId: string; versionId: string },
    ): Promise<
      IpcResponse<{
        restored: true;
        preRollbackVersionId: string;
        rollbackVersionId: string;
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
      const res = svc.rollbackVersion({
        documentId: payload.documentId,
        versionId: payload.versionId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "version:snapshot:restore",
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
    "version:aiapply:logconflict",
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
