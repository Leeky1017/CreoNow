import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../main/src/ipc/search";
import type { Logger } from "../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

/**
 * Create a no-op logger.
 *
 * Why: IPC handlers require an explicit logger dependency.
 */
function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

/**
 * Create a minimal `ipcMain.handle` harness for integration tests.
 */
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

/**
 * Create a minimal DB stub for FTS tests.
 *
 * Why: CI/runtime Node module versions differ from Electron; integration tests
 * must not depend on native `better-sqlite3` binaries.
 */
function createDbStub(): Database.Database {
  const prepare = () => {
    return {
      all: (_projectId: string, query: string, limit: number) => {
        if (query.startsWith('"')) {
          throw new Error('fts5: syntax error near "hello"');
        }
        return [
          {
            documentId: "doc_1",
            title: "Doc One",
            snippet: "hello world",
            score: 1,
          },
        ].slice(0, limit);
      },
    };
  };

  return { prepare } as unknown as Database.Database;
}

const logger = createLogger();
const db = createDbStub();
const { ipcMain, handlers } = createIpcHarness();

registerSearchIpcHandlers({
  ipcMain: ipcMain as unknown as IpcMain,
  db,
  logger,
});

const handler = handlers.get("search:fulltext");
assert.ok(handler, "Missing handler search:fulltext");

const okRes = (await handler({}, { projectId: "proj_1", query: "hello" })) as
  | IpcResponse<{ items: unknown[] }>
  | undefined;
assert.ok(okRes, "Missing response");
assert.equal(okRes.ok, true);

const invalid = (await handler(
  {},
  { projectId: "proj_1", query: '"hello' },
)) as IpcResponse<unknown> | undefined;
assert.ok(invalid, "Missing response");
assert.equal(invalid.ok, false);
if (!invalid.ok) {
  assert.equal(invalid.error.code, "INVALID_ARGUMENT");
  assert.equal(invalid.error.message, "Invalid fulltext query syntax");
}
