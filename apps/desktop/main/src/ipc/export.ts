import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import { EXPORT_PROGRESS_CHANNEL } from "@shared/types/export";
import type { Logger } from "../logging/logger";
import { createDocumentService } from "../services/documents/documentService";
import {
  createProseMirrorExporter,
  type ExportDocumentSource,
  type ExportFormat,
  type ExportSourceDocument,
} from "../services/export/prosemirrorExporter";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import {
  getProjectSessionBindingRegistry,
  type ProjectSessionBindingRegistry,
} from "./projectSessionBinding";
import type { EventBusLike } from "./helpers";

type ExportPayloadError = IpcError;

type DocumentExportPayload = {
  projectId: string;
  documentId?: string;
  format: ExportFormat;
};

type ProjectExportPayload = {
  projectId: string;
  format: ExportFormat;
};

type ExportSuccessPayload = {
  relativePath: string;
  bytesWritten: number;
};

function invalidPayload(message: string): ExportPayloadError {
  return { code: "INVALID_ARGUMENT", message };
}

function isSafePathSegment(segment: string): boolean {
  return (
    segment.length > 0 && !segment.includes("..") && !segment.includes("/") && !segment.includes("\\")
  );
}

function normalizeFormat(value: unknown): ExportFormat | null {
  return value === "markdown" || value === "pdf" || value === "docx" || value === "txt"
    ? value
    : null;
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
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }

  const format = normalizeFormat((payload as { format?: unknown }).format);
  if (!format) {
    return { ok: false, error: invalidPayload("format must be one of: markdown, pdf, docx, txt") };
  }

  const documentId = (payload as { documentId?: unknown }).documentId;
  if (documentId !== undefined && typeof documentId !== "string") {
    return { ok: false, error: invalidPayload("documentId must be a string") };
  }

  return {
    ok: true,
    data: {
      projectId,
      ...(typeof documentId === "string" ? { documentId } : {}),
      format,
    },
  };
}

function parseProjectExportPayload(
  payload: unknown,
):
  | { ok: true; data: ProjectExportPayload }
  | { ok: false; error: ExportPayloadError } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: invalidPayload("payload must be an object") };
  }

  const projectId = (payload as { projectId?: unknown }).projectId;
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return { ok: false, error: invalidPayload("projectId is required") };
  }

  const format = normalizeFormat((payload as { format?: unknown }).format);
  if (!format) {
    return { ok: false, error: invalidPayload("format must be one of: markdown, pdf, docx, txt") };
  }

  return { ok: true, data: { projectId, format } };
}

function toUnexpectedExportError(error: unknown): ExportPayloadError {
  return {
    code: "INTERNAL_ERROR",
    message:
      error instanceof Error ? error.message : "Unexpected export IPC error",
  };
}

function extensionForFormat(format: ExportFormat): string {
  return format === "markdown" ? "md" : format;
}

function buildDocumentSource(args: {
  db: Database.Database;
  logger: Logger;
}): ExportDocumentSource {
  const documentService = createDocumentService({
    db: args.db,
    logger: args.logger,
  });

  function parseContentJson(
    contentJson: string,
  ): ExportSourceDocument["content"] {
    return JSON.parse(contentJson) as ExportSourceDocument["content"];
  }

  return {
    getDocument: async ({ projectId, documentId }) => {
      const result = documentService.read({
        projectId: projectId ?? "",
        documentId,
      });
      if (!result.ok) {
        return null;
      }
      return {
        id: result.data.documentId,
        projectId: result.data.projectId,
        title: result.data.title,
        sortOrder: result.data.sortOrder,
        content: parseContentJson(result.data.contentJson),
      };
    },
    listDocuments: async ({ projectId, documentIds }) => {
      const listResult = documentService.list({ projectId });
      if (!listResult.ok) {
        return [];
      }

      const ids = documentIds ? new Set(documentIds) : null;
      const items = ids
        ? listResult.data.items.filter((item) => ids.has(item.documentId))
        : listResult.data.items;

      const docs = await Promise.all(
        items.map(async (item) => {
          const readResult = documentService.read({
            projectId,
            documentId: item.documentId,
          });
          if (!readResult.ok) {
            throw new Error(readResult.error.message);
          }
          return {
            id: readResult.data.documentId,
            projectId: readResult.data.projectId,
            title: readResult.data.title,
            sortOrder: readResult.data.sortOrder,
            content: parseContentJson(readResult.data.contentJson),
          };
        }),
      );

      return docs.sort((left, right) => left.sortOrder - right.sortOrder);
    },
  };
}

async function resolveDocumentId(args: {
  db: Database.Database;
  logger: Logger;
  projectId: string;
  documentId?: string;
}): Promise<
  | { ok: true; data: string }
  | { ok: false; error: ExportPayloadError }
> {
  const trimmedDocumentId = args.documentId?.trim();
  if (trimmedDocumentId) {
    return { ok: true, data: trimmedDocumentId };
  }

  const documentService = createDocumentService({
    db: args.db,
    logger: args.logger,
  });
  const current = documentService.getCurrent({ projectId: args.projectId });
  if (!current.ok) {
    return {
      ok: false,
      error: { code: "EXPORT_EMPTY_DOCUMENT", message: current.error.message },
    };
  }
  return { ok: true, data: current.data.documentId };
}

async function statBytes(targetPath: string): Promise<number> {
  const target = await fs.stat(targetPath);
  return target.size;
}

async function runWithProgressForwarding<T>(args: {
  eventBus?: EventBusLike;
  exportId: string;
  sender: { send: (channel: string, payload: unknown) => void };
  run: () => Promise<T>;
}): Promise<T> {
  const handler = (payload: Record<string, unknown>) => {
    if (payload.exportId !== args.exportId) {
      return;
    }
    args.sender.send(EXPORT_PROGRESS_CHANNEL, {
      exportId: payload.exportId,
      stage: payload.stage,
      progress: payload.progress,
      currentDocument: payload.currentDocument,
    });
  };

  args.eventBus?.on("export-progress", handler);
  try {
    return await args.run();
  } finally {
    args.eventBus?.off("export-progress", handler);
  }
}

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

  const documentSource = deps.db
    ? buildDocumentSource({ db: deps.db, logger: deps.logger })
    : null;
  const exportFs = {
    writeFile: async (targetPath: string, data: string | Buffer) => {
      await fs.writeFile(targetPath, data);
    },
    mkdir: async (targetPath: string, opts?: { recursive?: boolean }) => {
      await fs.mkdir(targetPath, opts);
    },
  };

  deps.ipcMain.handle(
    "export:document:write",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<ExportSuccessPayload>> => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      if (!deps.db || !documentSource) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const parsed = parseDocumentExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const resolvedDocumentId = await resolveDocumentId({
        db: deps.db,
        logger: deps.logger,
        projectId: parsed.data.projectId,
        documentId: parsed.data.documentId,
      });
      if (!resolvedDocumentId.ok) {
        return { ok: false, error: resolvedDocumentId.error };
      }

      const projectId = parsed.data.projectId.trim();
      const documentId = resolvedDocumentId.data.trim();
      if (!isSafePathSegment(projectId) || !isSafePathSegment(documentId)) {
        return {
          ok: false,
          error: invalidPayload("Unsafe export path segments"),
        };
      }

      const extension = extensionForFormat(parsed.data.format);
      const relativeParts = ["exports", projectId, `${documentId}.${extension}`];
      const relativePath = relativeParts.join("/");
      const absPath = path.join(deps.userDataDir, ...relativeParts);
      const exporter = createProseMirrorExporter({
        eventBus: deps.eventBus ?? { emit: () => {}, on: () => {}, off: () => {} },
        fs: exportFs,
        documentSource,
      });
      const exportId = randomUUID();

      try {
        const result = await runWithProgressForwarding({
          eventBus: deps.eventBus,
          exportId,
          sender: event.sender,
          run: async () =>
            exporter.exportDocument({
              exportId,
              projectId,
              documentId,
              outputPath: absPath,
              options: { format: parsed.data.format },
            }),
        });

        if (!result.success) {
          return { ok: false, error: result.error as IpcError };
        }

        return {
          ok: true,
          data: {
            relativePath,
            bytesWritten: await statBytes(absPath),
          },
        };
      } catch (error) {
        deps.logger.error("ipc_export_unexpected_error", {
          channel: "export:document:write",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: toUnexpectedExportError(error) };
      } finally {
        exporter.dispose();
      }
    },
  );

  deps.ipcMain.handle(
    "export:project:write",
    async (
      event,
      payload: unknown,
    ): Promise<IpcResponse<ExportSuccessPayload>> => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response;
      }

      if (!deps.db || !documentSource) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const parsed = parseProjectExportPayload(payload);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const projectId = parsed.data.projectId.trim();
      if (!isSafePathSegment(projectId)) {
        return {
          ok: false,
          error: invalidPayload("Unsafe export path segments"),
        };
      }

      const extension = extensionForFormat(parsed.data.format);
      const relativeParts = ["exports", projectId, `${projectId}.${extension}`];
      const relativePath = relativeParts.join("/");
      const absPath = path.join(deps.userDataDir, ...relativeParts);
      const exporter = createProseMirrorExporter({
        eventBus: deps.eventBus ?? { emit: () => {}, on: () => {}, off: () => {} },
        fs: exportFs,
        documentSource,
      });
      const exportId = randomUUID();

      try {
        const result = await runWithProgressForwarding({
          eventBus: deps.eventBus,
          exportId,
          sender: event.sender,
          run: async () =>
            exporter.exportProject({
              exportId,
              projectId,
              outputPath: absPath,
              mergeIntoOne: true,
              options: { format: parsed.data.format },
            }),
        });

        if (!result.success) {
          return { ok: false, error: result.error as IpcError };
        }

        return {
          ok: true,
          data: {
            relativePath,
            bytesWritten: await statBytes(absPath),
          },
        };
      } catch (error) {
        deps.logger.error("ipc_export_unexpected_error", {
          channel: "export:project:write",
          message: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, error: toUnexpectedExportError(error) };
      } finally {
        exporter.dispose();
      }
    },
  );
}
