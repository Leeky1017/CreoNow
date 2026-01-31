import path from "node:path";
import fs from "node:fs/promises";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { createDocumentService } from "../documents/documentService";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type ExportResult = {
  relativePath: string;
  bytesWritten: number;
};

export type ExportService = {
  exportMarkdown: (args: {
    projectId: string;
    documentId?: string;
  }) => Promise<ServiceResult<ExportResult>>;
  exportPdf: (args: { projectId: string; documentId?: string }) => ServiceResult<never>;
  exportDocx: (args: { projectId: string; documentId?: string }) => ServiceResult<never>;
};

/**
 * Build a stable IPC error object.
 *
 * Why: export errors must be deterministic and must not leak absolute paths.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function isSafePathSegment(segment: string): boolean {
  if (segment.length === 0) {
    return false;
  }
  if (segment.includes("..")) {
    return false;
  }
  return !segment.includes("/") && !segment.includes("\\");
}

/**
 * Create an export service that writes files under the app's userData directory.
 */
export function createExportService(deps: {
  db: Database.Database;
  logger: Logger;
  userDataDir: string;
}): ExportService {
  async function resolveDocumentId(args: {
    projectId: string;
    documentId?: string;
  }): Promise<ServiceResult<{ documentId: string }>> {
    const trimmed = args.documentId?.trim();
    if (typeof trimmed === "string" && trimmed.length > 0) {
      return { ok: true, data: { documentId: trimmed } };
    }

    const svc = createDocumentService({ db: deps.db, logger: deps.logger });
    const current = svc.getCurrent({ projectId: args.projectId });
    if (!current.ok) {
      if (current.error.code === "NOT_FOUND") {
        return ipcError("INVALID_ARGUMENT", "No current document to export");
      }
      return current;
    }
    return { ok: true, data: { documentId: current.data.documentId } };
  }

  async function exportMarkdown(args: {
    projectId: string;
    documentId?: string;
  }): Promise<ServiceResult<ExportResult>> {
    const projectId = args.projectId.trim();
    if (projectId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }

    const docIdRes = await resolveDocumentId({
      projectId,
      documentId: args.documentId,
    });
    if (!docIdRes.ok) {
      return docIdRes;
    }

    const documentId = docIdRes.data.documentId.trim();
    if (!isSafePathSegment(projectId) || !isSafePathSegment(documentId)) {
      return ipcError("INVALID_ARGUMENT", "Unsafe export path segments");
    }

    const relativeParts = ["exports", projectId, `${documentId}.md`];
    const relativePath = relativeParts.join("/");
    const absPath = path.join(deps.userDataDir, ...relativeParts);

    deps.logger.info("export_started", {
      format: "markdown",
      documentId,
      relativePath,
    });

    try {
      const docSvc = createDocumentService({ db: deps.db, logger: deps.logger });
      const doc = docSvc.read({ projectId, documentId });
      if (!doc.ok) {
        return doc;
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, doc.data.contentMd, "utf8");

      const bytesWritten = Buffer.byteLength(doc.data.contentMd, "utf8");
      deps.logger.info("export_succeeded", {
        format: "markdown",
        documentId,
        relativePath,
        bytesWritten,
      });

      return { ok: true, data: { relativePath, bytesWritten } };
    } catch (error) {
      deps.logger.error("export_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
        format: "markdown",
        documentId,
      });
      return ipcError("IO_ERROR", "Failed to write export file");
    }
  }

  return {
    exportMarkdown,
    exportPdf: () =>
      ipcError("UNSUPPORTED", "PDF export is not implemented in V1"),
    exportDocx: () =>
      ipcError("UNSUPPORTED", "DOCX export is not implemented in V1"),
  };
}

