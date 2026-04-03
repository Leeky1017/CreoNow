import { describe, expect, it } from "vitest";
import type { IpcMain } from "electron";

import { registerVersionIpcHandlers } from "../version";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createIpcHarness(): {
  handlers: Map<string, Handler>;
  ipcMain: IpcMain;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;
  return { handlers, ipcMain };
}

describe("registerVersionIpcHandlers P1 phase cut", () => {
  it("does not register branch or conflict IPC channels", () => {
    const harness = createIpcHarness();

    registerVersionIpcHandlers({
      ipcMain: harness.ipcMain,
      db: null,
      logger: {
        logPath: "<test>",
        info: () => {},
        error: () => {},
      },
    });

    for (const channel of [
      "version:branch:create",
      "version:branch:list",
      "version:branch:switch",
      "version:branch:merge",
      "version:conflict:resolve",
      "version:aiapply:logconflict",
    ]) {
      expect(harness.handlers.has(channel)).toBe(false);
    }
  });
});
