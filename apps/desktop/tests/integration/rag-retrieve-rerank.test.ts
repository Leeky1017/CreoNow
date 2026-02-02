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
  documentId: string;
  title: string;
  snippet: string;
  score: number;
};

/**
 * Create a DB stub that returns deterministic FTS results by query.
 *
 * Why: integration tests must not depend on native `better-sqlite3` binaries.
 */
function createDbStub(): Database.Database {
  const docA: FulltextRow = {
    documentId: "doc_a",
    title: "Doc A",
    snippet: "foo foo foo",
    score: 2,
  };
  const docB: FulltextRow = {
    documentId: "doc_b",
    title: "Doc B",
    snippet: "foo bar",
    score: 1,
  };

  const prepare = () => {
    return {
      all: (_projectId: string, query: string, limit: number) => {
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

  const handler = handlers.get("rag:retrieve");
  assert.ok(handler, "Missing handler rag:retrieve");

  const res = (await handler(
    {},
    { projectId: "proj_1", queryText: "foo bar", limit: 2, budgetTokens: 200 },
  )) as IpcResponse<{
    items: Array<{ sourceRef: string }>;
    diagnostics: { mode: string; rerank: { enabled: boolean; reason?: string } };
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

  const handler = handlers.get("rag:retrieve");
  assert.ok(handler, "Missing handler rag:retrieve");

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

