import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSimpleMemoryIpcHandlers } from "../simpleMemory";

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

  registerSimpleMemoryIpcHandlers({
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

describe("simple memory IPC handlers (P3)", () => {
  // ── memory:simple:write ──

  describe("memory:simple:write", () => {
    it("写入成功返回 MemoryRecord", async () => {
      const harness = createHarness();
      // Mock capacity check
      harness.stmtGet.mockReturnValueOnce({ count: 0 });

      const result = await harness.invoke<{
        id: string;
        projectId: string;
        key: string;
        value: string;
      }>("memory:simple:write", {
        projectId: "proj-1",
        key: "theme",
        value: "dark romance",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.key).toBe("theme");
      expect(result.data?.value).toBe("dark romance");
      expect(result.data?.id).toBeDefined();
    });

    it("空 key 返回 MEMORY_KEY_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:write", {
        projectId: "proj-1",
        key: "",
        value: "some value",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("MEMORY_KEY_REQUIRED");
    });

    it("未提供 key 返回 MEMORY_KEY_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:write", {
        projectId: "proj-1",
        value: "some value",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("MEMORY_KEY_REQUIRED");
    });

    it("空 value 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:write", {
        projectId: "proj-1",
        key: "test",
        value: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("非 object payload 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("memory:simple:write", null);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── memory:simple:read ──

  describe("memory:simple:read", () => {
    it("记录不存在返回 MEMORY_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:read", {
        projectId: "proj-1",
        id: "nonexistent",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("MEMORY_NOT_FOUND");
    });

    it("空 id 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:read", {
        projectId: "proj-1",
        id: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("读取其他项目的记忆返回 MEMORY_NOT_FOUND", async () => {
      const harness = createHarness();
      // First write a memory
      harness.stmtGet.mockReturnValueOnce({ count: 0 });
      const writeResult = await harness.invoke<{
        id: string;
        projectId: string;
      }>("memory:simple:write", {
        projectId: "proj-1",
        key: "test",
        value: "val",
      });

      expect(writeResult.ok).toBe(true);
      const memId = writeResult.data!.id;

      // Try to read with different projectId
      harness.stmtGet.mockReturnValueOnce(undefined);
      const result = await harness.invoke<never>("memory:simple:read", {
        projectId: "proj-other",
        id: memId,
      });

      // The read finds it in in-memory store but projectId doesn't match
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("MEMORY_NOT_FOUND");
    });
  });

  // ── memory:simple:delete ──

  describe("memory:simple:delete", () => {
    it("删除不存在的记录返回 MEMORY_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:delete", {
        projectId: "proj-1",
        id: "nonexistent",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("MEMORY_NOT_FOUND");
    });

    it("写入后删除成功", async () => {
      const harness = createHarness();
      harness.stmtGet.mockReturnValueOnce({ count: 0 });

      const writeResult = await harness.invoke<{
        id: string;
        projectId: string;
      }>("memory:simple:write", {
        projectId: "proj-1",
        key: "temp",
        value: "val",
      });

      expect(writeResult.ok).toBe(true);
      const memId = writeResult.data!.id;

      // Service read for ownership check will find in in-memory store
      const delResult = await harness.invoke<{ deleted: true }>(
        "memory:simple:delete",
        { projectId: "proj-1", id: memId },
      );

      expect(delResult.ok).toBe(true);
      expect(delResult.data?.deleted).toBe(true);
    });
  });

  // ── memory:simple:list ──

  describe("memory:simple:list", () => {
    it("空项目返回空列表", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ items: unknown[] }>(
        "memory:simple:list",
        { projectId: "proj-empty" },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.items).toEqual([]);
    });

    it("写入后列出", async () => {
      const harness = createHarness();
      harness.stmtGet.mockReturnValueOnce({ count: 0 });

      await harness.invoke("memory:simple:write", {
        projectId: "proj-1",
        key: "k1",
        value: "v1",
      });

      // list will try DB first (throws mock error), then fall back to in-memory
      harness.stmtAll.mockImplementationOnce(() => {
        throw new Error("mock: no real DB");
      });

      const result = await harness.invoke<{ items: Array<{ key: string }> }>(
        "memory:simple:list",
        { projectId: "proj-1" },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.items.length).toBeGreaterThanOrEqual(1);
      expect(result.data?.items.some((i) => i.key === "k1")).toBe(true);
    });
  });

  // ── memory:simple:inject ──

  describe("memory:simple:inject", () => {
    it("空 documentText 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:inject", {
        projectId: "proj-1",
        documentText: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("注入成功返回 MemoryInjection", async () => {
      const harness = createHarness();

      // Mock DB query for records
      harness.stmtAll.mockReturnValueOnce([]);

      const result = await harness.invoke<{
        records: unknown[];
        injectedText: string;
        tokenCount: number;
        degraded: boolean;
      }>("memory:simple:inject", {
        projectId: "proj-1",
        documentText: "Some story text",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.records).toBeDefined();
      expect(typeof result.data?.tokenCount).toBe("number");
    });
  });

  // ── memory:simple:clearproject ──

  describe("memory:simple:clearproject", () => {
    it("清空成功", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ cleared: true }>(
        "memory:simple:clearproject",
        { projectId: "proj-1", confirmed: true },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.cleared).toBe(true);
    });

    it("未确认时返回错误", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("memory:simple:clearproject", {
        projectId: "proj-1",
        confirmed: false,
      });

      expect(result.ok).toBe(false);
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

      registerSimpleMemoryIpcHandlers({
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
        "memory:simple:write",
        "memory:simple:read",
        "memory:simple:delete",
        "memory:simple:list",
        "memory:simple:inject",
        "memory:simple:clearproject",
      ];

      for (const channel of channels) {
        const handler = handlers.get(channel)!;
        const result = (await handler({ sender: { id: 1 } }, {
          projectId: "p",
          key: "k",
          value: "v",
          id: "id",
          documentText: "text",
        })) as IpcResponse<never>;

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe("DB_ERROR");
      }
    });
  });
});
