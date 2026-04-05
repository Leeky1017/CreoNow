import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

import { EXPORT_PROGRESS_CHANNEL } from "@shared/types/export";

const exportDocumentProsemirror = vi.fn();
const exportProjectProsemirror = vi.fn();

vi.mock("../../services/export/exportService", () => ({
  createExportService: vi.fn(() => ({
    exportDocumentProsemirror,
    exportProjectProsemirror,
  })),
}));

const { registerExportIpcHandlers } = await import("../export");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness() {
  const handlers = new Map<string, Handler>();
  const sender = {
    id: 1,
    send: vi.fn(),
  };

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerExportIpcHandlers({
    ipcMain,
    db: {
      prepare: vi.fn(),
      exec: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn),
    } as never,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never,
    userDataDir: "/mock/user-data",
  });

  return {
    handlers,
    sender,
    invoke: async <T>(channel: string, payload?: unknown) =>
      (await handlers.get(channel)!({ sender }, payload)) as IpcResponse<T>,
  };
}

describe("export extension IPC handlers", () => {
  beforeEach(() => {
    exportDocumentProsemirror.mockReset();
    exportProjectProsemirror.mockReset();
  });

  it("导出单文档时调用真实 prosemirror exporter，并返回导出结果", async () => {
    const harness = createHarness();
    exportDocumentProsemirror.mockResolvedValueOnce({
      ok: true,
      data: {
        exportId: "exp-1",
        documentCount: 1,
        outputPath: "/exports/doc-1.md",
        format: "markdown",
        totalWordCount: 123,
        durationMs: 45,
      },
    });

    const result = await harness.invoke<{
      exportId: string;
      outputPath: string;
      format: string;
    }>("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      outputPath: "/exports/doc-1.md",
      options: { format: "markdown" },
    });

    expect(result.ok).toBe(true);
    expect(result.data?.exportId).toBe("exp-1");
    expect(result.data?.outputPath).toBe("/exports/doc-1.md");
    expect(result.data?.format).toBe("markdown");
    expect(exportDocumentProsemirror).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        documentId: "doc-1",
        outputPath: "/exports/doc-1.md",
        options: { format: "markdown" },
        onProgress: expect.any(Function),
      }),
    );
  });

  it("导出项目时通过 export:progress 推送进度事件", async () => {
    const harness = createHarness();
    exportProjectProsemirror.mockImplementationOnce(async (args) => {
      args.onProgress?.({
        type: "export-progress",
        exportId: "exp-2",
        stage: "converting",
        progress: 60,
        currentDocument: "doc-2",
      });
      return {
        ok: true,
        data: {
          exportId: "exp-2",
          documentCount: 2,
          outputPath: "/exports/project.docx",
          format: "docx",
          totalWordCount: 456,
          durationMs: 90,
        },
      };
    });

    const result = await harness.invoke<{
      exportId: string;
      documentCount: number;
    }>("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/exports/project.docx",
      mergeIntoOne: true,
      options: { format: "docx", includeTableOfContents: true },
    });

    expect(result.ok).toBe(true);
    expect(result.data?.documentCount).toBe(2);
    expect(harness.sender.send).toHaveBeenCalledWith(EXPORT_PROGRESS_CHANNEL, {
      type: "export-progress",
      exportId: "exp-2",
      stage: "converting",
      progress: 60,
      currentDocument: "doc-2",
    });
  });

  it("允许省略 mergeIntoOne，并按公开契约透传为 undefined", async () => {
    const harness = createHarness();
    exportProjectProsemirror.mockResolvedValueOnce({
      ok: true,
      data: {
        exportId: "exp-3",
        documentCount: 2,
        outputPath: "/exports/project-dir",
        format: "markdown",
        totalWordCount: 456,
        durationMs: 90,
      },
    });

    const result = await harness.invoke<{
      exportId: string;
      outputPath: string;
    }>("export:project:prosemirror", {
      projectId: "proj-1",
      outputPath: "/exports/project-dir",
      options: { format: "markdown" },
    });

    expect(result.ok).toBe(true);
    expect(result.data?.exportId).toBe("exp-3");
    expect(exportProjectProsemirror).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        outputPath: "/exports/project-dir",
        mergeIntoOne: undefined,
        options: { format: "markdown" },
        onProgress: expect.any(Function),
      }),
    );
  });

  it("缺少 outputPath 时返回 INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const result = await harness.invoke<never>("export:document:prosemirror", {
      projectId: "proj-1",
      documentId: "doc-1",
      options: { format: "markdown" },
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("不再注册 export:progress:get stub 通道", () => {
    const harness = createHarness();
    expect(harness.handlers.has("export:progress:get")).toBe(false);
  });
});
