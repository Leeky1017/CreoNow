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
  const prepare = (sql: string) => {
    if (sql.includes("DELETE FROM documents_fts")) {
      return {
        run: () => ({ changes: 0 }),
      };
    }

    if (sql.includes("INSERT OR REPLACE INTO documents_fts")) {
      return {
        run: () => {
          throw new Error("disk I/O error while rebuilding index");
        },
      };
    }

    return {
      all: () => [],
      get: () => ({ total: 0 }),
      run: () => ({ changes: 0 }),
    };
  };

  return { prepare } as unknown as Database.Database;
}

// Scenario Mapping: SR5-R2-S1
{
  const logger = createLogger();
  const db = createDbStub();
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
  });

  const reindex = handlers.get("search:fts:reindex");
  assert.ok(reindex, "Missing handler search:fts:reindex");
  if (!reindex) {
    throw new Error("Missing handler search:fts:reindex");
  }

  const res = (await reindex(
    {},
    {
      projectId: "proj_1",
    },
  )) as IpcResponse<unknown>;

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "SEARCH_REINDEX_IO_ERROR");
    assert.equal(res.error.retryable, true);
  }
}
