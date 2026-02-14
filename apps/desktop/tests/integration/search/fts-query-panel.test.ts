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

function createDbStub(): Database.Database {
  const rows: FtsRow[] = [
    {
      projectId: "proj_1",
      documentId: "doc_1",
      documentTitle: "Chapter One",
      documentType: "chapter",
      snippet: "Hero enters the archive room.",
      score: 1.4,
      updatedAt: 1739030400,
    },
    {
      projectId: "proj_1",
      documentId: "doc_2",
      documentTitle: "Chapter Two",
      documentType: "chapter",
      snippet: "A hidden hero clue appears.",
      score: 1.1,
      updatedAt: 1739030401,
    },
  ];

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: rows.length }),
      };
    }

    return {
      all: (
        _projectId: string,
        _query: string,
        limit: number,
        offset: number,
      ) => rows.slice(offset, offset + limit),
    };
  };

  return { prepare } as unknown as Database.Database;
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

  const handler = handlers.get("search:fts:query");
  assert.ok(handler, "Missing handler search:fts:query");

  const res = (await handler(
    {},
    { projectId: "proj_1", query: "hero", limit: 10, offset: 0 },
  )) as IpcResponse<{
    results: Array<{
      projectId: string;
      documentId: string;
      documentTitle: string;
      documentType: string;
      snippet: string;
      highlights: Array<{ start: number; end: number }>;
      anchor: { start: number; end: number };
      score: number;
      updatedAt: number;
    }>;
    total: number;
    hasMore: boolean;
    indexState: "ready" | "rebuilding";
  }>;

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.indexState, "ready");
    assert.equal(res.data.total, 2);
    assert.equal(res.data.hasMore, false);
    assert.equal(res.data.results.length, 2);

    const first = res.data.results[0];
    const second = res.data.results[1];
    assert.equal(first?.documentId, "doc_1");
    assert.equal(first?.documentTitle, "Chapter One");
    assert.equal(first?.documentType, "chapter");
    assert.ok((first?.highlights.length ?? 0) > 0);
    assert.ok((first?.anchor.start ?? -1) >= 0);
    assert.ok((first?.anchor.end ?? -1) > (first?.anchor.start ?? 0));
    assert.ok((first?.score ?? 0) >= (second?.score ?? 0));
  }
}
