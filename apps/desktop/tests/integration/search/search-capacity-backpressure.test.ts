import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerSearchIpcHandlers } from "../../../main/src/ipc/search";
import {
  asIpcMain,
  createFtsDbStub,
  createIpcHarness,
  createLogger,
} from "./hybrid-ranking-test-harness";

function buildSemanticItems(total: number) {
  return Array.from({ length: total }).map((_, index) => ({
    documentId: `doc_${index + 1}`,
    chunkId: `doc_${index + 1}:0`,
    snippet: `semantic candidate ${index + 1}`,
    score: 0.86,
    updatedAt: 1_739_030_400 + index,
  }));
}

// Scenario Mapping: SR5-R2-S4
{
  const logger = createLogger();
  const db = createFtsDbStub({
    projectId: "proj_1",
    rows: [],
  });
  const { ipcMain, handlers } = createIpcHarness();

  registerSearchIpcHandlers({
    ipcMain: asIpcMain(ipcMain),
    db,
    logger,
    semanticRetriever: {
      search: () => ({
        ok: true,
        data: {
          items: buildSemanticItems(12_050),
        },
      }),
    },
  });

  const queryByStrategy = handlers.get("search:query:strategy");
  assert.ok(queryByStrategy, "Missing handler search:query:strategy");
  if (!queryByStrategy) {
    throw new Error("Missing handler search:query:strategy");
  }

  const response = (await queryByStrategy(
    {},
    {
      projectId: "proj_1",
      query: "capacity pressure",
      strategy: "semantic",
      limit: 50,
      offset: 0,
    },
  )) as IpcResponse<unknown>;

  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "SEARCH_BACKPRESSURE");
    const details = response.error.details as {
      candidateCount?: number;
      candidateLimit?: number;
      retryAfterMs?: number;
    };
    assert.equal(
      (details.candidateCount ?? 0) > (details.candidateLimit ?? 0),
      true,
    );
    assert.equal(details.retryAfterMs, 200);
  }
}
