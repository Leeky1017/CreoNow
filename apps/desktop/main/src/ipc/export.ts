import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createExportService } from "../services/export/exportService";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import {
  getProjectSessionBindingRegistry,
  type ProjectSessionBindingRegistry,
} from "./projectSessionBinding";

type ExportPayloadError = IpcError;

type DocumentExportPayload = {
  projectId: string;
  documentId?: string;
};

function invalidPayload(message: string): ExportPayloadError {
  return { code: "INVALID_ARGUMENT", message };
}

function parseDocumentExportPayload(
  payload: unknown,
):
  | { ok: true; data: DocumentExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const projectId = (payload as { projectId?: unknown }).projectId;
  if (typeof projectId !== "string") {
    return { ok: false, error: invalidPayload("projectId must be a string") };
  }

  const documentId = (payload as { documentId?: unknown }).documentId;
  if (documentId !== undefined && typeof documentId !== "string") {
    return { ok: false, error: invalidPayload("documentId must be a string") };
  }

  return { ok: true, data: { projectId, documentId } };
}

function parseProjectBundlePayload(
  payload: unknown,
):
  | { ok: true; data: { projectId: string } }
  | { ok: false; error: ExportPayloadError } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const projectId = (payload as { projectId?: unknown }).projectId;
  if (typeof projectId !== "string") {
    return { ok: false, error: invalidPayload("projectId must be a string") };
  }

  return { ok: true, data: { projectId } };
}

function toUnexpectedExportError(error: unknown): ExportPayloadError {
  return {
    code: "INTERNAL_ERROR",
    message:
      error instanceof Error ? error.message : "Unexpected export IPC error",
  };
}

function resolveExportResponse(
  result:
    | { ok: true; data: { relativePath: string; bytesWritten: number } }
    | { ok: false; error: ExportPayloadError },
): IpcResponse<{ relativePath: string; bytesWritten: number }> {
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}

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
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  const projectSessionBinding =
    deps.projectSessionBinding ??
    getProjectSessionBindingRegistry() ??
    undefined;

  const invokeDocumentExport = async (
    event: unknown,
    channel: string,
    payload: unknown,
    run: (
      args: DocumentExportPayload,
    ) => Promise<
      | { ok: true; data: { relativePath: string; bytesWritten: number } }
      | { ok: false; error: ExportPayloadError }
    >,
  ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
    const guarded = guardAndNormalizeProjectAccess({
      event,
      payload,
      projectSessionBinding,
    });
    if (!guarded.ok) {
      return guarded.response;
    }

    const parsed = parseDocumentExportPayload(payload);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    try {
      const result = await run(parsed.data);
      return resolveExportResponse(result);
    } catch (error) {
      deps.logger.error("ipc_export_unexpected_error", {
        channel,
        message: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, error: toUnexpectedExportError(error) };
    }
  };

  deps.ipcMain.handle(
    "export:document:markdown",
    async (
      _e,
      payload: unknown,
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
      return invokeDocumentExport(
        _e,
        "export:document:markdown",
        payload,
        async (args) => svc.exportMarkdown(args),
      );
    },
  );

  deps.ipcMain.handle(
    "export:document:pdf",
    async (
      _e,
      payload: unknown,
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
      return invokeDocumentExport(
        _e,
        "export:document:pdf",
        payload,
        async (args) => svc.exportPdf(args),
      );
    },
  );

  deps.ipcMain.handle(
    "export:document:docx",
    async (
      _e,
      payload: unknown,
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
      return invokeDocumentExport(
        _e,
        "export:document:docx",
        payload,
        async (args) => svc.exportDocx(args),
      );
    },
  );

  deps.ipcMain.handle(
    "export:document:txt",
    async (
      _e,
      payload: unknown,
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
      return invokeDocumentExport(
        _e,
        "export:document:txt",
        payload,
        async (args) => svc.exportTxt(args),
      );
    },
  );

  deps.ipcMain.handle(
    "export:project:bundle",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const parsed = parseProjectBundlePayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const svc = createExportService({
        db: deps.db,
        logger: deps.logger,
        userDataDir: deps.userDataDir,
      });

      try {
        const result = await svc.exportProjectBundle(parsed.data);
        return resolveExportResponse(result);
      } catch (error) {
        deps.logger.error("ipc_export_unexpected_error", {
          channel: "export:project:bundle",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: toUnexpectedExportError(error) };
      }
    },
  );

  // ── P3: ProseMirror export handlers ──

  deps.ipcMain.handle(
    "export:document:prosemirror",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ documentId: string; content: string }>> => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      if (!payload || typeof payload !== "object") {
        return {
          ok: false,
          error: invalidPayload("payload must be an object"),
        };
      }

      const projectId = (payload as { projectId?: unknown }).projectId;
      if (typeof projectId !== "string" || projectId.trim().length === 0) {
        return {
          ok: false,
          error: invalidPayload("projectId is required"),
        };
      }

      const documentId = (payload as { documentId?: unknown }).documentId;
      if (typeof documentId !== "string" || documentId.trim().length === 0) {
        return {
          ok: false,
          error: invalidPayload("documentId is required"),
        };
      }

      try {
        const row = deps.db.prepare(
          "SELECT content_json as contentJson FROM documents WHERE project_id = ? AND document_id = ?",
        ).get(projectId, documentId) as { contentJson?: string } | undefined;

        if (!row || !row.contentJson) {
          return {
            ok: false,
            error: { code: "EXPORT_EMPTY_DOCUMENT", message: "Document not found or empty" },
          };
        }

        return {
          ok: true,
          data: { documentId, content: row.contentJson },
        };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:document:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "EXPORT_WRITE_ERROR", message: "Failed to read document content" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "export:project:prosemirror",
    async (
      event,
      payload: unknown,
    ): Promise<
      IpcResponse<{
        items: Array<{ documentId: string; title: string; content: string }>;
      }>
    > => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const parsed = parseProjectBundlePayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      try {
        const rows = deps.db.prepare(
          "SELECT document_id as documentId, title, content_json as contentJson FROM documents WHERE project_id = ?",
        ).all(parsed.data.projectId) as Array<{
          documentId: string;
          title: string;
          contentJson: string;
        }>;

        const items = rows.map((row) => ({
          documentId: row.documentId,
          title: row.title ?? "",
          content: row.contentJson ?? "{}",
        }));

        return { ok: true, data: { items } };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:project:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "EXPORT_WRITE_ERROR", message: "Failed to read project documents" },
        };
      }
    },
  );

  // ── P3: Export progress (stub — TODO: push notification) ──

  deps.ipcMain.handle(
    "export:progress:get",
    async (
      event,
      payload: unknown,
    ): Promise<
      IpcResponse<{ exportId: string; status: string; progress: number }>
    > => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      // TODO: integrate with real export progress tracking
      const exportId =
        (payload as { exportId?: string } | null)?.exportId ?? "none";
      return {
        ok: true,
        data: { exportId, status: "idle", progress: 0 },
      };
    },
  );
}
