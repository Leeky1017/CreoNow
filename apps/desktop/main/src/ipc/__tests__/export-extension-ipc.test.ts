import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerExportIpcHandlers } from "../export";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness() {
  const handlers = new Map<string, Handler>();

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

  const stmtRun = vi.fn();
  const stmtGet = vi.fn(
    (..._args: unknown[]) => undefined as Record<string, unknown> | undefined,
  );
  const stmtAll = vi.fn((..._args: unknown[]): Record<string, unknown>[] => []);

  const db = {
    prepare: vi.fn(() => ({
      run: stmtRun,
      get: stmtGet,
      all: stmtAll,
    })),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
  };

  registerExportIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    userDataDir: "/mock/user-data",
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(
        { sender: { id: 1 } },
        payload,
      )) as IpcResponse<T>;
    },
    handlers,
    logger,
    db,
    stmtGet,
    stmtAll,
  };
}

describe("export extension IPC handlers (P3)", () => {
  // ── export:document:prosemirror ──

  describe("export:document:prosemirror", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:document:prosemirror")).toBe(true);
    });

    it("缺少 documentId 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>(
        "export:document:prosemirror",
        { projectId: "proj-1" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("文档不存在返回 EXPORT_EMPTY_DOCUMENT", async () => {
      const harness = createHarness();
      harness.stmtGet.mockReturnValueOnce(undefined);

      const result = await harness.invoke<never>(
        "export:document:prosemirror",
        { projectId: "proj-1", documentId: "doc-nonexistent" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("EXPORT_EMPTY_DOCUMENT");
    });

    it("文档存在返回 ProseMirror JSON", async () => {
      const harness = createHarness();
      const mockContent = JSON.stringify({ type: "doc", content: [] });
      harness.stmtGet.mockReturnValueOnce({ contentJson: mockContent });

      const result = await harness.invoke<{
        documentId: string;
        content: string;
      }>("export:document:prosemirror", {
        projectId: "proj-1",
        documentId: "doc-1",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.documentId).toBe("doc-1");
      expect(result.data?.content).toBe(mockContent);
    });

    it("非 object payload 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>(
        "export:document:prosemirror",
        null,
      );
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── export:project:prosemirror ──

  describe("export:project:prosemirror", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:project:prosemirror")).toBe(true);
    });

    it("空项目返回空 items", async () => {
      const harness = createHarness();
      harness.stmtAll.mockReturnValueOnce([]);

      const result = await harness.invoke<{
        items: Array<{
          documentId: string;
          title: string;
          content: string;
        }>;
      }>("export:project:prosemirror", { projectId: "proj-empty" });

      expect(result.ok).toBe(true);
      expect(result.data?.items).toEqual([]);
    });

    it("返回项目所有文档", async () => {
      const harness = createHarness();
      const docs = [
        {
          documentId: "doc-1",
          title: "Chapter 1",
          contentJson: '{"type":"doc"}',
        },
        {
          documentId: "doc-2",
          title: "Chapter 2",
          contentJson: '{"type":"doc","content":[]}',
        },
      ];
      harness.stmtAll.mockReturnValueOnce(docs);

      const result = await harness.invoke<{
        items: Array<{
          documentId: string;
          title: string;
          content: string;
        }>;
      }>("export:project:prosemirror", { projectId: "proj-1" });

      expect(result.ok).toBe(true);
      expect(result.data?.items.length).toBe(2);
      expect(result.data?.items[0].documentId).toBe("doc-1");
      expect(result.data?.items[0].content).toBe('{"type":"doc"}');
    });

    it("缺少 projectId 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>(
        "export:project:prosemirror",
        {},
      );
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── export:progress:get ──

  describe("export:progress:get", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:progress:get")).toBe(true);
    });

    it("返回 idle 状态（stub）", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        exportId: string;
        status: string;
        progress: number;
      }>("export:progress:get", {
        projectId: "proj-1",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe("idle");
      expect(result.data?.progress).toBe(0);
    });
  });

  // ── DB not ready ──

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

      const prosemirrorChannels = [
        "export:document:prosemirror",
        "export:project:prosemirror",
      ];

      for (const channel of prosemirrorChannels) {
        const handler = handlers.get(channel)!;
        const result = (await handler({ sender: { id: 1 } }, {
          projectId: "p",
          documentId: "d",
        })) as IpcResponse<never>;

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe("DB_ERROR");
      }
    });
  });

  // ── Existing export channels still work ──

  describe("已有导出通道兼容性", () => {
    it("export:document:markdown 仍然注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:document:markdown")).toBe(true);
    });

    it("export:project:bundle 仍然注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("export:project:bundle")).toBe(true);
    });
  });
});
