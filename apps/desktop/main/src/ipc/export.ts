import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import { EXPORT_PROGRESS_CHANNEL, type ExportProgressEvent } from "@shared/types/export";
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

type ProsemirrorExportOptions = {
  format: "markdown" | "docx" | "pdf" | "txt";
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  pageSize?: "a4" | "letter";
  fontSize?: number;
};

type ProsemirrorDocumentExportPayload = {
  projectId: string;
  documentId: string;
  outputPath: string;
  options: ProsemirrorExportOptions;
};

type ProsemirrorProjectExportPayload = {
  projectId: string;
  outputPath: string;
  options: ProsemirrorExportOptions;
  documentIds?: string[];
  mergeIntoOne?: boolean;
};

type ProsemirrorExportResponse = {
  exportId: string;
  documentCount: number;
  outputPath: string;
  format: string;
  totalWordCount: number;
  durationMs: number;
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

function parseExportOptions(
  raw: unknown,
): ProsemirrorExportOptions | ExportPayloadError {
  if (!raw || typeof raw !== "object") {
    return invalidPayload("options must be an object");
  }

  const options = raw as Record<string, unknown>;
  if (
    options.format !== "markdown" &&
    options.format !== "docx" &&
    options.format !== "pdf" &&
    options.format !== "txt"
  ) {
    return invalidPayload("options.format must be one of: markdown, docx, pdf, txt");
  }

  if (
    options.pageSize !== undefined &&
    options.pageSize !== "a4" &&
    options.pageSize !== "letter"
  ) {
    return invalidPayload("options.pageSize must be a4 or letter");
  }

  if (
    options.fontSize !== undefined &&
    (typeof options.fontSize !== "number" || !Number.isFinite(options.fontSize))
  ) {
    return invalidPayload("options.fontSize must be a finite number");
  }

  return {
    format: options.format,
    includeMetadata:
      typeof options.includeMetadata === "boolean"
        ? options.includeMetadata
        : undefined,
    includeTableOfContents:
      typeof options.includeTableOfContents === "boolean"
        ? options.includeTableOfContents
        : undefined,
    pageSize:
      options.pageSize === "a4" || options.pageSize === "letter"
        ? options.pageSize
        : undefined,
    fontSize:
      typeof options.fontSize === "number" ? options.fontSize : undefined,
  };
}

function parseProsemirrorDocumentExportPayload(
  payload: unknown,
):
  | { ok: true; data: ProsemirrorDocumentExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const raw = payload as Record<string, unknown>;
  if (typeof raw.projectId !== "string" || raw.projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }
  if (typeof raw.documentId !== "string" || raw.documentId.trim().length === 0) {
    return { ok: false, error: invalidPayload("documentId is required") };
  }
  if (typeof raw.outputPath !== "string" || raw.outputPath.trim().length === 0) {
    return { ok: false, error: invalidPayload("outputPath is required") };
  }
  const options = parseExportOptions(raw.options);
  if ("code" in options) {
    return { ok: false, error: options };
  }

  return {
    ok: true,
    data: {
      projectId: raw.projectId,
      documentId: raw.documentId,
      outputPath: raw.outputPath,
      options,
    },
  };
}

function parseProsemirrorProjectExportPayload(
  payload: unknown,
):
  | { ok: true; data: ProsemirrorProjectExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const raw = payload as Record<string, unknown>;
  if (typeof raw.projectId !== "string" || raw.projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }
  if (typeof raw.outputPath !== "string" || raw.outputPath.trim().length === 0) {
    return { ok: false, error: invalidPayload("outputPath is required") };
  }
  const options = parseExportOptions(raw.options);
  if ("code" in options) {
    return { ok: false, error: options };
  }
  if (
    raw.documentIds !== undefined &&
    (!Array.isArray(raw.documentIds) ||
      raw.documentIds.some((documentId) => typeof documentId !== "string"))
  ) {
    return { ok: false, error: invalidPayload("documentIds must be an array of strings") };
  }
  if (
    raw.mergeIntoOne !== undefined &&
    typeof raw.mergeIntoOne !== "boolean"
  ) {
    return { ok: false, error: invalidPayload("mergeIntoOne must be a boolean") };
  }

  return {
    ok: true,
    data: {
      projectId: raw.projectId,
      outputPath: raw.outputPath,
      options,
      documentIds: raw.documentIds as string[] | undefined,
      mergeIntoOne:
        typeof raw.mergeIntoOne === "boolean" ? raw.mergeIntoOne : undefined,
    },
  };
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
    ): Promise<IpcResponse<ProsemirrorExportResponse>> => {
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

      const parsed = parseProsemirrorDocumentExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      try {
        const sender =
          typeof event === "object" &&
          event !== null &&
          "sender" in event &&
          typeof (event as { sender?: { send?: unknown } }).sender?.send ===
            "function"
            ? (event as { sender: { send: (channel: string, payload: unknown) => void } }).sender
            : null;
        const svc = createExportService({
          db: deps.db,
          logger: deps.logger,
          userDataDir: deps.userDataDir,
        });
        const result = await svc.exportDocumentProsemirror({
          ...parsed.data,
          onProgress: (progressEvent: ExportProgressEvent) => {
            sender?.send(EXPORT_PROGRESS_CHANNEL, progressEvent);
          },
        });
        return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:document:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "EXPORT_WRITE_ERROR", message: "Failed to export document" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "export:project:prosemirror",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<ProsemirrorExportResponse>> => {
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

      const parsed = parseProsemirrorProjectExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      try {
        const sender =
          typeof event === "object" &&
          event !== null &&
          "sender" in event &&
          typeof (event as { sender?: { send?: unknown } }).sender?.send ===
            "function"
            ? (event as { sender: { send: (channel: string, payload: unknown) => void } }).sender
            : null;
        const svc = createExportService({
          db: deps.db,
          logger: deps.logger,
          userDataDir: deps.userDataDir,
        });
        const result = await svc.exportProjectProsemirror({
          ...parsed.data,
          onProgress: (progressEvent: ExportProgressEvent) => {
            sender?.send(EXPORT_PROGRESS_CHANNEL, progressEvent);
          },
        });
        return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:project:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "EXPORT_WRITE_ERROR", message: "Failed to export project" },
        };
      }
    },
  );
}
