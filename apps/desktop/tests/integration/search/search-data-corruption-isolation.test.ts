import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerEmbeddingIpcHandlers } from "../../../main/src/ipc/embedding";
import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { SemanticChunkIndexService } from "../../../main/src/services/embedding/semanticChunkIndexService";
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
    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: () => [
          {
            documentId: "doc_1",
            contentText: "safe chunk content",
            updatedAt: 1_739_030_400,
          },
        ],
      };
    }

    return {
      all: () => [],
      get: () => ({ total: 0 }),
    };
  };

  return { prepare } as unknown as Database.Database;
}

function createCorruptedSemanticIndex(): SemanticChunkIndexService {
  return {
    upsertDocument: () => ({
      ok: true,
      data: {
        changedChunkIds: [],
        unchangedChunkIds: [],
        removedChunkIds: [],
        totalChunks: 2,
      },
    }),
    reindexProject: () => ({
      ok: true,
      data: {
        indexedDocuments: 1,
        indexedChunks: 2,
        changedChunks: 0,
      },
    }),
    search: () => ({
      ok: true,
      data: {
        chunks: [
          {
            chunkId: "doc_1:0",
            documentId: "doc_1",
            projectId: "proj_1",
            text: "valid semantic chunk",
            score: 0.92,
            startOffset: 0,
            endOffset: 20,
            updatedAt: 1_739_030_401,
          },
          {
            chunkId: "doc_1:1",
            documentId: "doc_1",
            projectId: "proj_1",
            text: "corrupted semantic chunk",
            score: 0.88,
            startOffset: 40,
            endOffset: 10,
            updatedAt: 1_739_030_402,
          },
        ],
      },
    }),
    listProjectChunks: () => [],
  };
}

// Scenario Mapping: SR5-R2-S2
{
  const logger = createLogger();
  const db = createDbStub();
  const embedding = createEmbeddingService({ logger });
  const { ipcMain, handlers } = createIpcHarness();

  registerEmbeddingIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    embedding,
    semanticIndex: createCorruptedSemanticIndex(),
  });

  const handler = handlers.get("embedding:semantic:search");
  assert.ok(handler, "Missing handler embedding:semantic:search");
  if (!handler) {
    throw new Error("Missing handler embedding:semantic:search");
  }

  const response = (await handler(
    {},
    {
      projectId: "proj_1",
      queryText: "semantic query",
      topK: 5,
      minScore: 0.3,
    },
  )) as IpcResponse<{
    mode: "semantic" | "fts-fallback";
    results: Array<{ chunkId: string; documentId: string; text: string }>;
    isolation?: {
      code: "SEARCH_DATA_CORRUPTED";
      isolatedChunkIds: string[];
    };
  }>;

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.mode, "semantic");
    assert.equal(response.data.results.length, 1);
    assert.equal(response.data.results[0]?.chunkId, "doc_1:0");
    assert.equal(response.data.isolation?.code, "SEARCH_DATA_CORRUPTED");
    assert.deepEqual(response.data.isolation?.isolatedChunkIds, ["doc_1:1"]);
  }
}
