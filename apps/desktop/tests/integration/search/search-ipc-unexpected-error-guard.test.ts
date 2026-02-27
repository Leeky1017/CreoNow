import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import type { Logger } from "../../../main/src/logging/logger";
import type { HybridRankingService } from "../../../main/src/services/search/hybridRankingService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type LoggedError = {
  event: string;
  payload: unknown;
};

function createLogger(loggedErrors: LoggedError[]): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: (event, payload) => {
      loggedErrors.push({ event, payload });
    },
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

function createThrowingDb(): Database.Database {
  return {
    prepare: () => {
      throw new Error("unexpected sqlite failure");
    },
  } as unknown as Database.Database;
}

{
  const loggedErrors: LoggedError[] = [];
  const logger = createLogger(loggedErrors);
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: createThrowingDb(),
    logger,
  });

  const ftsQuery = handlers.get("search:fts:query");
  assert.ok(ftsQuery, "Missing handler search:fts:query");
  if (!ftsQuery) {
    throw new Error("Missing handler search:fts:query");
  }

  const queryRes = (await ftsQuery(
    {},
    { projectId: "proj_1", query: "hero" },
  )) as IpcResponse<unknown>;
  assert.equal(queryRes.ok, false);
  if (!queryRes.ok) {
    assert.equal(queryRes.error.code, "DB_ERROR");
  }

  const ftsReindex = handlers.get("search:fts:reindex");
  assert.ok(ftsReindex, "Missing handler search:fts:reindex");
  if (!ftsReindex) {
    throw new Error("Missing handler search:fts:reindex");
  }

  const reindexRes = (await ftsReindex(
    {},
    { projectId: "proj_1" },
  )) as IpcResponse<unknown>;
  assert.equal(reindexRes.ok, false);
  if (!reindexRes.ok) {
    assert.equal(reindexRes.error.code, "DB_ERROR");
  }

  const errorEvents = loggedErrors.map((item) => item.event);
  assert.ok(errorEvents.includes("fts_search_failed"));
  assert.ok(errorEvents.includes("search_fts_reindex_failed"));
}

{
  const loggedErrors: LoggedError[] = [];
  const logger = createLogger(loggedErrors);
  const { ipcMain, handlers } = createIpcHarness();

  const hybridRankingService: HybridRankingService = {
    queryByStrategy: () => {
      throw new Error("strategy failed unexpectedly");
    },
    rankExplain: () => {
      throw new Error("explain failed unexpectedly");
    },
  };

  registerSearchIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: createThrowingDb(),
    logger,
    hybridRankingService,
  });

  const queryByStrategy = handlers.get("search:query:strategy");
  assert.ok(queryByStrategy, "Missing handler search:query:strategy");
  if (!queryByStrategy) {
    throw new Error("Missing handler search:query:strategy");
  }

  const strategyRes = (await queryByStrategy(
    {},
    {
      projectId: "proj_1",
      query: "hero",
      strategy: "hybrid",
    },
  )) as IpcResponse<unknown>;
  assert.equal(strategyRes.ok, false);
  if (!strategyRes.ok) {
    assert.equal(strategyRes.error.code, "INTERNAL_ERROR");
    assert.equal(strategyRes.error.message, "Internal error");
  }

  const rankExplain = handlers.get("search:rank:explain");
  assert.ok(rankExplain, "Missing handler search:rank:explain");
  if (!rankExplain) {
    throw new Error("Missing handler search:rank:explain");
  }

  const explainRes = (await rankExplain(
    {},
    {
      projectId: "proj_1",
      query: "hero",
      strategy: "hybrid",
    },
  )) as IpcResponse<unknown>;
  assert.equal(explainRes.ok, false);
  if (!explainRes.ok) {
    assert.equal(explainRes.error.code, "INTERNAL_ERROR");
    assert.equal(explainRes.error.message, "Internal error");
  }

  const errorEvents = loggedErrors.map((item) => item.event);
  assert.ok(errorEvents.includes("search_query_strategy_exception"));
  assert.ok(errorEvents.includes("search_rank_explain_exception"));
}
