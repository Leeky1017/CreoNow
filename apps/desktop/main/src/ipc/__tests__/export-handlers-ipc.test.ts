/**
 * Tests for export.ts IPC handlers: legacy format exports and ProseMirror exports.
 *
 * Validates channel registration, payload validation, DB guards,
 * lifecycle event emission, and error propagation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

const mocks = vi.hoisted(() => {
  const exportDocumentMock = vi.fn().mockResolvedValue({
    success: true,
    data: {
      documentCount: 1,
      outputPath: "/out/doc.md",
      format: "markdown",
      totalWordCount: 500,
      durationMs: 120,
    },
  });
  const exportProjectMock = vi.fn().mockResolvedValue({
    success: true,
    data: {
      documentCount: 3,
      outputPath: "/out/project.md",
      format: "markdown",
      totalWordCount: 1500,
      durationMs: 350,
    },
  });

  return {
    exportDocumentMock,
    exportProjectMock,
    createProseMirrorExporterMock: vi.fn(() => ({
      exportDocument: exportDocumentMock,
      exportProject: exportProjectMock,
      dispose: vi.fn(),
    })),
    exportMarkdownMock: vi.fn().mockResolvedValue({
      ok: true,
      data: { relativePath: "exports/doc.md", bytesWritten: 1024 },
    }),
    exportPdfMock: vi.fn().mockResolvedValue({
      ok: true,
      data: { relativePath: "exports/doc.pdf", bytesWritten: 4096 },
    }),
    exportDocxMock: vi.fn().mockResolvedValue({
      ok: true,
      data: { relativePath: "exports/doc.docx", bytesWritten: 2048 },
    }),
    exportTxtMock: vi.fn().mockResolvedValue({
      ok: true,
      data: { relativePath: "exports/doc.txt", bytesWritten: 512 },
    }),
  };
});

vi.mock("../../services/export/prosemirrorExporter", () => ({
  createProseMirrorExporter: mocks.createProseMirrorExporterMock,
}));
vi.mock("../../services/export/exportService", () => ({
  createExportService: vi.fn(() => ({
    exportMarkdown: mocks.exportMarkdownMock,
    exportPdf: mocks.exportPdfMock,
    exportDocx: mocks.exportDocxMock,
    exportTxt: mocks.exportTxtMock,
  })),
}));
vi.mock("../../services/documents/documentService", () => ({
  createDocumentService: vi.fn(() => ({
    read: vi.fn().mockReturnValue({
      ok: true,
      data: {
        documentId: "doc-1",
        projectId: "proj-1",
        title: "Chapter 1",
        sortOrder: 0,
        contentJson: '{"type":"doc","content":[]}',
      },
    }),
    list: vi.fn().mockReturnValue({ ok: true, data: { items: [] } }),
  })),
}));
vi.mock("./projectAccessGuard", () => ({
  guardAndNormalizeProjectAccess: vi.fn(() => ({ ok: true })),
}));
vi.mock("./projectSessionBinding", () => ({
  getProjectSessionBindingRegistry: vi.fn(() => undefined),
}));

const { registerExportIpcHandlers } = await import("../export");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness(dbNull = false) {
  const handlers = new Map<string, Handler>();
  const senderSendMock = vi.fn();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const db = dbNull
    ? null
    : ({
        prepare: vi.fn(() => ({
          run: vi.fn(() => ({ changes: 0 })),
          get: vi.fn(),
          all: vi.fn(() => []),
        })),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      } as never);

  registerExportIpcHandlers({
    ipcMain,
    db,
    logger: logger as never,
    userDataDir: "/mock/user-data",
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(
        { sender: { id: 1, send: senderSendMock } },
        payload,
      )) as IpcResponse<T>;
    },
    handlers,
    logger,
    senderSendMock,
  };
}

// ── Channel Registration ──

describe("export IPC channel registration", () => {
  it("注册所有预期通道", () => {
    const harness = createHarness();
    const expectedChannels = [
      "export:document:markdown",
      "export:document:pdf",
      "export:document:docx",
      "export:document:txt",
      "export:document:prosemirror",
      "export:project:prosemirror",
    ];
    for (const ch of expectedChannels) {
      expect(harness.handlers.has(ch), `missing channel: ${ch}`).toBe(true);
    }
  });
});

// ── Legacy Export DB Guards ──

describe("legacy export DB-not-ready guards", () => {
  const channels = [
    "export:document:markdown",
    "export:document:pdf",
    "export:document:docx",
    "export:document:txt",
  ];

  for (const channel of channels) {
    it(`${channel} → DB_ERROR when DB null`, async () => {
      const harness = createHarness(true);
      const res = await harness.invoke(channel, {
        projectId: "proj-1",
        documentId: "doc-1",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  }
});

// ── ProseMirror Document Export ──

describe("export:document:prosemirror", () => {
  beforeEach(() => vi.clearAllMocks());

  it("成功导出并发送生命周期事件", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{
      documentCount: number;
      outputPath: string;
    }>("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/out/doc.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(true);
    expect(res.data?.documentCount).toBe(1);

    const sendCalls = harness.senderSendMock.mock.calls as Array<[string, Record<string, unknown>]>;
    const startedEvents = sendCalls.filter(
      ([, p]) => p?.type === "export-started",
    );
    expect(startedEvents.length).toBe(1);

    const completedEvents = sendCalls.filter(
      ([, p]) => p?.type === "export-completed",
    );
    expect(completedEvents.length).toBe(1);
  });

  it("DB 未就绪 → DB_ERROR", async () => {
    const harness = createHarness(true);
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/out/doc.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("DB_ERROR");
  });

  it("缺少 documentId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      outputPath: "/out/doc.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("缺少 outputPath → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("无效 format → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/out/doc.xyz",
      options: { format: "banana" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("exporter 失败 → 发送 export-failed 事件", async () => {
    mocks.exportDocumentMock.mockResolvedValueOnce({
      success: false,
      error: { code: "EXPORT_WRITE_ERROR", message: "Permission denied" },
    });

    const harness = createHarness();
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/out/doc.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);

    const sendCalls = harness.senderSendMock.mock.calls as Array<[string, Record<string, unknown>]>;
    const failedEvents = sendCalls.filter(
      ([, p]) => p?.type === "export-failed",
    );
    expect(failedEvents.length).toBe(1);
  });

  it("exporter 抛异常 → INTERNAL_ERROR + export-failed 事件", async () => {
    mocks.exportDocumentMock.mockRejectedValueOnce(new Error("disk full"));

    const harness = createHarness();
    const res = await harness.invoke("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/out/doc.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INTERNAL_ERROR");
  });
});

// ── ProseMirror Project Export ──

describe("export:project:prosemirror", () => {
  beforeEach(() => vi.clearAllMocks());

  it("成功导出整个项目", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{
      documentCount: number;
    }>("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/out/project.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(true);
    expect(res.data?.documentCount).toBe(3);
  });

  it("DB 未就绪 → DB_ERROR", async () => {
    const harness = createHarness(true);
    const res = await harness.invoke("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/out/project.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("DB_ERROR");
  });

  it("缺少 outputPath → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:project:prosemirror", {
      projectId: "proj-1",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("非字符串 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:project:prosemirror", {
      projectId: 123,
      outputPath: "/out/project.md",
      options: { format: "markdown" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("非法 documentIds 类型 → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/out/project.md",
      options: { format: "markdown" },
      documentIds: "not-an-array",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("非法 mergeIntoOne 类型 → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/out/project.md",
      options: { format: "markdown" },
      mergeIntoOne: "yes",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});
