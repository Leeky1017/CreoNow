import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerEmbeddingIpcHandlers } from "../../../main/src/ipc/embedding";
import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { Logger } from "../../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type DocumentRow = {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
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
      documentId: "doc_1",
      documentTitle: "D1",
      documentType: "chapter",
      contentText: "rainy night and lonely mind",
      updatedAt: 1739030400,
    },
    {
      projectId: "proj_1",
      documentId: "doc_2",
      documentTitle: "D2",
      documentType: "chapter",
      contentText: "lonely confusion in the character heart",
      updatedAt: 1739030401,
    },
    {
      projectId: "proj_1",
      documentId: "doc_3",
      documentTitle: "D3",
      documentType: "chapter",
      contentText: "sunny beach fireworks celebration",
      updatedAt: 1739030402,
    },
  ];

  const prepare = (sql: string) => {
    if (sql.includes("FROM documents") && sql.includes("content_text")) {
      return {
        all: (projectId: string) =>
          docs
            .filter((row) => row.projectId === projectId)
            .map((row) => ({
              projectId: row.projectId,
              documentId: row.documentId,
              documentTitle: row.documentTitle,
              documentType: row.documentType,
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

// Scenario Mapping: SR2-R1-S1
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
      queryText: "lonely confusion in the character heart",
      topK: 2,
      minScore: 0.2,
      model: "hash-v1",
    },
  )) as IpcResponse<{
    mode: "semantic" | "fts-fallback";
    results: Array<{
      chunkId: string;
      documentId: string;
      text: string;
      score: number;
      startOffset: number;
      endOffset: number;
    }>;
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.mode, "semantic");
    assert.ok(response.data.results.length >= 1);
    assert.equal(response.data.results[0]?.documentId, "doc_2");
    if (response.data.results.length > 1) {
      assert.ok(
        (response.data.results[0]?.score ?? 0) >=
          (response.data.results[1]?.score ?? 0),
      );
    }
    assert.ok((response.data.results[0]?.text ?? "").includes("lonely"));
  }
}
