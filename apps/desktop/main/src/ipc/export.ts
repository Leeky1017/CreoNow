import fs from "node:fs/promises";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createDocumentService } from "../services/documents/documentService";
import { createExportService } from "../services/export/exportService";
import {
  createProseMirrorExporter,
  type ExportDocumentSource,
  type ExportFormat,
  type ExportOptions,
} from "../services/export/prosemirrorExporter";
import {
  type EventBusLike,
  NOOP_EVENT_BUS,
  isRecord,
} from "./helpers";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import {
  getProjectSessionBindingRegistry,
  type ProjectSessionBindingRegistry,
} from "./projectSessionBinding";

type ExportPayloadError = IpcError;

type LegacyDocumentExportPayload = {
  projectId: string;
  documentId?: string;
};

type ExportProgressPayload = {
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
};

type ProseMirrorExportOptionsPayload = {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  pageSize?: "a4" | "letter";
  fontSize?: number;
};

type ProseMirrorDocumentExportPayload = {
  projectId: string;
  documentId: string;
  outputPath: string;
  options: ProseMirrorExportOptionsPayload;
};

type ProseMirrorProjectExportPayload = {
  projectId: string;
  outputPath: string;
  options: ProseMirrorExportOptionsPayload;
  documentIds?: string[];
  mergeIntoOne?: boolean;
};

type ProseMirrorExportResponse = {
  documentCount: number;
  outputPath: string;
  format: string;
  totalWordCount: number;
  durationMs: number;
};

type ProseMirrorDocumentJson = {
  type: string;
  text?: string;
  content?: ProseMirrorDocumentJson[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

type ExportProgressSender = {
  id: number;
  send: (channel: string, payload: unknown) => void;
};

const exporterFs = {
  writeFile: (targetPath: string, data: string | Buffer) =>
    fs.writeFile(targetPath, data),
  mkdir: async (targetPath: string, opts?: { recursive?: boolean }) => {
    await fs.mkdir(targetPath, opts);
  },
};

function invalidPayload(message: string): ExportPayloadError {
  return { code: "INVALID_ARGUMENT", message };
}

function toUnexpectedExportError(error: unknown): ExportPayloadError {
  return {
    code: "INTERNAL_ERROR",
    message:
      error instanceof Error ? error.message : "Unexpected export IPC error",
  };
}

function parseLegacyDocumentExportPayload(
  payload: unknown,
):
  | { ok: true; data: LegacyDocumentExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!isRecord(payload)) {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const projectId = payload.projectId;
  if (typeof projectId !== "string") {
    return { ok: false, error: invalidPayload("projectId must be a string") };
  }

  const documentId = payload.documentId;
  if (documentId !== undefined && typeof documentId !== "string") {
    return { ok: false, error: invalidPayload("documentId must be a string") };
  }

  return { ok: true, data: { projectId, documentId } };
}

function parseExportOptions(
  payload: unknown,
):
  | { ok: true; data: ExportOptions }
  | { ok: false; error: ExportPayloadError } {
  if (!isRecord(payload)) {
    return { ok: false, error: invalidPayload("options must be an object") };
  }

  const format = payload.format;
  if (
    format !== "markdown" &&
    format !== "docx" &&
    format !== "pdf" &&
    format !== "txt"
  ) {
    return { ok: false, error: invalidPayload("options.format is invalid") };
  }

  const pageSize = payload.pageSize;
  if (pageSize !== undefined && pageSize !== "a4" && pageSize !== "letter") {
    return { ok: false, error: invalidPayload("options.pageSize is invalid") };
  }

  const fontSize = payload.fontSize;
  if (fontSize !== undefined && typeof fontSize !== "number") {
    return { ok: false, error: invalidPayload("options.fontSize must be a number") };
  }

  return {
    ok: true,
    data: {
      format,
      includeMetadata:
        typeof payload.includeMetadata === "boolean"
          ? payload.includeMetadata
          : undefined,
      includeTableOfContents:
        typeof payload.includeTableOfContents === "boolean"
          ? payload.includeTableOfContents
          : undefined,
      pageSize,
      fontSize,
    },
  };
}

function parseProseMirrorDocumentExportPayload(
  payload: unknown,
):
  | { ok: true; data: ProseMirrorDocumentExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!isRecord(payload)) {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  if (typeof payload.projectId !== "string" || payload.projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }
  if (typeof payload.documentId !== "string" || payload.documentId.trim().length === 0) {
    return { ok: false, error: invalidPayload("documentId is required") };
  }
  if (typeof payload.outputPath !== "string" || payload.outputPath.trim().length === 0) {
    return { ok: false, error: invalidPayload("outputPath is required") };
  }

  const options = parseExportOptions(payload.options);
  if (!options.ok) {
    return options;
  }

  return {
    ok: true,
    data: {
      projectId: payload.projectId,
      documentId: payload.documentId,
      outputPath: payload.outputPath,
      options: options.data,
    },
  };
}

function parseProseMirrorProjectExportPayload(
  payload: unknown,
):
  | { ok: true; data: ProseMirrorProjectExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!isRecord(payload)) {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  if (typeof payload.projectId !== "string" || payload.projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }
  if (typeof payload.outputPath !== "string" || payload.outputPath.trim().length === 0) {
    return { ok: false, error: invalidPayload("outputPath is required") };
  }
  if (
    payload.documentIds !== undefined &&
    (!Array.isArray(payload.documentIds) ||
      payload.documentIds.some((documentId) => typeof documentId !== "string"))
  ) {
    return { ok: false, error: invalidPayload("documentIds must be an array of strings") };
  }
  if (
    payload.mergeIntoOne !== undefined &&
    typeof payload.mergeIntoOne !== "boolean"
  ) {
    return { ok: false, error: invalidPayload("mergeIntoOne must be a boolean") };
  }

  const options = parseExportOptions(payload.options);
  if (!options.ok) {
    return options;
  }

  return {
    ok: true,
    data: {
      projectId: payload.projectId,
      outputPath: payload.outputPath,
      options: options.data,
      documentIds: payload.documentIds,
      mergeIntoOne: payload.mergeIntoOne,
    },
  };
}

function resolveLegacyExportResponse(
  result:
    | { ok: true; data: { relativePath: string; bytesWritten: number } }
    | { ok: false; error: ExportPayloadError },
): IpcResponse<{ relativePath: string; bytesWritten: number }> {
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}

function tryGetSender(event: unknown): ExportProgressSender | null {
  if (!isRecord(event) || !isRecord(event.sender)) {
    return null;
  }

  const sender = event.sender as {
    id?: unknown;
    send?: (channel: string, payload: unknown) => void;
  };
  if (typeof sender.id !== "number" || typeof sender.send !== "function") {
    return null;
  }
  return event.sender as ExportProgressSender;
}

function createProseMirrorDocumentSource(args: {
  db: Database.Database;
  logger: Logger;
}): ExportDocumentSource {
  return {
    getDocument: ({ projectId, documentId }) => {
      const resolvedProjectId = projectId?.trim();
      if (!resolvedProjectId) {
        return null;
      }
      const documentService = createDocumentService({
        db: args.db,
        logger: args.logger,
      });
      const document = documentService.read({
        projectId: resolvedProjectId,
        documentId,
      });
      if (!document.ok) {
        return null;
      }
        return {
          id: document.data.documentId,
          projectId: document.data.projectId,
          title: document.data.title,
          sortOrder: document.data.sortOrder,
          content: JSON.parse(document.data.contentJson) as ProseMirrorDocumentJson,
        };
    },
    listDocuments: ({ projectId, documentIds }) => {
      const documentService = createDocumentService({
        db: args.db,
        logger: args.logger,
      });
      const list = documentService.list({ projectId });
      if (!list.ok) {
        return [];
      }

      const requestedIds = documentIds ? new Set(documentIds) : null;
      return list.data.items
        .filter((item) => requestedIds === null || requestedIds.has(item.documentId))
        .map((item) => {
          const document = documentService.read({
            projectId,
            documentId: item.documentId,
          });
          if (!document.ok) {
            return null;
          }
            return {
              id: document.data.documentId,
              projectId: document.data.projectId,
              title: document.data.title,
              sortOrder: document.data.sortOrder,
              content: JSON.parse(document.data.contentJson) as ProseMirrorDocumentJson,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
  };
}

function registerLegacyExportHandlers(args: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  const invokeDocumentExport = async (
    event: unknown,
    channel: string,
    payload: unknown,
    run: (
      args: LegacyDocumentExportPayload,
    ) => Promise<
      | { ok: true; data: { relativePath: string; bytesWritten: number } }
      | { ok: false; error: ExportPayloadError }
    >,
  ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
    const guarded = guardAndNormalizeProjectAccess({
      event,
      payload,
      projectSessionBinding: args.projectSessionBinding,
    });
    if (!guarded.ok) {
      return guarded.response;
    }

    const parsed = parseLegacyDocumentExportPayload(payload);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    try {
      const result = await run(parsed.data);
      return resolveLegacyExportResponse(result);
    } catch (error) {
      args.logger.error("ipc_export_unexpected_error", {
        channel,
        message: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, error: toUnexpectedExportError(error) };
    }
  };

  args.ipcMain.handle(
    "export:document:markdown",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      if (!args.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const service = createExportService({
        db: args.db,
        logger: args.logger,
        userDataDir: args.userDataDir,
      });
      return invokeDocumentExport(event, "export:document:markdown", payload, (exportArgs) =>
        service.exportMarkdown(exportArgs),
      );
    },
  );

  args.ipcMain.handle(
    "export:document:pdf",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      if (!args.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const service = createExportService({
        db: args.db,
        logger: args.logger,
        userDataDir: args.userDataDir,
      });
      return invokeDocumentExport(event, "export:document:pdf", payload, (exportArgs) =>
        service.exportPdf(exportArgs),
      );
    },
  );

  args.ipcMain.handle(
    "export:document:docx",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      if (!args.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const service = createExportService({
        db: args.db,
        logger: args.logger,
        userDataDir: args.userDataDir,
      });
      return invokeDocumentExport(event, "export:document:docx", payload, (exportArgs) =>
        service.exportDocx(exportArgs),
      );
    },
  );

  args.ipcMain.handle(
    "export:document:txt",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<{ relativePath: string; bytesWritten: number }>> => {
      if (!args.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const service = createExportService({
        db: args.db,
        logger: args.logger,
        userDataDir: args.userDataDir,
      });
      return invokeDocumentExport(event, "export:document:txt", payload, (exportArgs) =>
        service.exportTxt(exportArgs),
      );
    },
  );
}

/**
 * Register `export:*` IPC handlers.
 *
 * Why: classic exports remain file-based while ProseMirror exports now execute
 * the structured export contract and push progress updates to the renderer.
 */
export function registerExportIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  eventBus?: EventBusLike;
}): void {
  const projectSessionBinding =
    deps.projectSessionBinding ??
    getProjectSessionBindingRegistry() ??
    undefined;
  const eventBus = deps.eventBus ?? NOOP_EVENT_BUS;

  registerLegacyExportHandlers({
    ipcMain: deps.ipcMain,
    db: deps.db,
    logger: deps.logger,
    userDataDir: deps.userDataDir,
    projectSessionBinding,
  });

  deps.ipcMain.handle(
    "export:document:prosemirror",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<ProseMirrorExportResponse>> => {
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

      const parsed = parseProseMirrorDocumentExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const sender = tryGetSender(event);
      const forwardProgress = (progressEvent: Record<string, unknown>): void => {
        sender?.send("export:progress:update", progressEvent);
      };
      eventBus.on("export-progress", forwardProgress);

      try {
        const exporter = createProseMirrorExporter({
          eventBus,
          fs: exporterFs,
          documentSource: createProseMirrorDocumentSource({
            db: deps.db,
            logger: deps.logger,
          }),
        });
        const result = await exporter.exportDocument(parsed.data);
        exporter.dispose();
        return result.success
          ? { ok: true, data: result.data }
          : { ok: false, error: result.error as IpcError };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:document:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: toUnexpectedExportError(error) };
      } finally {
        eventBus.off("export-progress", forwardProgress);
      }
    },
  );

  deps.ipcMain.handle(
    "export:project:prosemirror",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<ProseMirrorExportResponse>> => {
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

      const parsed = parseProseMirrorProjectExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const sender = tryGetSender(event);
      const forwardProgress = (progressEvent: Record<string, unknown>): void => {
        sender?.send("export:progress:update", progressEvent);
      };
      eventBus.on("export-progress", forwardProgress);

      try {
        const exporter = createProseMirrorExporter({
          eventBus,
          fs: exporterFs,
          documentSource: createProseMirrorDocumentSource({
            db: deps.db,
            logger: deps.logger,
          }),
        });
        const result = await exporter.exportProject(parsed.data);
        exporter.dispose();
        return result.success
          ? { ok: true, data: result.data }
          : { ok: false, error: result.error as IpcError };
      } catch (error) {
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:project:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: toUnexpectedExportError(error) };
      } finally {
        eventBus.off("export-progress", forwardProgress);
      }
    },
  );
}

export type { ExportProgressPayload };
