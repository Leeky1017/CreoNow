import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSettingsIpcHandlers } from "../settings";

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

  const rows: Record<string, unknown>[] = [];
  const stmtRun = vi.fn();
  const stmtGet = vi.fn((..._args: unknown[]) => undefined as Record<string, unknown> | undefined);
  const stmtAll = vi.fn((..._args: unknown[]) => {
    throw new Error("mock: no real DB");
  });

  const db = {
    prepare: vi.fn(() => ({
      run: stmtRun,
      get: stmtGet,
      all: stmtAll,
    })),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
  };

  registerSettingsIpcHandlers({
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
    rows,
  };
}

describe("settings IPC handlers", () => {
  describe("settings:character:create", () => {
    it("创建角色成功", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        id: string;
        projectId: string;
        name: string;
        description: string;
        attributes: Record<string, string>;
      }>("settings:character:create", {
        projectId: "proj-1",
        name: "林远",
        description: "冷静的主角",
        attributes: { trait: "冷静" },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("林远");
      expect(result.data?.projectId).toBe("proj-1");
      expect(result.data?.description).toBe("冷静的主角");
      expect(result.data?.attributes).toEqual({ trait: "冷静" });
      expect(result.data?.id).toBeDefined();
    });

    it("空名称返回 CHARACTER_NAME_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:create", {
        projectId: "proj-1",
        name: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_REQUIRED");
    });

    it("未提供名称返回 CHARACTER_NAME_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:create", {
        projectId: "proj-1",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_REQUIRED");
    });

    it("重名角色返回 CHARACTER_NAME_DUPLICATE", async () => {
      const harness = createHarness();

      await harness.invoke("settings:character:create", {
        projectId: "proj-1",
        name: "林远",
      });

      const result = await harness.invoke<never>("settings:character:create", {
        projectId: "proj-1",
        name: "林远",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_DUPLICATE");
    });
  });

  describe("settings:character:read", () => {
    it("读取已创建的角色成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<{ id: string; name: string }>(
        "settings:character:read",
        { projectId: "proj-1", id: created.data!.id },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("林远");
    });

    it("不存在的 ID 返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:read", {
        projectId: "proj-1",
        id: "nonexistent-id",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("空 ID 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:read", {
        projectId: "proj-1",
        id: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  describe("settings:character:update", () => {
    it("更新角色成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<{ name: string; description: string }>(
        "settings:character:update",
        {
          projectId: "proj-1",
          id: created.data!.id,
          name: "林远（改名）",
          description: "沉稳的主角",
        },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("林远（改名）");
      expect(result.data?.description).toBe("沉稳的主角");
    });

    it("不存在的 ID 返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:update", {
        projectId: "proj-1",
        id: "nonexistent",
        name: "test",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("更新名称为已存在的名称返回 CHARACTER_NAME_DUPLICATE", async () => {
      const harness = createHarness();

      await harness.invoke("settings:character:create", {
        projectId: "proj-1",
        name: "Alice",
      });

      const res2 = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "Bob" },
      );

      const result = await harness.invoke<never>("settings:character:update", {
        projectId: "proj-1",
        id: res2.data!.id,
        name: "Alice",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_DUPLICATE");
    });
  });

  describe("settings:character:delete", () => {
    it("删除角色成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<{ deleted: true }>(
        "settings:character:delete",
        { projectId: "proj-1", id: created.data!.id },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
    });

    it("不存在的 ID 返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:character:delete", {
        projectId: "proj-1",
        id: "nonexistent",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });
  });

  describe("settings:character:list", () => {
    it("列出角色返回数组", async () => {
      const harness = createHarness();

      await harness.invoke("settings:character:create", {
        projectId: "proj-1",
        name: "林远",
      });

      await harness.invoke("settings:character:create", {
        projectId: "proj-1",
        name: "林小雨",
      });

      const result = await harness.invoke<{
        items: Array<{ name: string }>;
      }>("settings:character:list", { projectId: "proj-1" });

      expect(result.ok).toBe(true);
      expect(result.data?.items).toHaveLength(2);
    });
  });

  describe("projectId ownership guard", () => {
    it("character:read 跨项目返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<never>("settings:character:read", {
        projectId: "proj-other",
        id: created.data!.id,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("character:update 跨项目返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<never>("settings:character:update", {
        projectId: "proj-other",
        id: created.data!.id,
        name: "新名字",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("character:delete 跨项目返回 CHARACTER_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:character:create",
        { projectId: "proj-1", name: "林远" },
      );

      const result = await harness.invoke<never>("settings:character:delete", {
        projectId: "proj-other",
        id: created.data!.id,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("location:read 跨项目返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<never>("settings:location:read", {
        projectId: "proj-other",
        id: created.data!.id,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });

    it("location:update 跨项目返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<never>("settings:location:update", {
        projectId: "proj-other",
        id: created.data!.id,
        name: "新地点",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });

    it("location:delete 跨项目返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<never>("settings:location:delete", {
        projectId: "proj-other",
        id: created.data!.id,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });
  });

  describe("settings:location:create", () => {
    it("创建地点成功", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        id: string;
        name: string;
        projectId: string;
      }>("settings:location:create", {
        projectId: "proj-1",
        name: "废弃仓库",
        description: "位于城市边缘",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("废弃仓库");
      expect(result.data?.projectId).toBe("proj-1");
    });

    it("空名称返回 LOCATION_NAME_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:create", {
        projectId: "proj-1",
        name: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_REQUIRED");
    });

    it("未提供名称返回 LOCATION_NAME_REQUIRED", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:create", {
        projectId: "proj-1",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_REQUIRED");
    });

    it("重名地点返回 LOCATION_NAME_DUPLICATE", async () => {
      const harness = createHarness();

      await harness.invoke("settings:location:create", {
        projectId: "proj-1",
        name: "废弃仓库",
      });

      const result = await harness.invoke<never>("settings:location:create", {
        projectId: "proj-1",
        name: "废弃仓库",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_DUPLICATE");
    });
  });

  describe("settings:location:read", () => {
    it("读取已创建的地点成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<{ id: string; name: string }>(
        "settings:location:read",
        { projectId: "proj-1", id: created.data!.id },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("废弃仓库");
    });

    it("不存在的 ID 返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:read", {
        projectId: "proj-1",
        id: "nonexistent-id",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });

    it("空 ID 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:read", {
        projectId: "proj-1",
        id: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  describe("settings:location:update", () => {
    it("更新地点成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<{ name: string }>(
        "settings:location:update",
        {
          projectId: "proj-1",
          id: created.data!.id,
          name: "旧仓库",
        },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe("旧仓库");
    });

    it("不存在的 ID 返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:update", {
        projectId: "proj-1",
        id: "nonexistent",
        name: "test",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });

    it("更新名称为已存在的名称返回 LOCATION_NAME_DUPLICATE", async () => {
      const harness = createHarness();

      await harness.invoke("settings:location:create", {
        projectId: "proj-1",
        name: "Forest",
      });

      const res2 = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "Castle" },
      );

      const result = await harness.invoke<never>("settings:location:update", {
        projectId: "proj-1",
        id: res2.data!.id,
        name: "Forest",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_DUPLICATE");
    });
  });

  describe("settings:location:delete", () => {
    it("删除地点成功", async () => {
      const harness = createHarness();

      const created = await harness.invoke<{ id: string }>(
        "settings:location:create",
        { projectId: "proj-1", name: "废弃仓库" },
      );

      const result = await harness.invoke<{ deleted: true }>(
        "settings:location:delete",
        { projectId: "proj-1", id: created.data!.id },
      );

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
    });

    it("不存在的 ID 返回 LOCATION_NOT_FOUND", async () => {
      const harness = createHarness();

      const result = await harness.invoke<never>("settings:location:delete", {
        projectId: "proj-1",
        id: "nonexistent",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });
  });

  describe("settings:location:list", () => {
    it("列出地点返回数组", async () => {
      const harness = createHarness();

      await harness.invoke("settings:location:create", {
        projectId: "proj-1",
        name: "废弃仓库",
      });

      await harness.invoke("settings:location:create", {
        projectId: "proj-1",
        name: "古堡",
      });

      const result = await harness.invoke<{
        items: Array<{ name: string }>;
      }>("settings:location:list", { projectId: "proj-1" });

      expect(result.ok).toBe(true);
      expect(result.data?.items).toHaveLength(2);
    });
  });

  describe("handler registration", () => {
    it("注册了所有 10 个 settings 通道", () => {
      const harness = createHarness();

      const expectedChannels = [
        "settings:character:create",
        "settings:character:read",
        "settings:character:update",
        "settings:character:delete",
        "settings:character:list",
        "settings:location:create",
        "settings:location:read",
        "settings:location:update",
        "settings:location:delete",
        "settings:location:list",
      ];

      for (const channel of expectedChannels) {
        expect(
          harness.handlers.has(channel),
          `missing handler: ${channel}`,
        ).toBe(true);
      }
    });
  });

  describe("project access guard", () => {
    it("没有 projectSessionBinding 时通过", async () => {
      const handlers = new Map<string, Handler>();

      const ipcMain = {
        handle: (channel: string, listener: Handler) => {
          handlers.set(channel, listener);
        },
      } as unknown as IpcMain;

      const db = {
        prepare: vi.fn(() => ({
          run: vi.fn(),
          get: vi.fn(() => undefined),
          all: vi.fn(() => []),
        })),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      };

      registerSettingsIpcHandlers({
        ipcMain,
        db: db as never,
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        } as never,
      });

      const handler = handlers.get("settings:character:create")!;
      const result = (await handler(
        { sender: { id: 1 } },
        { projectId: "proj-1", name: "test" },
      )) as IpcResponse<unknown>;

      expect(result.ok).toBe(true);
    });
  });

  describe("DB not ready", () => {
    it("DB 为 null 时返回 DB_ERROR", async () => {
      const handlers = new Map<string, Handler>();

      const ipcMain = {
        handle: (channel: string, listener: Handler) => {
          handlers.set(channel, listener);
        },
      } as unknown as IpcMain;

      registerSettingsIpcHandlers({
        ipcMain,
        db: null,
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        } as never,
      });

      const handler = handlers.get("settings:character:create")!;
      const result = (await handler(
        { sender: { id: 1 } },
        { projectId: "proj-1", name: "test" },
      )) as IpcResponse<unknown>;

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("DB_ERROR");
    });
  });
});
