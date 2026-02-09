import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerRagIpcHandlers } from "../../../main/src/ipc/rag";
import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";
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
      documentId: "doc_warehouse",
      documentTitle: "Chapter Two",
      documentType: "chapter",
      contentText: "abandoned warehouse with damp crates and an old lamp",
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

// Scenario Mapping: SR2-R2-S1
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

  const retrieveHandler = handlers.get("rag:context:retrieve");
  assert.ok(retrieveHandler, "Missing handler rag:context:retrieve");
  if (!retrieveHandler) {
    throw new Error("Missing handler rag:context:retrieve");
  }

  const ragRes = (await retrieveHandler(
    {},
    {
      projectId: "proj_1",
      queryText: "abandoned warehouse with damp crates and an old lamp",
      topK: 5,
      minScore: 0.2,
      maxTokens: 200,
      model: "hash-v1",
    },
  )) as IpcResponse<{
    chunks: Array<{
      chunkId: string;
      documentId: string;
      text: string;
      score: number;
      tokenEstimate: number;
    }>;
    truncated: boolean;
  }>;

  if (!ragRes.ok) {
    throw new Error(`Expected ok rag retrieve, got: ${ragRes.error.code}`);
  }

  const service = createContextLayerAssemblyService({
    rules: async () => ({ chunks: [{ source: "kg:entities", content: "warehouse setting" }] }),
    settings: async () => ({ chunks: [{ source: "memory:semantic", content: "keep consistent atmosphere" }] }),
    retrieved: async () => ({
      chunks: ragRes.data.chunks.map((chunk) => ({
        source: "rag:context:retrieve",
        content: chunk.text,
      })),
    }),
    immediate: async () => ({ chunks: [{ source: "editor:cursor-window", content: "continue writing" }] }),
  });

  // Act
  const assembled = await service.assemble({
    projectId: "proj_1",
    documentId: "doc_current",
    cursorPosition: 12,
    skillId: "continue-writing",
  });

  // Assert
  assert.deepEqual(assembled.layers.retrieved.source, ["rag:context:retrieve"]);
  assert.equal(assembled.layers.retrieved.tokenCount > 0, true);
  assert.ok(assembled.prompt.includes("abandoned warehouse"));
}
