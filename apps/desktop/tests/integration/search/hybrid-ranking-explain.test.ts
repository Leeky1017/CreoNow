import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createFtsDbStub,
  createIpcHarness,
  createLogger,
} from "./hybrid-ranking-test-harness";

function buildRows(total: number): Array<{
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  updatedAt: number;
}> {
  return Array.from({ length: total }).map((_, index) => {
    const n = index + 1;
    return {
      documentId: `doc_${n}`,
      title: `Chapter ${n}`,
      snippet: `hybrid result snippet ${n}`,
      score: 220 - n,
      updatedAt: 1_739_030_400 + n,
    };
  });
}

// Scenario Mapping: SR4-R1-S1
{
  const logger = createLogger();
  const db = createFtsDbStub({
    projectId: "proj_1",
    rows: buildRows(60),
  });
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: asIpcMain(ipcMain),
    db,
    logger,
    semanticRetriever: {
      search: ({ limit }) => ({
        ok: true,
        data: {
          items: buildRows(60)
            .slice(0, limit)
            .map((row) => ({
              documentId: row.documentId,
              chunkId: `fts:${row.documentId}:0`,
              snippet: row.snippet,
              score: 0.8,
              updatedAt: row.updatedAt,
            })),
        },
      }),
    },
  });

  const queryByStrategy = handlers.get("search:query:strategy");
  assert.ok(queryByStrategy, "Missing handler search:query:strategy");
  if (!queryByStrategy) {
    throw new Error("Missing handler search:query:strategy");
  }

  const explain = handlers.get("search:rank:explain");
  assert.ok(explain, "Missing handler search:rank:explain");
  if (!explain) {
    throw new Error("Missing handler search:rank:explain");
  }

  const queryRes = (await queryByStrategy(
    {},
    {
      projectId: "proj_1",
      query: "abandoned warehouse old photo",
      strategy: "hybrid",
      offset: 0,
    },
  )) as IpcResponse<{
    strategy: "fts" | "semantic" | "hybrid";
    results: Array<{
      documentId: string;
      chunkId: string;
      snippet: string;
      finalScore: number;
      scoreBreakdown: {
        bm25: number;
        semantic: number;
        recency: number;
      };
      updatedAt: number;
    }>;
    total: number;
    hasMore: boolean;
  }>;

  assert.equal(queryRes.ok, true);
  if (!queryRes.ok) {
    throw new Error("search:query:strategy should succeed in hybrid mode");
  }
  assert.equal(queryRes.data.strategy, "hybrid");
  assert.equal(queryRes.data.results.length, 50);
  assert.equal(queryRes.data.hasMore, true);
  assert.ok(queryRes.data.total >= 50);
  assert.ok(queryRes.data.results[0]?.finalScore ?? 0 >= 0);

  const first = queryRes.data.results[0];
  const second = queryRes.data.results[1];
  assert.ok((first?.finalScore ?? 0) >= (second?.finalScore ?? 0));
  assert.ok(typeof first?.scoreBreakdown.bm25 === "number");
  assert.ok(typeof first?.scoreBreakdown.semantic === "number");
  assert.ok(typeof first?.scoreBreakdown.recency === "number");

  const explainRes = (await explain(
    {},
    {
      projectId: "proj_1",
      query: "abandoned warehouse old photo",
      strategy: "hybrid",
      documentId: first?.documentId,
      chunkId: first?.chunkId,
    },
  )) as IpcResponse<{
    strategy: "fts" | "semantic" | "hybrid";
    explanations: Array<{
      documentId: string;
      chunkId: string;
      finalScore: number;
      scoreBreakdown: {
        bm25: number;
        semantic: number;
        recency: number;
      };
    }>;
  }>;

  assert.equal(explainRes.ok, true);
  if (!explainRes.ok) {
    throw new Error("search:rank:explain should return explain payload");
  }
  assert.equal(explainRes.data.strategy, "hybrid");
  assert.equal(explainRes.data.explanations.length, 1);
  assert.equal(explainRes.data.explanations[0]?.documentId, first?.documentId);
  assert.equal(explainRes.data.explanations[0]?.chunkId, first?.chunkId);
}
