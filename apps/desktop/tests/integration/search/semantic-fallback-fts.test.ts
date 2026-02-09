import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerEmbeddingIpcHandlers } from "../../../main/src/ipc/embedding";
import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type FulltextRow = {
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
  const rows: FulltextRow[] = [
    {
      projectId: "proj_1",
      documentId: "doc_1",
      documentTitle: "Chapter One",
      documentType: "chapter",
      snippet: "角色内心的孤独与迷茫。",
      score: 1.4,
      updatedAt: 1739030400,
    },
  ];

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: rows.length }),
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: (_projectId: string, _query: string, limit: number) => rows.slice(0, limit),
      };
    }

    return {
      all: () => [],
      get: () => ({ total: 0 }),
    };
  };

  return { prepare } as unknown as Database.Database;
}

// Scenario Mapping: SR2-R1-S2
{
  // Arrange
  const logger = createLogger();
  const embedding = createEmbeddingService({ logger });
  const db = createDbStub();
  const { ipcMain, handlers } = createIpcHarness();

  registerEmbeddingIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    embedding,
  });

  const handler = handlers.get("embedding:semantic:search");
  assert.ok(handler, "Missing handler embedding:semantic:search");
  if (!handler) {
    throw new Error("Missing handler embedding:semantic:search");
  }

  // Act
  const response = (await handler(
    {},
    {
      projectId: "proj_1",
      queryText: "角色内心的孤独与迷茫",
      topK: 5,
      minScore: 0.55,
      model: "default",
    },
  )) as IpcResponse<{
    mode: "semantic" | "fts-fallback";
    notice?: string;
    fallback?: {
      reason: string;
      from: "semantic";
      to: "fts";
    };
    results: Array<{
      documentId: string;
      text: string;
      score: number;
    }>;
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.mode, "fts-fallback");
    assert.equal(response.data.fallback?.from, "semantic");
    assert.equal(response.data.fallback?.to, "fts");
    assert.equal(response.data.fallback?.reason, "MODEL_NOT_READY");
    assert.ok((response.data.notice ?? "").includes("语义搜索暂时不可用"));
    assert.equal(response.data.results.length, 1);
    assert.equal(response.data.results[0]?.documentId, "doc_1");
  }
}
