import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type FtsRow = {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  snippet: string;
  score: number;
  updatedAt: number;
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

function createDbStub(): Database.Database & {
  getReindexCount: () => number;
} {
  const rows: FtsRow[] = [
    {
      projectId: "proj_1",
      documentId: "doc_99",
      documentTitle: "Recovered Chapter",
      documentType: "chapter",
      snippet: "Recovered index for hero query.",
      score: 0.8,
      updatedAt: 1739030400,
    },
  ];

  let shouldCorruptNextQuery = true;
  let reindexCount = 0;

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: rows.length }),
      };
    }

    if (sql.includes("DELETE FROM documents_fts")) {
      return {
        run: () => {
          reindexCount += 1;
          return { changes: 1 };
        },
      };
    }

    if (sql.includes("INSERT OR REPLACE INTO documents_fts")) {
      return {
        run: () => ({ changes: 1 }),
      };
    }

    return {
      all: (_projectId: string, _query: string, _limit: number, _offset: number) => {
        if (shouldCorruptNextQuery) {
          shouldCorruptNextQuery = false;
          throw new Error("database disk image is malformed");
        }
        return rows;
      },
    };
  };

  const db = { prepare } as unknown as Database.Database & {
    getReindexCount: () => number;
  };
  db.getReindexCount = () => reindexCount;
  return db;
}

{
  const logger = createLogger();
  const db = createDbStub();
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
  });

  const query = handlers.get("search:fts:query");
  assert.ok(query, "Missing handler search:fts:query");

  const reindex = handlers.get("search:fts:reindex");
  assert.ok(reindex, "Missing handler search:fts:reindex");

  const firstRes = (await query(
    {},
    { projectId: "proj_1", query: "hero", limit: 10, offset: 0 },
  )) as IpcResponse<{
    results: unknown[];
    total: number;
    hasMore: boolean;
    indexState: "ready" | "rebuilding";
  }>;
  assert.equal(firstRes.ok, true);
  if (firstRes.ok) {
    assert.equal(firstRes.data.indexState, "rebuilding");
    assert.equal(firstRes.data.results.length, 0);
  }
  assert.equal(db.getReindexCount(), 1);

  const secondRes = (await query(
    {},
    { projectId: "proj_1", query: "hero", limit: 10, offset: 0 },
  )) as IpcResponse<{
    results: unknown[];
    indexState: "ready" | "rebuilding";
  }>;
  assert.equal(secondRes.ok, true);
  if (secondRes.ok) {
    assert.equal(secondRes.data.indexState, "ready");
    assert.equal(secondRes.data.results.length, 1);
  }
}
