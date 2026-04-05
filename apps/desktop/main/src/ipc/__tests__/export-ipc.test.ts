import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

import { createRuntimeEventBus } from "../runtimeEventBus";

vi.mock("../../services/documents/documentService", () => ({
  createDocumentService: () => ({
    getCurrent: () => ({ ok: true, data: { documentId: "doc-current" } }),
    read: () => ({
      ok: true,
      data: {
        documentId: "doc-1",
        projectId: "proj-1",
        title: "第一章",
        sortOrder: 1,
        contentJson: JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
        }),
      },
    }),
    list: () => ({
      ok: true,
      data: {
        items: [{ documentId: "doc-1", title: "第一章", sortOrder: 1 }],
      },
    }),
  }),
}));

vi.mock("../../services/export/prosemirrorExporter", () => ({
  createProseMirrorExporter: (deps: {
    eventBus: { emit: (payload: Record<string, unknown>) => void };
  }) => ({
    exportDocument: async (req: {
      exportId: string;
      outputPath: string;
      documentId: string;
      options: { format: string };
    }) => {
      deps.eventBus.emit({
        type: "export-progress",
        exportId: req.exportId,
        stage: "parsing",
        progress: 30,
        currentDocument: req.documentId,
      });
      await fs.mkdir(path.dirname(req.outputPath), { recursive: true });
      await fs.writeFile(req.outputPath, `${req.options.format}:${req.documentId}`, "utf8");
      deps.eventBus.emit({
        type: "export-progress",
        exportId: req.exportId,
        stage: "writing",
        progress: 100,
        currentDocument: req.documentId,
      });
      return {
        success: true,
        data: {
          documentCount: 1,
          outputPath: req.outputPath,
          format: req.options.format,
          totalWordCount: 1,
          durationMs: 1,
        },
      };
    },
    exportProject: async (req: {
      exportId: string;
      outputPath: string;
      projectId: string;
      options: { format: string };
    }) => {
      deps.eventBus.emit({
        type: "export-progress",
        exportId: req.exportId,
        stage: "converting",
        progress: 60,
        currentDocument: "doc-1",
      });
      await fs.mkdir(path.dirname(req.outputPath), { recursive: true });
      await fs.writeFile(req.outputPath, `${req.options.format}:${req.projectId}`, "utf8");
      deps.eventBus.emit({
        type: "export-progress",
        exportId: req.exportId,
        stage: "writing",
        progress: 100,
        currentDocument: "doc-1",
      });
      return {
        success: true,
        data: {
          documentCount: 1,
          outputPath: req.outputPath,
          format: req.options.format,
          totalWordCount: 1,
          durationMs: 1,
        },
      };
    },
    dispose: () => {},
  }),
}));

const { registerExportIpcHandlers } = await import("../export");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness() {
  const handlers = new Map<string, Handler>();
  const pushEvents: Array<{ channel: string; payload: unknown }> = [];
  const outputDir = path.join(process.cwd(), "apps/desktop/.test-output/export-ipc");

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

  registerExportIpcHandlers({
    ipcMain,
    db: {} as never,
    logger: logger as never,
    userDataDir: outputDir,
    eventBus: createRuntimeEventBus(),
  });

  return {
    outputDir,
    handlers,
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return (await handler(
        {
          sender: {
            id: 1,
            send: (eventChannel: string, eventPayload: unknown) => {
              pushEvents.push({ channel: eventChannel, payload: eventPayload });
            },
          },
        },
        payload,
      )) as T;
    },
    pushEvents,
  };
}

describe("export IPC handlers", () => {
  beforeEach(async () => {
    await fs.rm(path.join(process.cwd(), "apps/desktop/.test-output"), {
      recursive: true,
      force: true,
    });
  });

  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), "apps/desktop/.test-output"), {
      recursive: true,
      force: true,
    });
  });

  it("注册统一导出通道", () => {
    const harness = createHarness();
    expect(harness.handlers.has("export:document:write")).toBe(true);
    expect(harness.handlers.has("export:project:write")).toBe(true);
  });

  it("非法 payload 返回 INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const result = (await harness.invoke("export:document:write", null)) as {
      ok: boolean;
      error?: { code?: string };
    };
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("导出单文档时真正写盘并推送 export:progress", async () => {
    const harness = createHarness();

    const result = (await harness.invoke("export:document:write", {
      projectId: "proj-1",
      documentId: "doc-1",
      format: "markdown",
    })) as {
      ok: boolean;
      data?: { relativePath: string; bytesWritten: number };
    };

    expect(result.ok).toBe(true);
    expect(result.data?.relativePath).toBe("exports/proj-1/doc-1.md");
    expect(result.data?.bytesWritten).toBeGreaterThan(0);
    expect(harness.pushEvents.map((event) => event.channel)).toContain("export:progress");
    expect(harness.pushEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "export:progress",
          payload: expect.objectContaining({ stage: "parsing", progress: 30 }),
        }),
        expect.objectContaining({
          channel: "export:progress",
          payload: expect.objectContaining({ stage: "writing", progress: 100 }),
        }),
      ]),
    );
  });

  it("导出项目时使用统一合同并返回文件结果", async () => {
    const harness = createHarness();

    const result = (await harness.invoke("export:project:write", {
      projectId: "proj-1",
      format: "pdf",
    })) as {
      ok: boolean;
      data?: { relativePath: string; bytesWritten: number };
    };

    expect(result.ok).toBe(true);
    expect(result.data?.relativePath).toBe("exports/proj-1/proj-1.pdf");
    expect(result.data?.bytesWritten).toBeGreaterThan(0);
  });
});
