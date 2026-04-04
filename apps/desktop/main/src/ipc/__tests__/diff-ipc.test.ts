import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerDiffIpcHandlers } from "../diff";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

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

  registerDiffIpcHandlers({
    ipcMain,
    logger: logger as never,
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler({}, payload)) as T;
    },
    logger,
  };
}

describe("diff IPC handlers", () => {
  describe("version:diff:transaction", () => {
    it("正常 diff 返回步骤", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        ok: boolean;
        data: { steps: unknown[]; stats: { totalChanges: number } };
      }>("version:diff:transaction", {
        before: "hello world",
        after: "hello there",
      });

      expect(result.ok).toBe(true);
      expect(result.data.steps).toEqual([
        {
          type: "replace",
          from: 6,
          to: 8,
          text: "the",
        },
        {
          type: "replace",
          from: 9,
          to: 11,
          text: "e",
        },
      ]);
      expect(result.data.stats.totalChanges).toBe(2);
    });

    it("相同文本返回空步骤", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        ok: boolean;
        data: { steps: unknown[] };
      }>("version:diff:transaction", {
        before: "same",
        after: "same",
      });

      expect(result.ok).toBe(true);
      expect(result.data.steps).toHaveLength(0);
    });

    it("缺少 payload 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        ok: boolean;
        error: { code: string };
      }>("version:diff:transaction");

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("非字符串参数返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        ok: boolean;
        error: { code: string };
      }>("version:diff:transaction", { before: 123, after: "text" });

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });
  });
});
