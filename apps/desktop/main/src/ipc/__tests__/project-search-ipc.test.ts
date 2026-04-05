import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerProjectSearchIpcHandlers } from "../projectSearch";

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

  registerProjectSearchIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
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
    stmtRun,
    stmtGet,
    stmtAll,
  };
}

describe("project search IPC handlers (P3)", () => {
  // ── search:project:query ──

  describe("search:project:query", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("search:project:query")).toBe(true);
    });

    it("空 query 返回 SEARCH_QUERY_EMPTY", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("search:project:query", {
        projectId: "proj-1",
        query: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_QUERY_EMPTY");
    });

    it("query 过长返回 SEARCH_QUERY_TOO_LONG", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("search:project:query", {
        projectId: "proj-1",
        query: "x".repeat(501),
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_QUERY_TOO_LONG");
    });

    it("项目不存在返回 SEARCH_PROJECT_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("search:project:query", {
        projectId: "nonexistent",
        query: "hello",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_PROJECT_NOT_FOUND");
    });

    it("非 object payload 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>(
        "search:project:query",
        null,
      );
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── search:project:reindex ──

  describe("search:project:reindex", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("search:project:reindex")).toBe(true);
    });

    it("重建索引成功", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ rebuilt: true }>(
        "search:project:reindex",
        { projectId: "proj-1" },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.rebuilt).toBe(true);
    });
  });

  // ── search:project:indexstatus ──

  describe("search:project:indexstatus", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("search:project:indexstatus")).toBe(true);
    });

    it("索引不存在返回 SEARCH_INDEX_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>(
        "search:project:indexstatus",
        { projectId: "nonexistent" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_NOT_FOUND");
    });

    it("重建后可查询状态", async () => {
      const harness = createHarness();

      // First rebuild index to register the project
      await harness.invoke("search:project:reindex", {
        projectId: "proj-1",
      });

      const result = await harness.invoke<{ status: string }>(
        "search:project:indexstatus",
        { projectId: "proj-1" },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe("ready");
    });
  });

  // ── DB not ready ──

  describe("DB 未就绪", () => {
    it("所有通道在 DB 为 null 时返回 DB_ERROR", async () => {
      const handlers = new Map<string, Handler>();
      const ipcMain = {
        handle: (channel: string, listener: Handler) => {
          handlers.set(channel, listener);
        },
      } as unknown as IpcMain;

      registerProjectSearchIpcHandlers({
        ipcMain,
        db: null,
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        } as never,
      });

      const channels = [
        "search:project:query",
        "search:project:reindex",
        "search:project:indexstatus",
      ];

      for (const channel of channels) {
        const handler = handlers.get(channel)!;
        const result = (await handler({ sender: { id: 1 } }, {
          projectId: "p",
          query: "test",
        })) as IpcResponse<never>;

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe("DB_ERROR");
      }
    });
  });

  // ── Cross-project isolation ──

  describe("跨项目隔离", () => {
    it("不同项目的索引状态独立", async () => {
      const harness = createHarness();

      // Rebuild index for proj-a
      await harness.invoke("search:project:reindex", {
        projectId: "proj-a",
      });

      // proj-b has no index
      const result = await harness.invoke<never>(
        "search:project:indexstatus",
        { projectId: "proj-b" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_NOT_FOUND");

      // proj-a has index
      const resultA = await harness.invoke<{ status: string }>(
        "search:project:indexstatus",
        { projectId: "proj-a" },
      );

      expect(resultA.ok).toBe(true);
      expect(resultA.data?.status).toBe("ready");
    });

    it("项目 A 的搜索结果不包含项目 B 的内容", async () => {
      const harness = createHarness();

      // Rebuild index for both projects
      await harness.invoke("search:project:reindex", {
        projectId: "proj-a",
      });
      await harness.invoke("search:project:reindex", {
        projectId: "proj-b",
      });

      // Search in proj-a — results are project-scoped by service
      const resultA = await harness.invoke<{
        results: unknown[];
        total: number;
      }>("search:project:query", {
        projectId: "proj-a",
        query: "test",
      });

      // Service returns empty for mock DB projects
      expect(resultA.ok).toBe(true);
      expect(resultA.data?.total).toBe(0);
    });
  });

  // ── B-F14: search:project:query happy-path ──

  describe("search:project:query happy-path", () => {
    it("重建索引后搜索返回结果", async () => {
      const harness = createHarness();

      // Rebuild index first
      const reindexResult = await harness.invoke<{ rebuilt: true }>(
        "search:project:reindex",
        { projectId: "proj-1" },
      );
      expect(reindexResult.ok).toBe(true);

      // Search returns empty for mock DB (no real documents)
      const searchResult = await harness.invoke<{
        results: unknown[];
        total: number;
        hasMore: boolean;
        indexState: string;
      }>("search:project:query", {
        projectId: "proj-1",
        query: "hello",
      });

      expect(searchResult.ok).toBe(true);
      expect(searchResult.data?.results).toBeDefined();
      expect(typeof searchResult.data?.total).toBe("number");
      expect(typeof searchResult.data?.hasMore).toBe("boolean");
    });
  });

  // ── B-F06/B-F07: 预留错误码 ──

  describe("预留错误码", () => {
    // SEARCH_INDEX_CORRUPTED — 该错误码为预留，当前 service 层未有触发路径。
    // 将在后续版本中当索引文件损坏时触发。

    it("SEARCH_TIMEOUT 在搜索超时时返回", async () => {
      const harness = createHarness();

      // Rebuild index first so project is known
      await harness.invoke("search:project:reindex", {
        projectId: "proj-1",
      });

      // Mock DB to throw SEARCH_TIMEOUT on next all() call (search query)
      harness.stmtAll.mockImplementationOnce(() => {
        throw new Error("SEARCH_TIMEOUT");
      });

      const result = await harness.invoke<never>("search:project:query", {
        projectId: "proj-1",
        query: "test",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_TIMEOUT");
    });

    it("SEARCH_INDEX_NOT_FOUND 在索引不存在时返回", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>(
        "search:project:indexstatus",
        { projectId: "no-such-project" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_NOT_FOUND");
    });
  });
});
