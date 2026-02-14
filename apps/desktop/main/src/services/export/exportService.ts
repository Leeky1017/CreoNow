import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";

import type Database from "better-sqlite3";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";
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
  exportProjectBundle: (args: {
    projectId: string;
  }) => Promise<ServiceResult<ExportResult>>;
  exportTxt: (args: {
    projectId: string;
    documentId?: string;
  }) => Promise<ServiceResult<ExportResult>>;
  exportPdf: (args: {
    projectId: string;
    documentId?: string;
  }) => Promise<ServiceResult<ExportResult>>;
  exportDocx: (args: {
    projectId: string;
    documentId?: string;
  }) => Promise<ServiceResult<ExportResult>>;
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
      const docSvc = createDocumentService({
        db: deps.db,
        logger: deps.logger,
      });
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

  async function exportTxt(args: {
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

    const relativeParts = ["exports", projectId, `${documentId}.txt`];
    const relativePath = relativeParts.join("/");
    const absPath = path.join(deps.userDataDir, ...relativeParts);

    deps.logger.info("export_started", {
      format: "txt",
      documentId,
      relativePath,
    });

    try {
      const docSvc = createDocumentService({
        db: deps.db,
        logger: deps.logger,
      });
      const doc = docSvc.read({ projectId, documentId });
      if (!doc.ok) {
        return doc;
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, doc.data.contentText, "utf8");

      const bytesWritten = Buffer.byteLength(doc.data.contentText, "utf8");
      deps.logger.info("export_succeeded", {
        format: "txt",
        documentId,
        relativePath,
        bytesWritten,
      });

      return { ok: true, data: { relativePath, bytesWritten } };
    } catch (error) {
      deps.logger.error("export_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
        format: "txt",
        documentId,
      });
      return ipcError("IO_ERROR", "Failed to write export file");
    }
  }

  async function exportProjectBundle(args: {
    projectId: string;
  }): Promise<ServiceResult<ExportResult>> {
    const projectId = args.projectId.trim();
    if (projectId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }

    if (!isSafePathSegment(projectId)) {
      return ipcError("INVALID_ARGUMENT", "Unsafe export path segments");
    }

    const relativeParts = ["exports", projectId, `${projectId}-bundle.md`];
    const relativePath = relativeParts.join("/");
    const absPath = path.join(deps.userDataDir, ...relativeParts);

    deps.logger.info("export_started", {
      format: "project-bundle",
      projectId,
      relativePath,
    });

    try {
      const docSvc = createDocumentService({
        db: deps.db,
        logger: deps.logger,
      });
      const listed = docSvc.list({ projectId });
      if (!listed.ok) {
        return listed;
      }

      const orderedItems = [...listed.data.items].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      if (orderedItems.length === 0) {
        return ipcError("NOT_FOUND", "No documents found for project export");
      }

      const sections: string[] = [];
      for (const item of orderedItems) {
        const read = docSvc.read({ projectId, documentId: item.documentId });
        if (!read.ok) {
          return read;
        }
        sections.push(`# ${read.data.title}\n\n${read.data.contentMd}`);
      }

      const bundle = `${sections.join("\n\n---\n\n")}\n`;

      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, bundle, "utf8");

      const bytesWritten = Buffer.byteLength(bundle, "utf8");
      deps.logger.info("export_succeeded", {
        format: "project-bundle",
        projectId,
        relativePath,
        bytesWritten,
      });

      return { ok: true, data: { relativePath, bytesWritten } };
    } catch (error) {
      deps.logger.error("export_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
        format: "project-bundle",
        projectId,
      });
      return ipcError("IO_ERROR", "Failed to write project export file");
    }
  }

  async function exportPdf(args: {
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

    const relativeParts = ["exports", projectId, `${documentId}.pdf`];
    const relativePath = relativeParts.join("/");
    const absPath = path.join(deps.userDataDir, ...relativeParts);

    deps.logger.info("export_started", {
      format: "pdf",
      documentId,
      relativePath,
    });

    try {
      const docSvc = createDocumentService({
        db: deps.db,
        logger: deps.logger,
      });
      const doc = docSvc.read({ projectId, documentId });
      if (!doc.ok) {
        return doc;
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true });

      // Create PDF document
      const bytesWritten = await new Promise<number>((resolve, reject) => {
        const pdfDoc = new PDFDocument({
          size: "A4",
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
        });

        const stream = createWriteStream(absPath);
        let size = 0;

        stream.on("error", reject);
        stream.on("finish", () => resolve(size));

        pdfDoc.on("data", (chunk: Buffer) => {
          size += chunk.length;
        });
        pdfDoc.on("error", reject);

        pdfDoc.pipe(stream);

        // Add title
        pdfDoc
          .font("Helvetica-Bold")
          .fontSize(24)
          .text(doc.data.title, { align: "left" });
        pdfDoc.moveDown(2);

        // Add content (plain text)
        pdfDoc.font("Helvetica").fontSize(12).text(doc.data.contentText, {
          align: "left",
          lineGap: 4,
        });

        pdfDoc.end();
      });

      deps.logger.info("export_succeeded", {
        format: "pdf",
        documentId,
        relativePath,
        bytesWritten,
      });

      return { ok: true, data: { relativePath, bytesWritten } };
    } catch (error) {
      deps.logger.error("export_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
        format: "pdf",
        documentId,
      });
      return ipcError("IO_ERROR", "Failed to write PDF export file");
    }
  }

  async function exportDocx(args: {
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

    const relativeParts = ["exports", projectId, `${documentId}.docx`];
    const relativePath = relativeParts.join("/");
    const absPath = path.join(deps.userDataDir, ...relativeParts);

    deps.logger.info("export_started", {
      format: "docx",
      documentId,
      relativePath,
    });

    try {
      const docSvc = createDocumentService({
        db: deps.db,
        logger: deps.logger,
      });
      const docData = docSvc.read({ projectId, documentId });
      if (!docData.ok) {
        return docData;
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true });

      // Parse content and create DOCX paragraphs
      const paragraphs: Paragraph[] = [];

      // Add title
      paragraphs.push(
        new Paragraph({
          text: docData.data.title,
          heading: HeadingLevel.TITLE,
        }),
      );

      // Add content (split by newlines)
      const lines = docData.data.contentText.split(/\n+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          paragraphs.push(new Paragraph({ children: [] }));
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(trimmed)],
            }),
          );
        }
      }

      const docx = new Document({
        sections: [{ children: paragraphs }],
      });

      const buffer = await Packer.toBuffer(docx);
      await fs.writeFile(absPath, buffer);

      const bytesWritten = buffer.length;
      deps.logger.info("export_succeeded", {
        format: "docx",
        documentId,
        relativePath,
        bytesWritten,
      });

      return { ok: true, data: { relativePath, bytesWritten } };
    } catch (error) {
      deps.logger.error("export_failed", {
        code: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
        format: "docx",
        documentId,
      });
      return ipcError("IO_ERROR", "Failed to write DOCX export file");
    }
  }

  return {
    exportMarkdown,
    exportProjectBundle,
    exportTxt,
    exportPdf,
    exportDocx,
  };
}
