import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import { createRuntimeEventBus } from "../runtimeEventBus";
import { registerSettingsIpcHandlers } from "../settings";
import { registerSimpleMemoryIpcHandlers } from "../simpleMemory";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness() {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      attributes TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE memory (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const eventBus = createRuntimeEventBus();

  registerSettingsIpcHandlers({
    ipcMain,
    db,
    logger: logger as never,
    eventBus,
  });
  registerSimpleMemoryIpcHandlers({
    ipcMain,
    db,
    logger: logger as never,
    eventBus,
  });

  return {
    db,
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return (await handler({ sender: { id: 1 } }, payload)) as T;
    },
  };
}

describe("settings/simple-memory integration", () => {
  it("共享 eventBus 后，Settings 角色与地点可经真实 IPC 链路注入 simple memory", async () => {
    const harness = createHarness();

    await harness.invoke("settings:character:create", {
      projectId: "proj-1",
      name: "林远",
      description: "沉静的侦探",
    });
    await harness.invoke("settings:location:create", {
      projectId: "proj-1",
      name: "旧港码头",
      description: "风很冷的案发地",
    });

    const injected = (await harness.invoke("memory:simple:inject", {
      projectId: "proj-1",
      documentText: "林远又一次来到旧港码头。",
      tokenBudget: 200,
    })) as {
      ok: boolean;
      data?: { injectedText: string; records: Array<{ key: string }> };
    };

    expect(injected.ok).toBe(true);
    expect(injected.data?.records.map((record) => record.key)).toEqual(
      expect.arrayContaining(["char:林远", "loc:旧港码头"]),
    );
    expect(injected.data?.injectedText).toContain("沉静的侦探");
    expect(injected.data?.injectedText).toContain("风很冷的案发地");
  });
});
