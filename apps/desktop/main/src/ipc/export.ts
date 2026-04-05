import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportCompletedEvent,
  type ExportFailedEvent,
  type ExportLifecycleEvent,
  type ExportProgressEvent,
  type ExportStartedEvent,
} from "@shared/types/export";
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

type ExportProgressPayload = ExportLifecycleEvent;

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

function createExportLifecycleId(): string {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `export-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Create an isolated per-invocation event bus.
 *
 * Each export handler invocation gets its own bus so that concurrent exports
 * cannot cross-contaminate each other's progress streams.  The shared
 * `deps.eventBus` is intentionally NOT used for progress forwarding; only this
 * local bus is passed to the exporter instance.
 */
function createLocalEventBus(): EventBusLike {
  const listeners = new Map<string, Set<(payload: Record<string, unknown>) => void>>();
  return {
    emit: (payload) => {
      const eventName = typeof payload.type === "string" ? payload.type : "";
      if (!eventName) return;
      for (const listener of listeners.get(eventName) ?? []) {
        listener(payload);
      }
    },
    on: (eventName, handler) => {
      const bucket = listeners.get(eventName) ?? new Set();
      bucket.add(handler);
      listeners.set(eventName, bucket);
    },
    off: (eventName, handler) => {
      const bucket = listeners.get(eventName);
      if (!bucket) return;
      bucket.delete(handler);
      if (bucket.size === 0) {
        listeners.delete(eventName);
      }
    },
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

function normalizeExportProgressPayload(
  payload: Record<string, unknown>,
  exportId: string,
): ExportProgressEvent | null {
  if (
    payload.type !== "export-progress" ||
    (payload.stage !== "parsing" &&
      payload.stage !== "converting" &&
      payload.stage !== "writing") ||
    typeof payload.progress !== "number" ||
    typeof payload.currentDocument !== "string"
  ) {
    return null;
  }

  return {
    type: "export-progress",
    exportId,
    stage: payload.stage,
    progress: payload.progress,
    currentDocument: payload.currentDocument,
  };
}

function sendExportLifecyclePayload(
  sender: ExportProgressSender | null,
  payload: ExportProgressPayload,
): void {
  sender?.send(EXPORT_PROGRESS_CHANNEL, payload);
}

function createExportStartedPayload(args: {
  exportId: string;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
}): ExportStartedEvent {
  return {
    type: "export-started",
    exportId: args.exportId,
    projectId: args.projectId,
    format: args.format,
    currentDocument: args.currentDocument,
    timestamp: Date.now(),
  };
}

function createExportCompletedPayload(args: {
  exportId: string;
  projectId: string;
  format: ExportFormat;
  documentCount: number;
}): ExportCompletedEvent {
  return {
    type: "export-completed",
    exportId: args.exportId,
    success: true,
    projectId: args.projectId,
    format: args.format,
    documentCount: args.documentCount,
    timestamp: Date.now(),
  };
}

function createExportFailedPayload(args: {
  exportId: string;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
  error: {
    code: string;
    message: string;
  };
}): ExportFailedEvent {
  return {
    type: "export-failed",
    exportId: args.exportId,
    success: false,
    projectId: args.projectId,
    format: args.format,
    currentDocument: args.currentDocument,
    error: {
      code: args.error.code,
      message: args.error.message,
    },
    timestamp: Date.now(),
  };
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

      const exportId = createExportLifecycleId();
      const sender = tryGetSender(event);
      let currentDocument = parsed.data.documentId;
      const localBus = createLocalEventBus();
      const forwardProgress = (progressEvent: Record<string, unknown>): void => {
        const normalized = normalizeExportProgressPayload(progressEvent, exportId);
        if (!normalized) {
          return;
        }
        currentDocument = normalized.currentDocument;
        sendExportLifecyclePayload(sender, normalized);
      };
      localBus.on("export-progress", forwardProgress);
      sendExportLifecyclePayload(
        sender,
        createExportStartedPayload({
          exportId,
          projectId: parsed.data.projectId,
          format: parsed.data.options.format,
          currentDocument,
        }),
      );

      try {
        const exporter = createProseMirrorExporter({
          eventBus: localBus,
          fs: exporterFs,
          documentSource: createProseMirrorDocumentSource({
            db: deps.db,
            logger: deps.logger,
          }),
        });
        const result = await exporter.exportDocument(parsed.data);
        exporter.dispose();
        if (result.success) {
          sendExportLifecyclePayload(
            sender,
            createExportCompletedPayload({
              exportId,
              projectId: parsed.data.projectId,
              format: parsed.data.options.format,
              documentCount: result.data.documentCount,
            }),
          );
          return { ok: true, data: result.data };
        }

        sendExportLifecyclePayload(
          sender,
          createExportFailedPayload({
            exportId,
            projectId: parsed.data.projectId,
            format: parsed.data.options.format,
            currentDocument,
            error: result.error,
          }),
        );
        return { ok: false, error: result.error as IpcError };
      } catch (error) {
        const exportError = toUnexpectedExportError(error);
        sendExportLifecyclePayload(
          sender,
          createExportFailedPayload({
            exportId,
            projectId: parsed.data.projectId,
            format: parsed.data.options.format,
            currentDocument,
            error: exportError,
          }),
        );
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:document:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: exportError };
      } finally {
        localBus.off("export-progress", forwardProgress);
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

      const exportId = createExportLifecycleId();
      const sender = tryGetSender(event);
      let currentDocument = parsed.data.documentIds?.[0] ?? "";
      const localBus = createLocalEventBus();
      const forwardProgress = (progressEvent: Record<string, unknown>): void => {
        const normalized = normalizeExportProgressPayload(progressEvent, exportId);
        if (!normalized) {
          return;
        }
        currentDocument = normalized.currentDocument;
        sendExportLifecyclePayload(sender, normalized);
      };
      localBus.on("export-progress", forwardProgress);
      sendExportLifecyclePayload(
        sender,
        createExportStartedPayload({
          exportId,
          projectId: parsed.data.projectId,
          format: parsed.data.options.format,
          currentDocument,
        }),
      );

      try {
        const exporter = createProseMirrorExporter({
          eventBus: localBus,
          fs: exporterFs,
          documentSource: createProseMirrorDocumentSource({
            db: deps.db,
            logger: deps.logger,
          }),
        });
        const result = await exporter.exportProject(parsed.data);
        exporter.dispose();
        if (result.success) {
          sendExportLifecyclePayload(
            sender,
            createExportCompletedPayload({
              exportId,
              projectId: parsed.data.projectId,
              format: parsed.data.options.format,
              documentCount: result.data.documentCount,
            }),
          );
          return { ok: true, data: result.data };
        }

        sendExportLifecyclePayload(
          sender,
          createExportFailedPayload({
            exportId,
            projectId: parsed.data.projectId,
            format: parsed.data.options.format,
            currentDocument,
            error: result.error,
          }),
        );
        return { ok: false, error: result.error as IpcError };
      } catch (error) {
        const exportError = toUnexpectedExportError(error);
        sendExportLifecyclePayload(
          sender,
          createExportFailedPayload({
            exportId,
            projectId: parsed.data.projectId,
            format: parsed.data.options.format,
            currentDocument,
            error: exportError,
          }),
        );
        deps.logger.error("ipc_export_prosemirror_error", {
          channel: "export:project:prosemirror",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: exportError };
      } finally {
        localBus.off("export-progress", forwardProgress);
      }
    },
  );
}

export type { ExportProgressPayload };
