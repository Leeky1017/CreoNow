import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";
import { registerRagIpcHandlers } from "../../main/src/ipc/rag";
import { createEmbeddingService } from "../../main/src/services/embedding/embeddingService";
import type { Logger } from "../../main/src/logging/logger";

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

type FulltextRow = {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  snippet: string;
  score: number;
  updatedAt: number;
};

/**
 * Create a DB stub that returns deterministic FTS results by query.
 *
 * Why: integration tests must not depend on native `better-sqlite3` binaries.
 */
function createDbStub(): Database.Database {
  const docA: FulltextRow = {
    projectId: "proj_1",
    documentId: "doc_a",
    documentTitle: "Doc A",
    documentType: "chapter",
    snippet: "foo foo foo",
    score: 2,
    updatedAt: 1739030400,
  };
  const docB: FulltextRow = {
    projectId: "proj_1",
    documentId: "doc_b",
    documentTitle: "Doc B",
    documentType: "chapter",
    snippet: "foo bar",
    score: 1,
    updatedAt: 1739030401,
  };

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: (_projectId: string, query: string) => {
          const q = query.trim();
          if (q === "foo") {
            return { total: 2 };
          }
          if (q === "foo bar" || q === '"foo bar"') {
            return { total: 1 };
          }
          if (q === "foo OR bar") {
            return { total: 2 };
          }
          return { total: 0 };
        },
      };
    }

    return {
      all: (
        _projectId: string,
        query: string,
        limit: number,
        _offset: number,
      ) => {
        const q = query.trim();
        if (q === "foo") {
          return [docA, docB].slice(0, limit);
        }
        if (q === "foo bar" || q === '"foo bar"') {
          return [docB].slice(0, limit);
        }
        if (q === "foo OR bar") {
          return [docA, docB].slice(0, limit);
        }
        return [];
      },
    };
  };

  return { prepare } as unknown as Database.Database;
}

{
  const logger = createLogger();
  const db = createDbStub();
  const embedding = createEmbeddingService({ logger });
  const { ipcMain, handlers } = createIpcHarness();

  registerRagIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    embedding,
    ragRerank: { enabled: true },
  });

  const handler = handlers.get("rag:context:retrieve");
  assert.ok(handler, "Missing handler rag:context:retrieve");

  const res = (await handler(
    {},
    { projectId: "proj_1", queryText: "foo bar", limit: 2, budgetTokens: 200 },
  )) as IpcResponse<{
    items: Array<{ sourceRef: string }>;
    diagnostics: {
      mode: string;
      rerank: { enabled: boolean; reason?: string };
    };
  }>;

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.diagnostics.mode, "fulltext");
    assert.equal(res.data.diagnostics.rerank.enabled, false);
    assert.equal(res.data.diagnostics.rerank.reason, "MODEL_NOT_READY");
    assert.equal(res.data.items[0]?.sourceRef, "doc:doc_a#chunk:0");
  }
}

{
  const logger = createLogger();
  const db = createDbStub();
  const embedding = createEmbeddingService({ logger });
  const { ipcMain, handlers } = createIpcHarness();

  registerRagIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    embedding,
    ragRerank: { enabled: true, model: "hash-v1" },
  });

  const handler = handlers.get("rag:context:retrieve");
  assert.ok(handler, "Missing handler rag:context:retrieve");

  const res = (await handler(
    {},
    { projectId: "proj_1", queryText: "foo bar", limit: 2, budgetTokens: 200 },
  )) as IpcResponse<{
    items: Array<{ sourceRef: string }>;
    diagnostics: { mode: string; rerank: { enabled: boolean } };
  }>;

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.diagnostics.mode, "fulltext_reranked");
    assert.equal(res.data.diagnostics.rerank.enabled, true);
    assert.equal(res.data.items[0]?.sourceRef, "doc:doc_b#chunk:0");
  }
}
