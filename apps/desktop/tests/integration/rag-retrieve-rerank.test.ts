import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerRagIpcHandlers } from "../../main/src/ipc/rag";
import { createEmbeddingService } from "../../main/src/services/embedding/embeddingService";
import type { Logger } from "../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type DocumentRow = {
  projectId: string;
  documentId: string;
  contentText: string;
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
  const docs: DocumentRow[] = [
    {
      projectId: "proj_1",
      documentId: "doc_a",
      contentText: "foo foo foo",
      updatedAt: 1739030400,
    },
    {
      projectId: "proj_1",
      documentId: "doc_b",
      contentText: "foo bar",
      updatedAt: 1739030401,
    },
  ];

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: (_projectId: string, query: string) => {
          if (query.trim().length > 0) {
            return { total: 2 };
          }
          return { total: 0 };
        },
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: (_projectId: string, _query: string, limit: number) =>
          [
            {
              projectId: "proj_1",
              documentId: "doc_a",
              documentTitle: "Doc A",
              documentType: "chapter",
              snippet: "foo foo foo",
              score: 2,
              updatedAt: 1739030400,
            },
            {
              projectId: "proj_1",
              documentId: "doc_b",
              documentTitle: "Doc B",
              documentType: "chapter",
              snippet: "foo bar",
              score: 1,
              updatedAt: 1739030401,
            },
          ].slice(0, limit),
      };
    }

    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: (projectId: string) =>
          docs
            .filter((row) => row.projectId === projectId)
            .map((row) => ({
              documentId: row.documentId,
              contentText: row.contentText,
              updatedAt: row.updatedAt,
            })),
      };
    }

    return {
      all: () => [],
      get: () => ({ total: 0 }),
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
    ragRerank: { enabled: false },
  });

  const handler = handlers.get("rag:context:retrieve");
  assert.ok(handler, "Missing handler rag:context:retrieve");
  if (!handler) {
    throw new Error("Missing handler rag:context:retrieve");
  }

  const res = (await handler(
    {},
    {
      projectId: "proj_1",
      queryText: "foo bar",
      topK: 2,
      maxTokens: 200,
      model: "default",
    },
  )) as IpcResponse<{
    chunks: Array<{ chunkId: string; documentId: string }>;
    fallback?: { reason: string };
  }>;

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.fallback?.reason, "MODEL_NOT_READY");
    assert.equal(res.data.chunks.length, 2);
    assert.equal(res.data.chunks[0]?.documentId, "doc_a");
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
    ragRerank: { enabled: false },
  });

  const handler = handlers.get("rag:context:retrieve");
  assert.ok(handler, "Missing handler rag:context:retrieve");
  if (!handler) {
    throw new Error("Missing handler rag:context:retrieve");
  }

  const res = (await handler(
    {},
    {
      projectId: "proj_1",
      queryText: "foo bar",
      topK: 2,
      maxTokens: 200,
      model: "hash-v1",
    },
  )) as IpcResponse<{
    chunks: Array<{ chunkId: string; documentId: string }>;
    fallback?: { reason: string };
  }>;

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(Boolean(res.data.fallback), false);
    assert.equal(res.data.chunks.length, 2);
    assert.equal(res.data.chunks[0]?.documentId, "doc_a");
  }
}
