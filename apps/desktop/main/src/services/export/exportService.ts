import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";

import type Database from "better-sqlite3";
import PDFDocument from "pdfkit";

import type { Logger } from "../../logging/logger";
import { atomicWrite } from "../documents/atomicWrite";
import { createDocumentService } from "../documents/documentService";
import { ipcError, type ServiceResult } from "../shared/ipcResult";
import {
  buildDocxBuffer,
  buildPdfRenderPlan,
  parseStructuredExportDocument,
  renderPdfPlan,
  renderStructuredMarkdownExport,
} from "./exportRichText";
import {
  createProseMirrorExporter,
  type ExportOptions,
  type ExportProgressEvent,
  type ExportSourceDocument,
} from "./prosemirrorExporter";
export type { ServiceResult };

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
  exportDocumentProsemirror: (args: {
    projectId: string;
    documentId: string;
    outputPath: string;
    options: ExportOptions;
    onProgress?: (event: ExportProgressEvent) => void;
  }) => Promise<
    ServiceResult<{
      exportId: string;
      documentCount: number;
      outputPath: string;
      format: string;
      totalWordCount: number;
      durationMs: number;
    }>
  >;
  exportProjectProsemirror: (args: {
    projectId: string;
    outputPath: string;
    options: ExportOptions;
    documentIds?: string[];
    mergeIntoOne?: boolean;
    onProgress?: (event: ExportProgressEvent) => void;
  }) => Promise<
    ServiceResult<{
      exportId: string;
      documentCount: number;
      outputPath: string;
      format: string;
      totalWordCount: number;
      durationMs: number;
    }>
  >;
};

const MAX_EXPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function assertSizeWithinLimit(args: { bytes: number; format: string }): void {
  if (args.bytes > MAX_EXPORT_FILE_SIZE_BYTES) {
    throw new Error(
      `${args.format} export exceeds size limit (${MAX_EXPORT_FILE_SIZE_BYTES} bytes)`,
    );
  }
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

function composeTxtExport(args: { title: string; body: string }): string {
  const trimmedBody = args.body.trim();
  if (trimmedBody.length === 0) {
    return `${args.title}\n`;
  }
  return `${args.title}\n\n${trimmedBody}`;
}

function writeUtf8Chunk(
  stream: NodeJS.WritableStream,
  chunk: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      stream.off("error", onError);
      fn();
    };
    const onError = (error: unknown) => {
      settle(() => reject(error));
    };
    stream.once("error", onError);

    const drained = stream.write(chunk, "utf8", () => {
      settle(resolve);
    });
    if (!drained) {
      stream.once("drain", () => {
        settle(resolve);
      });
    }
  });
}

function endStream(stream: NodeJS.WritableStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: unknown) => {
      stream.off("error", onError);
      reject(error);
    };
    stream.once("error", onError);
    stream.end(() => {
      stream.off("error", onError);
      resolve();
    });
  });
}

type ExportDeps = {
  db: Database.Database;
  logger: Logger;
  userDataDir: string;
};

type ResolveDocFn = (args: {
  projectId: string;
  documentId?: string;
}) => Promise<ServiceResult<{ documentId: string }>>;

function resolveDocumentId(deps: ExportDeps): ResolveDocFn {
  return async (args) => {
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
  };
}

function createTextExportOps(
  deps: ExportDeps,
  resolve: ResolveDocFn,
): Pick<ExportService, "exportMarkdown" | "exportTxt"> {
  async function exportMarkdown(args: {
    projectId: string;
    documentId?: string;
  }): Promise<ServiceResult<ExportResult>> {
    const projectId = args.projectId.trim();
    if (projectId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }

    const docIdRes = await resolve({
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

      const structured = parseStructuredExportDocument({
        contentJson: doc.data.contentJson,
      });
      if (!structured.ok) {
        return ipcError("INVALID_ARGUMENT", structured.message);
      }

      const markdown = renderStructuredMarkdownExport({
        title: doc.data.title,
        document: structured.data,
      });
      const markdownBytes = Buffer.byteLength(markdown, "utf8");
      assertSizeWithinLimit({ bytes: markdownBytes, format: "markdown" });
      await atomicWrite({
        targetPath: absPath,
        writeTemp: async (tempPath) => {
          await fs.writeFile(tempPath, markdown, "utf8");
        },
      });

      const bytesWritten = markdownBytes;
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

    const docIdRes = await resolve({
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

      const text = composeTxtExport({
        title: doc.data.title,
        body: doc.data.contentText,
      });
      const textBytes = Buffer.byteLength(text, "utf8");
      assertSizeWithinLimit({ bytes: textBytes, format: "txt" });
      await atomicWrite({
        targetPath: absPath,
        writeTemp: async (tempPath) => {
          await fs.writeFile(tempPath, text, "utf8");
        },
      });

      const bytesWritten = textBytes;
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

  return { exportMarkdown, exportTxt };
}

function createBinaryExportOps(
  deps: ExportDeps,
  resolve: ResolveDocFn,
): Pick<ExportService, "exportPdf" | "exportDocx"> {
  async function exportPdf(args: {
    projectId: string;
    documentId?: string;
  }): Promise<ServiceResult<ExportResult>> {
    const projectId = args.projectId.trim();
    if (projectId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }

    const docIdRes = await resolve({
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

      const structured = parseStructuredExportDocument({
        contentJson: doc.data.contentJson,
      });
      if (!structured.ok) {
        return ipcError("INVALID_ARGUMENT", structured.message);
      }

      const plan = buildPdfRenderPlan({
        title: doc.data.title,
        document: structured.data,
      });
      const estimatedPdfSourceBytes = Buffer.byteLength(
        doc.data.contentJson,
        "utf8",
      );
      assertSizeWithinLimit({ bytes: estimatedPdfSourceBytes, format: "pdf" });

      let bytesWritten = 0;
      await atomicWrite({
        targetPath: absPath,
        writeTemp: async (tempPath) => {
          bytesWritten = await new Promise<number>((resolve2, reject) => {
            const pdfDoc = new PDFDocument({
              size: "A4",
              margins: { top: 72, bottom: 72, left: 72, right: 72 },
            });

            const stream = createWriteStream(tempPath);
            let size = 0;

            stream.on("error", reject);
            stream.on("finish", () => resolve2(size));

            pdfDoc.on("data", (chunk: Buffer) => {
              size += chunk.length;
            });
            pdfDoc.on("error", reject);

            pdfDoc.pipe(stream);

            void renderPdfPlan({
              pdfDoc,
              plan,
            }).then(
              () => pdfDoc.end(),
              (error) => {
                stream.destroy(error as Error);
                reject(error);
              },
            );
          });
        },
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

    const docIdRes = await resolve({
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

      const structured = parseStructuredExportDocument({
        contentJson: docData.data.contentJson,
      });
      if (!structured.ok) {
        return ipcError("INVALID_ARGUMENT", structured.message);
      }

      const buffer = await buildDocxBuffer({
        title: docData.data.title,
        document: structured.data,
      });
      assertSizeWithinLimit({ bytes: buffer.length, format: "docx" });
      await atomicWrite({
        targetPath: absPath,
        writeTemp: async (tempPath) => {
          await fs.writeFile(tempPath, buffer);
        },
      });

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

  return { exportPdf, exportDocx };
}

/**
 * Create an export service that writes files under the app's userData directory.
 */
export function createExportService(deps: ExportDeps): ExportService {
  const resolve = resolveDocumentId(deps);

  function createExporter(args?: {
    onProgress?: (event: ExportProgressEvent) => void;
  }) {
    const docSvc = createDocumentService({ db: deps.db, logger: deps.logger });
    return createProseMirrorExporter({
      eventBus: {
        emit(event) {
          if (event.type !== "export-progress") {
            return;
          }
          args?.onProgress?.(event as unknown as ExportProgressEvent);
        },
        on: () => {},
        off: () => {},
      },
      fs: {
        writeFile: async (targetPath, data) => {
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, data);
        },
        mkdir: async (targetPath, opts) => {
          await fs.mkdir(targetPath, opts);
        },
      },
      documentSource: {
        async getDocument({ projectId, documentId }) {
          if (!projectId || projectId.trim().length === 0) {
            return null;
          }
          const read = docSvc.read({ projectId, documentId });
          if (!read.ok) {
            return null;
          }
            return {
              id: read.data.documentId,
              projectId: read.data.projectId,
              title: read.data.title,
              sortOrder: read.data.sortOrder,
              content: JSON.parse(read.data.contentJson) as ExportSourceDocument["content"],
            };
        },
        async listDocuments({ projectId, documentIds }) {
          const listed = docSvc.list({ projectId });
          if (!listed.ok) {
            return [];
          }
          const items = listed.data.items
            .filter((item) =>
              documentIds === undefined ? true : documentIds.includes(item.documentId),
            )
            .sort((left, right) => left.sortOrder - right.sortOrder);
          return items
            .map((item) => {
              const read = docSvc.read({ projectId, documentId: item.documentId });
              if (!read.ok) {
                return null;
              }
              return {
                id: read.data.documentId,
                projectId: read.data.projectId,
                title: read.data.title,
                sortOrder: read.data.sortOrder,
                content: JSON.parse(read.data.contentJson) as ExportSourceDocument["content"],
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
        },
      },
      allowedRoots: [deps.userDataDir, os.homedir()],
    });
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

      let bytesWritten = 0;
      let sourceReadFailure: ServiceResult<ExportResult> | null = null;
      try {
        await atomicWrite({
          targetPath: absPath,
          writeTemp: async (tempPath) => {
            const stream = createWriteStream(tempPath);

            try {
              for (let i = 0; i < orderedItems.length; i += 1) {
                const item = orderedItems[i];
                const read = docSvc.read({
                  projectId,
                  documentId: item.documentId,
                });
                if (!read.ok) {
                  sourceReadFailure = read;
                  throw new Error("project_export_source_read_failed");
                }

                const section =
                  i === 0
                    ? `# ${read.data.title}\n\n${read.data.contentMd}`
                    : `\n\n---\n\n# ${read.data.title}\n\n${read.data.contentMd}`;
                await writeUtf8Chunk(stream, section);
                bytesWritten += Buffer.byteLength(section, "utf8");
              }

              await writeUtf8Chunk(stream, "\n");
              bytesWritten += 1;
              await endStream(stream);
            } catch (error) {
              stream.destroy();
              throw error;
            }
          },
        });
      } catch (error) {
        if (sourceReadFailure) {
          return sourceReadFailure;
        }
        throw error;
      }

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

  async function exportDocumentProsemirror(args: {
    projectId: string;
    documentId: string;
    outputPath: string;
    options: ExportOptions;
    onProgress?: (event: ExportProgressEvent) => void;
  }): Promise<
    ServiceResult<{
      exportId: string;
      documentCount: number;
      outputPath: string;
      format: string;
      totalWordCount: number;
      durationMs: number;
    }>
  > {
    const exporter = createExporter({ onProgress: args.onProgress });
    const exportId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return exporter
      .exportDocument({
        documentId: args.documentId,
        exportId,
        projectId: args.projectId,
        options: args.options,
        outputPath: args.outputPath,
      })
      .then((result) =>
        result.success && result.data
          ? { ok: true, data: { exportId, ...result.data } }
          : ipcError(
              (result.error?.code as Parameters<typeof ipcError>[0] | undefined) ??
                "EXPORT_WRITE_ERROR",
              result.error?.message ?? "Export failed",
            ),
      );
  }

  async function exportProjectProsemirror(args: {
    projectId: string;
    outputPath: string;
    options: ExportOptions;
    documentIds?: string[];
    mergeIntoOne?: boolean;
    onProgress?: (event: ExportProgressEvent) => void;
  }): Promise<
    ServiceResult<{
      exportId: string;
      documentCount: number;
      outputPath: string;
      format: string;
      totalWordCount: number;
      durationMs: number;
    }>
  > {
    const exporter = createExporter({ onProgress: args.onProgress });
    const exportId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return exporter
      .exportProject({
        exportId,
        projectId: args.projectId,
        options: args.options,
        outputPath: args.outputPath,
        documentIds: args.documentIds,
        mergeIntoOne: args.mergeIntoOne,
      })
      .then((result) =>
        result.success && result.data
          ? { ok: true, data: { exportId, ...result.data } }
          : ipcError(
              (result.error?.code as Parameters<typeof ipcError>[0] | undefined) ??
                "EXPORT_WRITE_ERROR",
              result.error?.message ?? "Export failed",
            ),
      );
  }

  return {
    ...createTextExportOps(deps, resolve),
    ...createBinaryExportOps(deps, resolve),
    exportProjectBundle,
    exportDocumentProsemirror,
    exportProjectProsemirror,
  };
}
