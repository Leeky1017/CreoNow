/**
 * ProseMirrorExporter — ProseMirror 导出适配
 * Spec: openspec/specs/document-management/spec.md — P3
 */

import { PassThrough } from "node:stream";

import PDFDocument from "pdfkit";

import {
  buildDocxBuffer,
  buildPdfRenderPlan,
  parseStructuredExportDocument,
  renderPdfPlan,
  renderStructuredMarkdownExport,
} from "./exportRichText";

// ─── Types ──────────────────────────────────────────────────────────

export type ExportFormat = "markdown" | "docx" | "pdf" | "txt";

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  pageSize?: "a4" | "letter";
  fontSize?: number;
}

export interface ExportDocumentRequest {
  exportId?: string;
  documentId: string;
  projectId?: string;
  options: ExportOptions;
  outputPath: string;
}

export interface ExportProjectRequest {
  exportId?: string;
  projectId: string;
  options: ExportOptions;
  outputPath: string;
  documentIds?: string[];
  mergeIntoOne?: boolean;
}

export interface ExportProgressEvent {
  type: "export-progress";
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
}

export type ExportResult =
  | { success: true; data: { documentCount: number; outputPath: string; format: string; totalWordCount: number; durationMs: number }; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string } };

interface ProseMirrorNode {
  type: string;
  text?: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface ExportSourceDocument {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  content: ProseMirrorNode;
}

export interface ExportDocumentSource {
  getDocument(args: { projectId?: string; documentId: string }): Promise<ExportSourceDocument | null> | ExportSourceDocument | null;
  listDocuments(args: { projectId: string; documentIds?: string[] }): Promise<ExportSourceDocument[]> | ExportSourceDocument[];
}

export interface ProseMirrorExporter {
  toMarkdown(doc: ProseMirrorNode): string;
  toDocx(doc: ProseMirrorNode, options?: ExportOptions): Buffer;
  toPdf(doc: ProseMirrorNode, options?: ExportOptions): Buffer;
  toTxt(doc: ProseMirrorNode): string;

  isNodeSupported(nodeType: string, format: ExportFormat): boolean;
  isMarkSupported(markType: string, format: ExportFormat): boolean;

  exportDocument(req: ExportDocumentRequest): Promise<ExportResult>;
  exportProject(req: ExportProjectRequest): Promise<ExportResult>;

  dispose(): void;
}

interface FsLike {
  writeFile(path: string, data: string | Buffer): Promise<void>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(event: string, handler: (payload: Record<string, unknown>) => void): void;
}

interface Deps {
  eventBus: EventBusLike;
  fs: FsLike;
  documentSource?: ExportDocumentSource;
  initialDocuments?: ExportSourceDocument[];
}

// ─── Constants ──────────────────────────────────────────────────────

const SUPPORTED_FORMATS: ExportFormat[] = ["markdown", "docx", "pdf", "txt"];
const SUPPORTED_NODE_TYPES = [
  "heading",
  "paragraph",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "table",
  "listItem",
  "doc",
  "text",
];
const SUPPORTED_MARK_TYPES = ["bold", "italic", "code", "underline", "link"];
const UNSUPPORTED_NODE_TYPES = ["mention"];
const TXT_UNSUPPORTED_NODES = ["image"];
const SIZE_LIMIT = 10 * 1024 * 1024;

// ─── Helpers ────────────────────────────────────────────────────────

function generateExportId(): string {
  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countWords(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) {
      count += 1;
    }
  }
  const asciiWords = text
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, "")
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  return count + asciiWords.length;
}

function nodeToMarkdown(node: ProseMirrorNode): string {
  if (UNSUPPORTED_NODE_TYPES.includes(node.type)) {
    throw new Error(`Unsupported node type: ${node.type}`);
  }

  if (node.type === "text") {
    let text = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") {
        text = `**${text}**`;
      } else if (mark.type === "italic") {
        text = `*${text}*`;
      } else if (mark.type === "code") {
        text = `\`${text}\``;
      } else if (mark.type === "underline") {
        text = `<u>${text}</u>`;
      } else if (mark.type === "link") {
        text = `[${text}](${String(mark.attrs?.href ?? "")})`;
      }
    }
    return text;
  }

  if (node.type === "doc") {
    return (node.content ?? []).map((child) => nodeToMarkdown(child)).join("\n");
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 1);
    return `${"#".repeat(level)} ${(node.content ?? []).map((child) => nodeToMarkdown(child)).join("")}`;
  }
  if (node.type === "paragraph") {
    return (node.content ?? []).map((child) => nodeToMarkdown(child)).join("");
  }
  if (node.type === "bulletList") {
    return (node.content ?? [])
      .map((item) => `- ${(item.content ?? []).map((child) => nodeToMarkdown(child)).join("")}`)
      .join("\n");
  }
  if (node.type === "orderedList") {
    return (node.content ?? [])
      .map((item, index) => `${index + 1}. ${(item.content ?? []).map((child) => nodeToMarkdown(child)).join("")}`)
      .join("\n");
  }
  if (node.type === "blockquote") {
    return (node.content ?? [])
      .map((child) => nodeToMarkdown(child))
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (node.type === "codeBlock") {
    const language = String(node.attrs?.language ?? "");
    const code = (node.content ?? []).map((child) => child.text ?? "").join("");
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
  if (node.type === "horizontalRule") {
    return "---";
  }
  if (node.type === "image") {
    return `![${String(node.attrs?.alt ?? "")}](${String(node.attrs?.src ?? "")})`;
  }
  if (node.type === "table") {
    const rows = node.content ?? [];
    const output: string[] = [];
    rows.forEach((row, index) => {
      const cells = (row.content ?? []).map((cell) =>
        (cell.content ?? []).map((child) => nodeToMarkdown(child)).join("").trim(),
      );
      output.push(`| ${cells.join(" | ")} |`);
      if (index === 0) {
        output.push(`| ${cells.map(() => "---").join(" | ")} |`);
      }
    });
    return output.join("\n");
  }

  return (node.content ?? []).map((child) => nodeToMarkdown(child)).join("");
}

function nodeToText(node: ProseMirrorNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  const parts = (node.content ?? []).map((child) => nodeToText(child));
  if (node.type === "paragraph" || node.type === "heading") {
    return `${parts.join("")}\n`;
  }
  return parts.join("");
}

function findUnsupportedNode(node: ProseMirrorNode, format?: ExportFormat): string | null {
  const unsupported = format === "txt"
    ? [...UNSUPPORTED_NODE_TYPES, ...TXT_UNSUPPORTED_NODES]
    : UNSUPPORTED_NODE_TYPES;
  if (unsupported.includes(node.type)) {
    return node.type;
  }
  for (const child of node.content ?? []) {
    const found = findUnsupportedNode(child, format);
    if (found) {
      return found;
    }
  }
  return null;
}

function isDocEmpty(node: ProseMirrorNode): boolean {
  return nodeToText(node).trim().length === 0;
}

function buildMinimalDocxBuffer(text: string): Buffer {
  const pkSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const contentBytes = Buffer.from(text, "utf-8");
  const localFileHeader = Buffer.alloc(30);
  pkSignature.copy(localFileHeader, 0);
  localFileHeader.writeUInt16LE(20, 4);
  localFileHeader.writeUInt32LE(contentBytes.length, 18);
  localFileHeader.writeUInt32LE(contentBytes.length, 22);
  const fileName = Buffer.from("[Content_Types].xml");
  localFileHeader.writeUInt16LE(fileName.length, 26);
  const centralDirHeader = Buffer.alloc(46);
  Buffer.from([0x50, 0x4b, 0x01, 0x02]).copy(centralDirHeader, 0);
  centralDirHeader.writeUInt16LE(20, 4);
  centralDirHeader.writeUInt16LE(20, 6);
  centralDirHeader.writeUInt32LE(contentBytes.length, 20);
  centralDirHeader.writeUInt32LE(contentBytes.length, 24);
  centralDirHeader.writeUInt16LE(fileName.length, 28);
  const localFileSize = localFileHeader.length + fileName.length + contentBytes.length;
  const endOfCentralDir = Buffer.alloc(22);
  Buffer.from([0x50, 0x4b, 0x05, 0x06]).copy(endOfCentralDir, 0);
  endOfCentralDir.writeUInt16LE(1, 8);
  endOfCentralDir.writeUInt16LE(1, 10);
  endOfCentralDir.writeUInt32LE(centralDirHeader.length + fileName.length, 12);
  endOfCentralDir.writeUInt32LE(localFileSize, 16);
  return Buffer.concat([localFileHeader, fileName, contentBytes, centralDirHeader, fileName, endOfCentralDir]);
}

function buildMinimalPdfBuffer(text: string, options?: ExportOptions): Buffer {
  const fontSize = options?.fontSize ?? 12;
  const lines = text.split("\n").filter((line) => line.length > 0);
  const textContent = lines
    .map((line, index) => {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      return `BT /F1 ${fontSize} Tf 72 ${750 - index * (fontSize + 4)} Td (${escaped}) Tj ET`;
    })
    .join("\n");

  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${textContent.length} >>
stream
${textContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`, "ascii");
}

async function buildStructuredPdfBuffer(args: {
  title: string;
  doc: ProseMirrorNode;
  options?: ExportOptions;
}): Promise<Buffer> {
  const structured = parseStructuredExportDocument({
    contentJson: JSON.stringify(args.doc),
  });
  if (!structured.ok) {
    throw new Error(structured.message);
  }

  const plan = buildPdfRenderPlan({
    title: args.title,
    document: structured.data,
  });

  const pdfDoc = new PDFDocument({
    size: args.options?.pageSize === "letter" ? "LETTER" : "A4",
    margin: 72,
  });
  const chunks: Buffer[] = [];
  const sink = new PassThrough();
  sink.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  pdfDoc.pipe(sink);
  await renderPdfPlan({ pdfDoc, plan });
  pdfDoc.end();

  await new Promise<void>((resolve, reject) => {
    sink.on("end", () => resolve());
    sink.on("error", reject);
    pdfDoc.on("error", reject);
  });

  return Buffer.concat(chunks);
}

function buildCompositeDoc(docs: ExportSourceDocument[]): ProseMirrorNode {
  const content: ProseMirrorNode[] = [];
  docs.forEach((doc, index) => {
    content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: doc.title }],
    });
    content.push(...(doc.content.content ?? []));
    if (index < docs.length - 1) {
      content.push({ type: "horizontalRule" });
    }
  });
  return { type: "doc", content };
}

function detectUnsupported(doc: ProseMirrorNode, format: ExportFormat): ExportResult | null {
  if (isDocEmpty(doc)) {
    return {
      success: false,
      error: { code: "EXPORT_EMPTY_DOCUMENT", message: "空文档不能导出" },
    };
  }
  const unsupportedNode = findUnsupportedNode(doc, format);
  if (unsupportedNode) {
    return {
      success: false,
      error: {
        code: "EXPORT_UNSUPPORTED_NODE",
        message: `文档包含不支持的节点类型: ${unsupportedNode}`,
      },
    };
  }
  return null;
}

function ensureWithinSizeLimit(output: string | Buffer): ExportResult | null {
  const size = typeof output === "string" ? Buffer.byteLength(output, "utf8") : output.length;
  if (size > SIZE_LIMIT) {
    return {
      success: false,
      error: { code: "EXPORT_SIZE_EXCEEDED", message: "导出体积超限" },
    };
  }
  return null;
}

// ─── Implementation ─────────────────────────────────────────────────

export function createProseMirrorExporter(deps: Deps): ProseMirrorExporter {
  const { eventBus, fs } = deps;
  let disposed = false;

  const inMemoryDocuments = new Map<string, ExportSourceDocument>();
  for (const doc of deps.initialDocuments ?? []) {
    inMemoryDocuments.set(doc.id, {
      ...doc,
      content: JSON.parse(JSON.stringify(doc.content)) as ProseMirrorNode,
    });
  }

  const fallbackSource: ExportDocumentSource = {
    getDocument: ({ documentId }) => inMemoryDocuments.get(documentId) ?? null,
    listDocuments: ({ projectId, documentIds }) =>
      [...inMemoryDocuments.values()]
        .filter((doc) => doc.projectId === projectId && (!documentIds || documentIds.includes(doc.id)))
        .sort((left, right) => left.sortOrder - right.sortOrder),
  };
  const documentSource = deps.documentSource ?? fallbackSource;

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("ProseMirrorExporter is disposed");
    }
  }

  async function loadDocument(req: ExportDocumentRequest): Promise<ExportSourceDocument | null> {
    return documentSource.getDocument({
      projectId: req.projectId,
      documentId: req.documentId,
    });
  }

  async function loadProjectDocuments(req: ExportProjectRequest): Promise<ExportSourceDocument[]> {
    return documentSource.listDocuments({
      projectId: req.projectId,
      documentIds: req.documentIds,
    });
  }

  async function buildStructuredOutput(args: {
    title: string;
    doc: ProseMirrorNode;
    options: ExportOptions;
  }): Promise<string | Buffer> {
    if (args.options.format === "markdown") {
      const structured = parseStructuredExportDocument({
        contentJson: JSON.stringify(args.doc),
      });
      if (!structured.ok) {
        throw new Error(structured.message);
      }
      return renderStructuredMarkdownExport({
        title: args.title,
        document: structured.data,
      });
    }

    if (args.options.format === "docx") {
      const structured = parseStructuredExportDocument({
        contentJson: JSON.stringify(args.doc),
      });
      if (!structured.ok) {
        throw new Error(structured.message);
      }
      return buildDocxBuffer({
        title: args.title,
        document: structured.data,
      });
    }

    if (args.options.format === "pdf") {
      return buildStructuredPdfBuffer({
        title: args.title,
        doc: args.doc,
        options: args.options,
      });
    }

    return `${args.title}\n\n${nodeToText(args.doc).trim()}`.trim();
  }

  const exporter: ProseMirrorExporter = {
    toMarkdown(doc: ProseMirrorNode): string {
      assertNotDisposed();
      return nodeToMarkdown(doc);
    },

    toDocx(doc: ProseMirrorNode, _options?: ExportOptions): Buffer {
      assertNotDisposed();
      return buildMinimalDocxBuffer(nodeToMarkdown(doc));
    },

    toPdf(doc: ProseMirrorNode, options?: ExportOptions): Buffer {
      assertNotDisposed();
      return buildMinimalPdfBuffer(nodeToText(doc), options);
    },

    toTxt(doc: ProseMirrorNode): string {
      assertNotDisposed();
      return nodeToText(doc).trim();
    },

    isNodeSupported(nodeType: string, format: ExportFormat): boolean {
      if (!SUPPORTED_NODE_TYPES.includes(nodeType)) {
        return false;
      }
      return !(format === "txt" && TXT_UNSUPPORTED_NODES.includes(nodeType));
    },

    isMarkSupported(markType: string, _format: ExportFormat): boolean {
      return SUPPORTED_MARK_TYPES.includes(markType);
    },

    async exportDocument(req: ExportDocumentRequest): Promise<ExportResult> {
      assertNotDisposed();
      const startTime = Date.now();
      const exportId = req.exportId ?? generateExportId();

      if (!SUPPORTED_FORMATS.includes(req.options.format)) {
        return {
          success: false,
          error: { code: "EXPORT_FORMAT_UNSUPPORTED", message: `不支持的格式: ${req.options.format}` },
        };
      }

      const sourceDoc = await loadDocument(req);
      if (!sourceDoc) {
        return {
          success: false,
          error: { code: "EXPORT_DOCUMENT_NOT_FOUND", message: "文档不存在" },
        };
      }

      const validation = detectUnsupported(sourceDoc.content, req.options.format);
      if (validation) {
        return validation;
      }

      eventBus.emit({ type: "export-progress", exportId, stage: "parsing", progress: 30, currentDocument: req.documentId });

      let output: string | Buffer;
      try {
        output = await buildStructuredOutput({
          title: sourceDoc.title,
          doc: sourceDoc.content,
          options: req.options,
        });
      } catch (error) {
        return {
          success: false,
          error: { code: "EXPORT_UNSUPPORTED_NODE", message: error instanceof Error ? error.message : String(error) },
        };
      }

      const tooLarge = ensureWithinSizeLimit(output);
      if (tooLarge) {
        return tooLarge;
      }

      eventBus.emit({ type: "export-progress", exportId, stage: "converting", progress: 60, currentDocument: req.documentId });

      try {
        await fs.writeFile(req.outputPath, output);
      } catch (error) {
        return {
          success: false,
          error: { code: "EXPORT_WRITE_ERROR", message: error instanceof Error ? error.message : String(error) },
        };
      }

      eventBus.emit({ type: "export-progress", exportId, stage: "writing", progress: 100, currentDocument: req.documentId });
      eventBus.emit({
        type: "export-completed",
        success: true,
        projectId: sourceDoc.projectId,
        format: req.options.format,
        documentCount: 1,
        timestamp: Date.now(),
      });

      const textContent = nodeToText(sourceDoc.content);
      return {
        success: true,
        data: {
          documentCount: 1,
          outputPath: req.outputPath,
          format: req.options.format,
          totalWordCount: countWords(textContent),
          durationMs: Date.now() - startTime,
        },
      };
    },

    async exportProject(req: ExportProjectRequest): Promise<ExportResult> {
      assertNotDisposed();
      const startTime = Date.now();
      const exportId = req.exportId ?? generateExportId();

      if (!SUPPORTED_FORMATS.includes(req.options.format)) {
        return {
          success: false,
          error: { code: "EXPORT_FORMAT_UNSUPPORTED", message: `不支持的格式: ${req.options.format}` },
        };
      }

      const docs = await loadProjectDocuments(req);
      if (docs.length === 0) {
        return {
          success: false,
          error: { code: "EXPORT_EMPTY_DOCUMENT", message: "空文档不能导出" },
        };
      }

      for (const doc of docs) {
        const validation = detectUnsupported(doc.content, req.options.format);
        if (validation) {
          return validation;
        }
      }

      eventBus.emit({ type: "export-progress", exportId, stage: "parsing", progress: 10, currentDocument: docs[0]?.id ?? "" });

      let totalWordCount = 0;

      if (req.mergeIntoOne) {
        const composite = buildCompositeDoc(docs);
        totalWordCount = countWords(nodeToText(composite));

        let output: string | Buffer;
        try {
          output = await buildStructuredOutput({
            title: "项目导出",
            doc: composite,
            options: req.options,
          });
        } catch (error) {
          return {
            success: false,
            error: { code: "EXPORT_UNSUPPORTED_NODE", message: error instanceof Error ? error.message : String(error) },
          };
        }

        const tooLarge = ensureWithinSizeLimit(output);
        if (tooLarge) {
          return tooLarge;
        }

        eventBus.emit({ type: "export-progress", exportId, stage: "converting", progress: 60, currentDocument: docs[docs.length - 1]?.id ?? "" });

        try {
          await fs.writeFile(req.outputPath, output);
        } catch (error) {
          return {
            success: false,
            error: { code: "EXPORT_WRITE_ERROR", message: error instanceof Error ? error.message : String(error) },
          };
        }
      } else {
        await fs.mkdir(req.outputPath, { recursive: true });
        for (const [index, doc] of docs.entries()) {
          const output = await buildStructuredOutput({
            title: doc.title,
            doc: doc.content,
            options: req.options,
          });
          const tooLarge = ensureWithinSizeLimit(output);
          if (tooLarge) {
            return tooLarge;
          }
          totalWordCount += countWords(nodeToText(doc.content));
          const extension = req.options.format === "markdown" ? "md" : req.options.format;
          try {
            await fs.writeFile(`${req.outputPath}/${doc.id}.${extension}`, output);
          } catch (error) {
            return {
              success: false,
              error: { code: "EXPORT_WRITE_ERROR", message: error instanceof Error ? error.message : String(error) },
            };
          }

          eventBus.emit({
            type: "export-progress",
            exportId,
            stage: "converting",
            progress: Math.round(((index + 1) / docs.length) * 90),
            currentDocument: doc.id,
          });
        }
      }

      eventBus.emit({ type: "export-progress", exportId, stage: "writing", progress: 100, currentDocument: docs[docs.length - 1]?.id ?? "" });
      eventBus.emit({
        type: "export-completed",
        success: true,
        projectId: req.projectId,
        format: req.options.format,
        documentCount: docs.length,
        timestamp: Date.now(),
      });

      return {
        success: true,
        data: {
          documentCount: docs.length,
          outputPath: req.outputPath,
          format: req.options.format,
          totalWordCount,
          durationMs: Date.now() - startTime,
        },
      };
    },

    dispose(): void {
      disposed = true;
    },
  };

  return exporter;
}
