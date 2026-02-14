import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerRagIpcHandlers } from "../../../main/src/ipc/rag";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { SemanticChunkIndexService } from "../../../main/src/services/embedding/semanticChunkIndexService";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

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
  const rows = Array.from({ length: 80 }).map((_, index) => ({
    projectId: "proj_1",
    documentId: `doc_${index + 1}`,
    documentTitle: `Doc ${index + 1}`,
    documentType: "chapter",
    snippet: `search snippet ${index + 1}`,
    score: 1 - index * 0.001,
    updatedAt: 1_739_030_400 + index,
  }));

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: () => ({ total: rows.length }),
      };
    }

    if (sql.includes("DELETE FROM documents_fts")) {
      return {
        run: () => ({ changes: rows.length }),
      };
    }

    if (sql.includes("INSERT OR REPLACE INTO documents_fts")) {
      return {
        run: () => ({ changes: 4_000 }),
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: (
          _projectId: string,
          _query: string,
          limit: number,
          offset: number,
        ) => rows.slice(offset, offset + limit),
      };
    }

    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: () => [
          {
            documentId: "doc_source",
            contentText:
              "abandoned warehouse with damp crates and a broken lantern",
            updatedAt: 1_739_030_500,
          },
        ],
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

function createSemanticIndexStub(): SemanticChunkIndexService {
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
            chunkId: "doc_source:0",
            documentId: "doc_source",
            projectId: "proj_1",
            text: "abandoned warehouse with damp crates and a broken lantern",
            score: 0.91,
            startOffset: 0,
            endOffset: 58,
            updatedAt: 1_739_030_500,
          },
        ],
      },
    }),
    listProjectChunks: () => [],
  };
}

// Scenario Mapping: SR5-R1-S1
{
  const logger = createLogger();
  const db = createDbStub();

  const searchHarness = createIpcHarness();
  registerSearchIpcHandlers({
    ipcMain: searchHarness.ipcMain as unknown as IpcMain,
    db,
    logger,
    semanticRetriever: {
      search: () => ({
        ok: true,
        data: {
          items: [
            {
              documentId: "doc_source",
              chunkId: "doc_source:0",
              snippet: "abandoned warehouse with damp crates",
              score: 0.9,
              updatedAt: 1_739_030_500,
            },
          ],
        },
      }),
    },
  });

  const ragHarness = createIpcHarness();
  registerRagIpcHandlers({
    ipcMain: ragHarness.ipcMain as unknown as IpcMain,
    db,
    logger,
    embedding: createEmbeddingService({ logger }),
    ragRerank: { enabled: false },
    semanticIndex: createSemanticIndexStub(),
  });

  const ftsQuery = searchHarness.handlers.get("search:fts:query");
  const strategyQuery = searchHarness.handlers.get("search:query:strategy");
  const reindex = searchHarness.handlers.get("search:fts:reindex");
  const ragRetrieve = ragHarness.handlers.get("rag:context:retrieve");

  assert.ok(ftsQuery, "Missing handler search:fts:query");
  assert.ok(strategyQuery, "Missing handler search:query:strategy");
  assert.ok(reindex, "Missing handler search:fts:reindex");
  assert.ok(ragRetrieve, "Missing handler rag:context:retrieve");
  if (!ftsQuery || !strategyQuery || !reindex || !ragRetrieve) {
    throw new Error("Required handler missing");
  }

  const ftsDurations: number[] = [];
  const hybridDurations: number[] = [];
  const ragDurations: number[] = [];

  for (let i = 0; i < 200; i += 1) {
    const tFts0 = performance.now();
    const ftsRes = (await ftsQuery(
      {},
      {
        projectId: "proj_1",
        query: "warehouse",
        limit: 20,
        offset: 0,
      },
    )) as IpcResponse<unknown>;
    ftsDurations.push(performance.now() - tFts0);
    assert.equal(ftsRes.ok, true);

    const tHybrid0 = performance.now();
    const strategyRes = (await strategyQuery(
      {},
      {
        projectId: "proj_1",
        query: "warehouse",
        strategy: "hybrid",
        limit: 20,
        offset: 0,
      },
    )) as IpcResponse<{
      strategy: "fts" | "semantic" | "hybrid";
      fallback: "fts" | "none";
      traceId: string;
      costMs: number;
    }>;
    hybridDurations.push(performance.now() - tHybrid0);
    assert.equal(strategyRes.ok, true);
    if (strategyRes.ok) {
      assert.equal(typeof strategyRes.data.traceId, "string");
      assert.equal(strategyRes.data.traceId.length > 0, true);
      assert.equal(strategyRes.data.strategy, "hybrid");
      assert.equal(typeof strategyRes.data.costMs, "number");
      assert.equal(strategyRes.data.costMs >= 0, true);
      assert.ok(
        strategyRes.data.fallback === "none" ||
          strategyRes.data.fallback === "fts",
      );
    }

    const tRag0 = performance.now();
    const ragRes = (await ragRetrieve(
      {},
      {
        projectId: "proj_1",
        queryText: "abandoned warehouse",
        topK: 5,
        minScore: 0.5,
        maxTokens: 200,
      },
    )) as IpcResponse<unknown>;
    ragDurations.push(performance.now() - tRag0);
    assert.equal(ragRes.ok, true);
  }

  const reindexStartedAt = performance.now();
  const reindexRes = (await reindex(
    {},
    { projectId: "proj_1" },
  )) as IpcResponse<{ reindexed: number }>;
  const reindexCostMs = Math.max(1, performance.now() - reindexStartedAt);

  assert.equal(reindexRes.ok, true);
  if (!reindexRes.ok) {
    throw new Error("reindex should succeed in perf benchmark");
  }

  const ftsP95 = percentile(ftsDurations, 95);
  const hybridP95 = percentile(hybridDurations, 95);
  const ragP95 = percentile(ragDurations, 95);
  const throughput = reindexRes.data.reindexed / (reindexCostMs / 1000);

  assert.equal(ftsP95 < 300, true, `fts p95 >= 300ms: ${ftsP95}`);
  assert.equal(hybridP95 < 650, true, `hybrid p95 >= 650ms: ${hybridP95}`);
  assert.equal(ragP95 < 450, true, `rag p95 >= 450ms: ${ragP95}`);
  assert.equal(
    throughput >= 2000,
    true,
    `reindex throughput < 2000 chunks/s: ${throughput}`,
  );
}
