import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

const mocks = vi.hoisted(() => {
  const exportDocumentMock = vi.fn();
  const exportProjectMock = vi.fn();
  const exporterDisposeMock = vi.fn();
  const createProseMirrorExporterMock = vi.fn(
    (args: { eventBus: { emit: (payload: Record<string, unknown>) => void } }) => ({
      exportDocument: exportDocumentMock,
      exportProject: exportProjectMock,
      dispose: exporterDisposeMock,
      toMarkdown: vi.fn(),
      toDocx: vi.fn(),
      toPdf: vi.fn(),
      toTxt: vi.fn(),
      isNodeSupported: vi.fn(),
      isMarkSupported: vi.fn(),
      __emitProgress: (payload: Record<string, unknown>) => args.eventBus.emit(payload),
    }),
  );
  return {
    exportDocumentMock,
    exportProjectMock,
    exporterDisposeMock,
    createProseMirrorExporterMock,
  };
});

vi.mock("../../services/export/prosemirrorExporter", () => ({
  createProseMirrorExporter: mocks.createProseMirrorExporterMock,
}));

import { registerExportIpcHandlers } from "../export";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness() {
  const handlers = new Map<string, Handler>();
  const listeners = new Map<string, Set<(payload: Record<string, unknown>) => void>>();
  const sender = {
    id: 1,
    send: vi.fn(),
  };

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

  const db = {
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
  };

  registerExportIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    userDataDir: "/mock/user-data",
    eventBus: {
      emit: (payload) => {
        const eventName = typeof payload.type === "string" ? payload.type : "";
        if (!eventName) {
          return;
        }
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
        if (!bucket) {
          return;
        }
        bucket.delete(handler);
        if (bucket.size === 0) {
          listeners.delete(eventName);
        }
      },
    },
  });

  return {
    handlers,
    sender,
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return (await handler({ sender }, payload)) as IpcResponse<T>;
    },
  };
}

describe("export extension IPC handlers (P3)", () => {
  beforeEach(() => {
    mocks.exportDocumentMock.mockReset();
    mocks.exportProjectMock.mockReset();
    mocks.exporterDisposeMock.mockReset();
    mocks.createProseMirrorExporterMock.mockClear();
  });

  describe("export:document:prosemirror", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:document:prosemirror")).toBe(true);
    });

    it("缺少 outputPath 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("export:document:prosemirror", {
        projectId: "proj-1",
        documentId: "doc-1",
        options: { format: "markdown" },
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("执行真实导出契约并推送进度", async () => {
      const harness = createHarness();
      mocks.exportDocumentMock.mockImplementationOnce(async (_payload: unknown) => {
        const [exporterArgs] = mocks.createProseMirrorExporterMock.mock.calls.at(-1) ?? [];
        exporterArgs?.eventBus.emit({
          type: "export-progress",
          exportId: "exp-1",
          stage: "writing",
          progress: 100,
          currentDocument: "doc-1",
        });
        return {
          success: true,
          data: {
            documentCount: 1,
            outputPath: "workspace/exports/doc-1.md",
            format: "markdown",
            totalWordCount: 1200,
            durationMs: 15,
          },
        };
      });

      const result = await harness.invoke<{
        documentCount: number;
        outputPath: string;
        format: string;
      }>("export:document:prosemirror", {
        projectId: "proj-1",
        documentId: "doc-1",
        outputPath: "workspace/exports/doc-1.md",
        options: { format: "markdown" },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.documentCount).toBe(1);
      expect(result.data?.outputPath).toContain("doc-1.md");
      expect(result.data?.format).toBe("markdown");
      expect(harness.sender.send).toHaveBeenCalledTimes(3);

      const startPayload = harness.sender.send.mock.calls[0]?.[1] as {
        type: string;
        exportId: string;
        currentDocument: string;
      };
      const progressPayload = harness.sender.send.mock.calls[1]?.[1] as {
        type: string;
        exportId: string;
        progress: number;
      };
      const completedPayload = harness.sender.send.mock.calls[2]?.[1] as {
        type: string;
        exportId: string;
        documentCount: number;
      };

      expect(startPayload).toMatchObject({
        type: "export-started",
        projectId: "proj-1",
        format: "markdown",
        currentDocument: "doc-1",
      });
      expect(progressPayload).toMatchObject({
        type: "export-progress",
        stage: "writing",
        progress: 100,
        currentDocument: "doc-1",
      });
      expect(progressPayload.exportId).toBe(startPayload.exportId);
      expect(completedPayload).toMatchObject({
        type: "export-completed",
        success: true,
        projectId: "proj-1",
        format: "markdown",
        documentCount: 1,
      });
      expect(completedPayload.exportId).toBe(startPayload.exportId);
      expect(mocks.exporterDisposeMock).toHaveBeenCalled();
    });

    it("导出失败时推送 export-failed 终态事件", async () => {
      const harness = createHarness();
      mocks.exportDocumentMock.mockResolvedValueOnce({
        success: false,
        error: {
          code: "EXPORT_WRITE_ERROR",
          message: "disk full",
        },
      });

      const result = await harness.invoke<never>("export:document:prosemirror", {
        projectId: "proj-1",
        documentId: "doc-1",
        outputPath: "workspace/exports/doc-1.md",
        options: { format: "markdown" },
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("EXPORT_WRITE_ERROR");
      expect(harness.sender.send).toHaveBeenCalledTimes(2);

      const startPayload = harness.sender.send.mock.calls[0]?.[1] as {
        type: string;
        exportId: string;
      };
      const failedPayload = harness.sender.send.mock.calls[1]?.[1] as {
        type: string;
        exportId: string;
        error: { code: string; message: string };
      };

      expect(startPayload).toMatchObject({
        type: "export-started",
        projectId: "proj-1",
        format: "markdown",
        currentDocument: "doc-1",
      });
      expect(failedPayload).toMatchObject({
        type: "export-failed",
        success: false,
        projectId: "proj-1",
        format: "markdown",
        currentDocument: "doc-1",
        error: {
          code: "EXPORT_WRITE_ERROR",
          message: "disk full",
        },
      });
      expect(failedPayload.exportId).toBe(startPayload.exportId);
      expect(mocks.exporterDisposeMock).toHaveBeenCalled();
    });
  });

  describe("export:project:prosemirror", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:project:prosemirror")).toBe(true);
    });

    it("执行项目导出契约", async () => {
      const harness = createHarness();
      mocks.exportProjectMock.mockResolvedValueOnce({
        success: true,
        data: {
          documentCount: 12,
          outputPath: "workspace/exports/project.docx",
          format: "docx",
          totalWordCount: 88000,
          durationMs: 320,
        },
      });

      const result = await harness.invoke<{
        documentCount: number;
        totalWordCount: number;
      }>("export:project:prosemirror", {
        projectId: "proj-1",
        outputPath: "workspace/exports/project.docx",
        mergeIntoOne: true,
        options: { format: "docx", includeTableOfContents: true },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.documentCount).toBe(12);
      expect(result.data?.totalWordCount).toBe(88000);
      expect(mocks.exporterDisposeMock).toHaveBeenCalled();
    });
  });

  describe("push progress channel", () => {
    it("不再注册 export:progress:get 轮询 stub", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:progress:get")).toBe(false);
    });
  });

  describe("DB 未就绪", () => {
    it("prosemirror 通道在 DB 为 null 时返回 DB_ERROR", async () => {
      const handlers = new Map<string, Handler>();
      const ipcMain = {
        handle: (channel: string, listener: Handler) => {
          handlers.set(channel, listener);
        },
      } as unknown as IpcMain;

      registerExportIpcHandlers({
        ipcMain,
        db: null,
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        } as never,
        userDataDir: "/mock",
      });

      for (const channel of [
        "export:document:prosemirror",
        "export:project:prosemirror",
      ]) {
        const handler = handlers.get(channel)!;
        const result = (await handler(
          { sender: { id: 1, send: vi.fn() } },
          {
            projectId: "proj-1",
            documentId: "doc-1",
            outputPath: "workspace/export.out",
            options: { format: "markdown" },
          },
        )) as IpcResponse<never>;

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe("DB_ERROR");
      }
    });
  });

  describe("已有导出通道兼容性", () => {
    it("export:document:markdown 仍然注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:document:markdown")).toBe(true);
    });
  });

  describe("并发导出隔离 (Blocking-1)", () => {
    it("两个并发文档导出不互串：各自进度只发给对应 sender，exportId 不混淆", async () => {
      const harness = createHarness();
      const sender1 = { id: 1, send: vi.fn() };
      const sender2 = { id: 2, send: vi.fn() };

      let resolveExport1!: (v: unknown) => void;
      let resolveExport2!: (v: unknown) => void;

      mocks.exportDocumentMock
        .mockImplementationOnce(() => new Promise((r) => { resolveExport1 = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveExport2 = r; }));

      const docHandler = harness.handlers.get("export:document:prosemirror")!;
      const payload1 = { projectId: "p1", documentId: "d1", outputPath: "out1.md", options: { format: "markdown" } };
      const payload2 = { projectId: "p2", documentId: "d2", outputPath: "out2.md", options: { format: "markdown" } };

      // Start both concurrently — no await, so both run up to their first `await`
      const promise1 = docHandler({ sender: sender1 }, payload1);
      const promise2 = docHandler({ sender: sender2 }, payload2);

      // Both exporters created synchronously before the first await
      expect(mocks.createProseMirrorExporterMock.mock.calls).toHaveLength(2);

      const bus1 = mocks.createProseMirrorExporterMock.mock.calls[0]![0].eventBus as {
        emit: (p: Record<string, unknown>) => void;
      };
      const bus2 = mocks.createProseMirrorExporterMock.mock.calls[1]![0].eventBus as {
        emit: (p: Record<string, unknown>) => void;
      };

      // Emit progress through each isolated bus
      bus1.emit({ type: "export-progress", stage: "writing", progress: 70, currentDocument: "d1" });
      bus2.emit({ type: "export-progress", stage: "converting", progress: 40, currentDocument: "d2" });

      // Complete both
      resolveExport1({
        success: true,
        data: { documentCount: 1, outputPath: "out1.md", format: "markdown", totalWordCount: 100, durationMs: 10 },
      });
      resolveExport2({
        success: true,
        data: { documentCount: 1, outputPath: "out2.md", format: "markdown", totalWordCount: 100, durationMs: 12 },
      });
      await Promise.all([promise1, promise2]);

      const exportId1 = (
        sender1.send.mock.calls.find(([, p]) => (p as Record<string, unknown>)?.["type"] === "export-started")?.[1] as {
          exportId: string;
        }
      )?.exportId;
      const exportId2 = (
        sender2.send.mock.calls.find(([, p]) => (p as Record<string, unknown>)?.["type"] === "export-started")?.[1] as {
          exportId: string;
        }
      )?.exportId;

      expect(exportId1).toBeTruthy();
      expect(exportId2).toBeTruthy();
      expect(exportId1).not.toBe(exportId2);

      // All events sent to sender1 must carry exportId1 only
      for (const [, payload] of sender1.send.mock.calls) {
        expect((payload as Record<string, unknown>)?.["exportId"]).toBe(exportId1);
      }

      // All events sent to sender2 must carry exportId2 only
      for (const [, payload] of sender2.send.mock.calls) {
        expect((payload as Record<string, unknown>)?.["exportId"]).toBe(exportId2);
      }
    });
  });

  describe("EXPORT_DOCUMENT_NOT_FOUND contract (Blocking-2)", () => {
    it("export:document:prosemirror 遇到缺失文档时返回 EXPORT_DOCUMENT_NOT_FOUND，不被洗成 INTERNAL_ERROR", async () => {
      const harness = createHarness();
      mocks.exportDocumentMock.mockResolvedValueOnce({
        success: false,
        error: { code: "EXPORT_DOCUMENT_NOT_FOUND", message: "文档不存在" },
      });

      const result = await harness.invoke<never>("export:document:prosemirror", {
        projectId: "proj-1",
        documentId: "doc-missing",
        outputPath: "workspace/exports/out.md",
        options: { format: "markdown" },
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("EXPORT_DOCUMENT_NOT_FOUND");
      expect(result.error?.code).not.toBe("INTERNAL_ERROR");

      // A "export-failed" terminal event must be pushed with the same code
      const failedEvent = harness.sender.send.mock.calls.find(
        ([, p]) => (p as Record<string, unknown>)?.["type"] === "export-failed",
      )?.[1] as { type: string; error: { code: string } } | undefined;

      expect(failedEvent?.error?.code).toBe("EXPORT_DOCUMENT_NOT_FOUND");
    });
  });
});
