import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerEmbeddingIpcHandlers } from "../../../main/src/ipc/embedding";
import { registerRagIpcHandlers } from "../../../main/src/ipc/rag";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { SemanticChunkIndexService } from "../../../main/src/services/embedding/semanticChunkIndexService";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

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

function createAuditLogger(): Logger & { events: string[] } {
  const events: string[] = [];
  return {
    events,
    logPath: "<test>",
    info: (event) => {
      events.push(event);
    },
    error: (event) => {
      events.push(event);
    },
  };
}

function createSearchMismatchDb(): Database.Database {
  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: 1 }),
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: () => [
          {
            projectId: "proj_2",
            documentId: "doc_other_project",
            documentTitle: "Foreign Doc",
            documentType: "chapter",
            snippet: "forbidden result",
            score: 0.8,
            updatedAt: 1_739_030_400,
          },
        ],
      };
    }

    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: () => [],
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

function createDocsDb(): Database.Database {
  const prepare = (sql: string) => {
    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: () => [
          {
            documentId: "doc_1",
            contentText: "doc body",
            updatedAt: 1_739_030_400,
          },
        ],
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: () => [],
      };
    }

    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: 0 }),
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

function createCrossProjectSemanticIndex(): SemanticChunkIndexService {
  return {
    upsertDocument: () => ({
      ok: true,
      data: {
        changedChunkIds: [],
        unchangedChunkIds: [],
        removedChunkIds: [],
        totalChunks: 1,
      },
    }),
    reindexProject: () => ({
      ok: true,
      data: {
        indexedDocuments: 1,
        indexedChunks: 1,
        changedChunks: 0,
      },
    }),
    search: () => ({
      ok: true,
      data: {
        chunks: [
          {
            chunkId: "doc_2:0",
            documentId: "doc_2",
            projectId: "proj_2",
            text: "foreign project chunk",
            score: 0.95,
            startOffset: 0,
            endOffset: 20,
            updatedAt: 1_739_030_401,
          },
        ],
      },
    }),
    listProjectChunks: () => [],
  };
}

// Scenario Mapping: SR5-R2-S5
{
  const logger = createAuditLogger();

  const searchHarness = createIpcHarness();
  registerSearchIpcHandlers({
    ipcMain: searchHarness.ipcMain as unknown as IpcMain,
    db: createSearchMismatchDb(),
    logger,
  });

  const ftsQuery = searchHarness.handlers.get("search:fts:query");
  assert.ok(ftsQuery, "Missing handler search:fts:query");
  if (!ftsQuery) {
    throw new Error("Missing handler search:fts:query");
  }

  const searchRes = (await ftsQuery(
    {},
    {
      projectId: "proj_1",
      query: "cross project leak",
      limit: 10,
      offset: 0,
    },
  )) as IpcResponse<unknown>;

  assert.equal(searchRes.ok, false);
  if (!searchRes.ok) {
    assert.equal(searchRes.error.code, "SEARCH_PROJECT_FORBIDDEN");
  }

  const embeddingHarness = createIpcHarness();
  registerEmbeddingIpcHandlers({
    ipcMain: embeddingHarness.ipcMain as unknown as IpcMain,
    db: createDocsDb(),
    logger,
    embedding: createEmbeddingService({ logger }),
    semanticIndex: createCrossProjectSemanticIndex(),
  });

  const embeddingSearch = embeddingHarness.handlers.get(
    "embedding:semantic:search",
  );
  assert.ok(embeddingSearch, "Missing handler embedding:semantic:search");
  if (!embeddingSearch) {
    throw new Error("Missing handler embedding:semantic:search");
  }

  const embeddingRes = (await embeddingSearch(
    {},
    {
      projectId: "proj_1",
      queryText: "cross project semantic",
      topK: 5,
      minScore: 0.5,
    },
  )) as IpcResponse<unknown>;

  assert.equal(embeddingRes.ok, false);
  if (!embeddingRes.ok) {
    assert.equal(embeddingRes.error.code, "SEARCH_PROJECT_FORBIDDEN");
  }

  const ragHarness = createIpcHarness();
  registerRagIpcHandlers({
    ipcMain: ragHarness.ipcMain as unknown as IpcMain,
    db: createDocsDb(),
    logger,
    embedding: createEmbeddingService({ logger }),
    ragRerank: { enabled: false },
    semanticIndex: createCrossProjectSemanticIndex(),
  });

  const ragRetrieve = ragHarness.handlers.get("rag:context:retrieve");
  assert.ok(ragRetrieve, "Missing handler rag:context:retrieve");
  if (!ragRetrieve) {
    throw new Error("Missing handler rag:context:retrieve");
  }

  const ragRes = (await ragRetrieve(
    {},
    {
      projectId: "proj_1",
      queryText: "cross project rag",
      topK: 5,
      minScore: 0.5,
      maxTokens: 200,
    },
  )) as IpcResponse<unknown>;

  assert.equal(ragRes.ok, false);
  if (!ragRes.ok) {
    assert.equal(ragRes.error.code, "SEARCH_PROJECT_FORBIDDEN");
  }

  assert.equal(
    logger.events.some((event) => event.includes("project_forbidden")),
    true,
  );
}
