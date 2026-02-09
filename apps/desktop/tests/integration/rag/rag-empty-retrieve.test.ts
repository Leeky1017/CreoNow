import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerRagIpcHandlers } from "../../../main/src/ipc/rag";
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
      documentTitle: "第一章",
      documentType: "chapter",
      contentText: "这是温馨日常场景。",
      updatedAt: 1739030400,
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

// Scenario Mapping: SR2-R2-S2
{
  // Arrange
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

  // Act
  const response = (await handler(
    {},
    {
      projectId: "proj_1",
      queryText: "完全不相关的宇宙飞船引擎细节",
      topK: 5,
      minScore: 0.95,
      model: "hash-v1",
    },
  )) as IpcResponse<{
    chunks: Array<{ chunkId: string; documentId: string; text: string; score: number }>;
    truncated: boolean;
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.deepEqual(response.data.chunks, []);
    assert.equal(response.data.truncated, false);
  }
}
