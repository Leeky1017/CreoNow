import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createIpcHarness(): {
  ipcMain: FakeIpcMain;
  handlers: Map<string, Handler>;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };
  return { ipcMain, handlers };
}

function createDbStub(): Database.Database {
  return {
    prepare: () => {
      throw new Error("db should not be touched for invalid payload");
    },
  } as unknown as Database.Database;
}

const malformedPayloads: unknown[] = [
  undefined,
  null,
  {},
  { projectId: 123 },
  { projectId: "   " },
];

{
  const logger = createLogger();
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: createDbStub(),
    logger,
  });

  const query = handlers.get("search:fts:query");
  assert.ok(query, "Missing handler search:fts:query");
  if (!query) {
    throw new Error("Missing handler search:fts:query");
  }

  for (const payload of malformedPayloads) {
    const response = (await query({}, payload)) as IpcResponse<unknown>;
    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.error.code, "INVALID_ARGUMENT");
      assert.equal(response.error.message, "projectId is required");
    }
  }
}

{
  const logger = createLogger();
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: createDbStub(),
    logger,
  });

  const reindex = handlers.get("search:fts:reindex");
  assert.ok(reindex, "Missing handler search:fts:reindex");
  if (!reindex) {
    throw new Error("Missing handler search:fts:reindex");
  }

  for (const payload of malformedPayloads) {
    const response = (await reindex({}, payload)) as IpcResponse<unknown>;
    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.error.code, "INVALID_ARGUMENT");
      assert.equal(response.error.message, "projectId is required");
    }
  }
}
