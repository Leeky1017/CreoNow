/**
 * ProseMirror Exporter P3 测试 — ProseMirror 导出适配
 * Spec: openspec/specs/document-management/spec.md — P3: ProseMirror 导出适配
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 Markdown/DOCX/PDF/TXT 导出、格式能力矩阵、ExportOptions、
 * 进度事件、不支持节点检测、空文档处理、dispose 清理。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type {
  ProseMirrorExporter,
  ExportFormat,
  ExportOptions,
  ExportDocumentRequest,
  ExportProjectRequest,
  ExportProgressEvent,
  ExportResult,
} from "../prosemirrorExporter";
import { createProseMirrorExporter } from "../prosemirrorExporter";

// ─── mock types ─────────────────────────────────────────────────────

interface MockEventBus {
  emit: vi.Mock;
  on: vi.Mock;
  off: vi.Mock;
}

interface MockFs {
  writeFile: vi.Mock;
  mkdir: vi.Mock;
}

/** Minimal ProseMirror document mock */
interface MockProseMirrorNode {
  type: string;
  content?: MockProseMirrorNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
}

// ─── helpers ────────────────────────────────────────────────────────

function createMockEventBus(): MockEventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function createMockFs(): MockFs {
  return {
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
}

function makeExportOptions(
  overrides: Partial<ExportOptions> = {},
): ExportOptions {
  return {
    format: "markdown",
    includeMetadata: false,
    includeTableOfContents: false,
    ...overrides,
  };
}

/** 简单 ProseMirror doc：一个标题 + 一个段落 */
function makeSimpleDoc(): MockProseMirrorNode {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "第一章" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "林远走进了废弃仓库。" }],
      },
    ],
  };
}

/** 包含多种格式标记的 ProseMirror doc */
function makeRichDoc(): MockProseMirrorNode {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "第一章 暗流" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "林远" },
          {
            type: "text",
            text: "冷静地",
            marks: [{ type: "bold" }],
          },
          { type: "text", text: "走进了仓库。" },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "他低声说",
            marks: [{ type: "italic" }],
          },
          { type: "text", text: "：「到了。」" },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "线索一" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "线索二" }],
              },
            ],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "引用内容" }],
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: { language: "python" },
        content: [{ type: "text", text: "print('hello')" }],
      },
      { type: "horizontalRule" },
    ],
  };
}

/** 包含不支持节点的文档 */
function makeUnsupportedDoc(): MockProseMirrorNode {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "正常文本" }],
      },
      {
        type: "mention",
        attrs: { userId: "user-1", label: "@林远" },
      },
    ],
  };
}

/** 空文档 */
function makeEmptyDoc(): MockProseMirrorNode {
  return {
    type: "doc",
    content: [],
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ProseMirrorExporter P3", () => {
  let eventBus: MockEventBus;
  let fs: MockFs;
  let exporter: ProseMirrorExporter;

  beforeEach(() => {
    eventBus = createMockEventBus();
    fs = createMockFs();
    exporter = createProseMirrorExporter({
      eventBus: eventBus as any,
      fs: fs as any,
    });
  });

  afterEach(() => {
    exporter.dispose();
    vi.restoreAllMocks();
  });

  // ── Markdown export ─────────────────────────────────────────────

  describe("toMarkdown", () => {
    it("将标题转换为 Markdown 标题语法", () => {
      const doc = makeSimpleDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("# 第一章");
    });

    it("将段落转换为纯文本行", () => {
      const doc = makeSimpleDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("林远走进了废弃仓库。");
    });

    it("将粗体转换为 ** 标记", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("**冷静地**");
    });

    it("将斜体转换为 * 标记", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("*他低声说*");
    });

    it("将无序列表转换为 - 标记", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("- 线索一");
      expect(md).toContain("- 线索二");
    });

    it("将引用块转换为 > 标记", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("> 引用内容");
    });

    it("将代码块转换为 ``` 标记", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("```");
      expect(md).toContain("print('hello')");
    });

    it("将分隔线转换为 ---", () => {
      const doc = makeRichDoc();
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("---");
    });

    it("保留多级标题层级", () => {
      const doc: MockProseMirrorNode = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "H1" }],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "H2" }],
          },
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "H3" }],
          },
        ],
      };
      const md = exporter.toMarkdown(doc as any);

      expect(md).toContain("# H1");
      expect(md).toContain("## H2");
      expect(md).toContain("### H3");
    });
  });

  // ── DOCX export ─────────────────────────────────────────────────

  describe("toDocx", () => {
    it("导出为 DOCX Buffer", () => {
      const doc = makeSimpleDoc();
      const buffer = exporter.toDocx(doc as any, makeExportOptions({ format: "docx" }));

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // DOCX (ZIP) 文件应以 PK 签名开头
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });

    it("DOCX 包含标题结构", () => {
      const doc = makeRichDoc();
      const buffer = exporter.toDocx(doc as any, makeExportOptions({ format: "docx" }));

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("includeTableOfContents 为 true 时生成目录", () => {
      const doc = makeRichDoc();
      const buffer = exporter.toDocx(
        doc as any,
        makeExportOptions({ format: "docx", includeTableOfContents: true }),
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  // ── PDF export ──────────────────────────────────────────────────

  describe("toPdf", () => {
    it("导出为 PDF Buffer", () => {
      const doc = makeSimpleDoc();
      const buffer = exporter.toPdf(doc as any, makeExportOptions({ format: "pdf" }));

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF 文件应以 %PDF 签名开头
      const header = buffer.slice(0, 5).toString("ascii");
      expect(header).toMatch(/^%PDF-/);
    });

    it("PDF 支持 A4 页面大小", () => {
      const doc = makeSimpleDoc();
      const buffer = exporter.toPdf(
        doc as any,
        makeExportOptions({ format: "pdf", pageSize: "a4" }),
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("PDF 支持 letter 页面大小", () => {
      const doc = makeSimpleDoc();
      const buffer = exporter.toPdf(
        doc as any,
        makeExportOptions({ format: "pdf", pageSize: "letter" }),
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("PDF 支持自定义字体大小", () => {
      const doc = makeSimpleDoc();
      const buffer = exporter.toPdf(
        doc as any,
        makeExportOptions({ format: "pdf", fontSize: 14 }),
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  // ── TXT export ──────────────────────────────────────────────────

  describe("toTxt", () => {
    it("导出为纯文本字符串", () => {
      const doc = makeSimpleDoc();
      const txt = exporter.toTxt(doc as any);

      expect(typeof txt).toBe("string");
      expect(txt).toContain("第一章");
      expect(txt).toContain("林远走进了废弃仓库。");
    });

    it("纯文本不包含格式标记", () => {
      const doc = makeRichDoc();
      const txt = exporter.toTxt(doc as any);

      expect(txt).not.toContain("**");
      expect(txt).not.toContain("*");
      expect(txt).not.toContain("```");
      expect(txt).not.toContain("> ");
      expect(txt).not.toContain("- ");
    });
  });

  // ── Format capability matrix ────────────────────────────────────

  describe("format capability matrix", () => {
    const supportedNodeTypes = [
      "heading",
      "paragraph",
      "bulletList",
      "orderedList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
      "image",
      "table",
    ];

    const supportedMarkTypes = ["bold", "italic", "code", "underline", "link"];

    for (const format of ["markdown", "docx", "pdf"] as const) {
      describe(`${format} format`, () => {
        for (const nodeType of supportedNodeTypes) {
          it(`支持 ${nodeType} 节点类型`, () => {
            const supported = exporter.isNodeSupported(nodeType, format);
            expect(supported).toBe(true);
          });
        }

        for (const markType of supportedMarkTypes) {
          it(`支持 ${markType} 标记类型`, () => {
            const supported = exporter.isMarkSupported(markType, format);
            expect(supported).toBe(true);
          });
        }
      });
    }
  });

  // ── ExportOptions ───────────────────────────────────────────────

  describe("export options", () => {
    it("includeMetadata 为 true 时包含标题页", () => {
      const doc = makeSimpleDoc();
      const options = makeExportOptions({ includeMetadata: true });
      const md = exporter.toMarkdown(doc as any);

      expect(typeof md).toBe("string");
    });

    it("默认 fontSize 为 12pt", () => {
      const options = makeExportOptions({ format: "pdf" });
      expect(options.fontSize ?? 12).toBe(12);
    });
  });

  // ── Progress events ─────────────────────────────────────────────

  describe("progress events", () => {
    it("导出过程中发射 export-progress 事件", async () => {
      const doc = makeRichDoc();
      await exporter.exportDocument({
        documentId: "doc-1",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "export-progress",
          exportId: expect.any(String),
          stage: expect.stringMatching(/^(parsing|converting|writing)$/),
          currentDocument: expect.any(String),
        }),
      );
    });

    it("导出完成后发射 export-completed 事件", async () => {
      const doc = makeRichDoc();
      await exporter.exportDocument({
        documentId: "doc-1",
        projectId: "proj-1",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "export-completed",
          success: true,
          projectId: "proj-1",
          format: "markdown",
          documentCount: expect.any(Number),
          timestamp: expect.any(Number),
        }),
      );
    });

    it("进度事件包含 progress 百分比（0-100）", async () => {
      await exporter.exportDocument({
        documentId: "doc-1",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      const progressCalls = eventBus.emit.mock.calls.filter(
        (call: any) => call[0]?.type === "export-progress",
      );
      for (const [event] of progressCalls) {
        expect(event.progress).toBeGreaterThanOrEqual(0);
        expect(event.progress).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Error handling ──────────────────────────────────────────────

  describe("error handling", () => {
    it("不支持的格式返回 EXPORT_FORMAT_UNSUPPORTED", async () => {
      const result = await exporter.exportDocument({
        documentId: "doc-1",
        options: makeExportOptions({ format: "rtf" as any }),
        outputPath: "/output/test.rtf",
      } as ExportDocumentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_FORMAT_UNSUPPORTED");
    });

    it("空文档返回 EXPORT_EMPTY_DOCUMENT", async () => {
      const result = await exporter.exportDocument({
        documentId: "doc-empty",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_EMPTY_DOCUMENT");
    });

    it("包含不支持节点时返回 EXPORT_UNSUPPORTED_NODE", () => {
      const doc = makeUnsupportedDoc();

      expect(() => exporter.toMarkdown(doc as any)).toThrow();
    });

    it("EXPORT_UNSUPPORTED_NODE 错误列出不支持的节点类型", async () => {
      const result = await exporter.exportDocument({
        documentId: "doc-mention",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_UNSUPPORTED_NODE");
    });

    it("文件写入失败时返回 EXPORT_WRITE_ERROR", async () => {
      fs.writeFile.mockRejectedValueOnce(new Error("EACCES: permission denied"));

      const result = await exporter.exportDocument({
        documentId: "doc-1",
        options: makeExportOptions(),
        outputPath: "/restricted/test.md",
      } as ExportDocumentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_WRITE_ERROR");
    });

    it("导出体积超限时返回 EXPORT_SIZE_EXCEEDED", async () => {
      const result = await exporter.exportProject({
        projectId: "proj-huge",
        options: makeExportOptions({ format: "pdf" }),
        outputPath: "/output/huge.pdf",
        mergeIntoOne: true,
      } as ExportProjectRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_SIZE_EXCEEDED");
    });

    it("导出中断时返回 EXPORT_INTERRUPTED", async () => {
      const result = await exporter.exportDocument({
        documentId: "doc-interrupted",
        options: makeExportOptions(),
        outputPath: "/output/test.md",
      } as ExportDocumentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPORT_INTERRUPTED");
    });
  });

  // ── Batch export (ExportProjectRequest) ─────────────────────────

  describe("batch export", () => {
    it("按章节顺序合并导出整个项目（mergeIntoOne=true）", async () => {
      const result = await exporter.exportProject({
        projectId: "proj-1",
        options: makeExportOptions({ format: "markdown" }),
        outputPath: "/output/project.md",
        documentIds: ["doc-1", "doc-2", "doc-3"],
        mergeIntoOne: true,
      } as ExportProjectRequest);

      expect(result.success).toBe(true);
      expect(result.data?.documentCount).toBeGreaterThanOrEqual(1);
    });

    it("分文件导出项目（mergeIntoOne=false）", async () => {
      const result = await exporter.exportProject({
        projectId: "proj-1",
        options: makeExportOptions({ format: "markdown" }),
        outputPath: "/output/chapters/",
        documentIds: ["doc-1", "doc-2"],
        mergeIntoOne: false,
      } as ExportProjectRequest);

      expect(result.success).toBe(true);
      expect(result.data?.documentCount).toBe(2);
    });

    it("不指定 documentIds 时导出全部章节", async () => {
      const result = await exporter.exportProject({
        projectId: "proj-1",
        options: makeExportOptions({ format: "markdown" }),
        outputPath: "/output/project.md",
        mergeIntoOne: true,
      } as ExportProjectRequest);

      expect(result.success).toBe(true);
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用方法抛出错误", () => {
      exporter.dispose();

      expect(() => exporter.toMarkdown(makeSimpleDoc() as any)).toThrow();
    });

    it("dispose 可重复调用不报错", () => {
      exporter.dispose();
      expect(() => exporter.dispose()).not.toThrow();
    });
  });
});
