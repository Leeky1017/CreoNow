import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSearchIpcHandlers } from "../search";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness() {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerSearchIpcHandlers({
    ipcMain,
    db: {
      prepare: vi.fn(() => ({
        all: vi.fn(() => []),
        get: vi.fn(() => undefined),
        run: vi.fn(),
      })),
      exec: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn),
    } as never,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never,
  });

  return handlers;
}

describe("search IPC canonical surface", () => {
  it("只暴露 search:fts:* 通道，不再保留 search:project:* 双轨 surface", () => {
    const handlers = createHarness();

    expect(handlers.has("search:fts:query")).toBe(true);
    expect(handlers.has("search:fts:reindex")).toBe(true);
    expect(handlers.has("search:project:query")).toBe(false);
    expect(handlers.has("search:project:reindex")).toBe(false);
    expect(handlers.has("search:project:indexstatus")).toBe(false);
  });
});
