import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createFtsDbStub,
  createIpcHarness,
  createLogger,
} from "./hybrid-ranking-test-harness";

function buildRows(): Array<{
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  updatedAt: number;
}> {
  const rows: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
    updatedAt: number;
  }> = [
    {
      documentId: "doc_top",
      title: "Top",
      snippet: "top candidate",
      score: 100,
      updatedAt: 150,
    },
    {
      documentId: "doc_tie_new",
      title: "Tie New",
      snippet: "tie candidate newer",
      score: 80,
      updatedAt: 200,
    },
    {
      documentId: "doc_tie_old",
      title: "Tie Old",
      snippet: "tie candidate older",
      score: 88.545454,
      updatedAt: 100,
    },
  ];

  for (let i = 0; i < 57; i += 1) {
    rows.push({
      documentId: `doc_fill_${i + 1}`,
      title: `Fill ${i + 1}`,
      snippet: `fill candidate ${i + 1}`,
      score: 60 - (i % 8),
      updatedAt: 101 + i,
    });
  }

  return rows;
}

// Scenario Mapping: SR4-R1-S2
{
  const logger = createLogger();
  const rows = buildRows();
  const db = createFtsDbStub({
    projectId: "proj_1",
    rows,
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
          items: rows.slice(0, limit).map((row) => ({
            documentId: row.documentId,
            chunkId: `fts:${row.documentId}:0`,
            snippet: row.snippet,
            score: 0.6,
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

  const page1 = (await queryByStrategy(
    {},
    {
      projectId: "proj_1",
      query: "warehouse",
      strategy: "hybrid",
      offset: 0,
      limit: 50,
    },
  )) as IpcResponse<{
    results: Array<{
      documentId: string;
      chunkId: string;
      finalScore: number;
      updatedAt: number;
    }>;
    total: number;
    hasMore: boolean;
  }>;

  assert.equal(page1.ok, true);
  if (!page1.ok) {
    throw new Error("first page query should succeed");
  }

  assert.equal(page1.data.results.length, 50);
  assert.equal(page1.data.hasMore, true);

  const tieNewIndex = page1.data.results.findIndex(
    (item) => item.documentId === "doc_tie_new",
  );
  const tieOldIndex = page1.data.results.findIndex(
    (item) => item.documentId === "doc_tie_old",
  );

  assert.ok(tieNewIndex >= 0);
  assert.ok(tieOldIndex >= 0);

  const tieNew = page1.data.results[tieNewIndex];
  const tieOld = page1.data.results[tieOldIndex];
  assert.ok(tieNew);
  assert.ok(tieOld);
  assert.equal(tieNew.finalScore, tieOld.finalScore);
  assert.ok(tieNew.updatedAt > tieOld.updatedAt);
  assert.ok(tieNewIndex < tieOldIndex);

  const page2 = (await queryByStrategy(
    {},
    {
      projectId: "proj_1",
      query: "warehouse",
      strategy: "hybrid",
      offset: 50,
      limit: 50,
    },
  )) as IpcResponse<{
    results: Array<{
      documentId: string;
      chunkId: string;
    }>;
    total: number;
    hasMore: boolean;
  }>;

  assert.equal(page2.ok, true);
  if (!page2.ok) {
    throw new Error("second page query should succeed");
  }

  assert.equal(page2.data.results.length, page2.data.total - 50);
  assert.equal(page2.data.hasMore, false);

  const page1Ids = new Set(page1.data.results.map((item) => item.chunkId));
  const overlap = page2.data.results.some((item) => page1Ids.has(item.chunkId));
  assert.equal(overlap, false);
}
