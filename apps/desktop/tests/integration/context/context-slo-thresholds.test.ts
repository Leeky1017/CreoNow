import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerContextIpcHandlers } from "../../../main/src/ipc/context";
import {
  CONTEXT_CAPACITY_LIMITS,
  CONTEXT_SLO_THRESHOLDS_MS,
  createContextLayerAssemblyService,
} from "../../../main/src/services/context/layerAssemblyService";
import type { Logger } from "../../../main/src/logging/logger";
import type { CreonowWatchService } from "../../../main/src/services/context/watchService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

// Scenario Mapping: CE5-R1-S1
{
  // Arrange
  const handlers = new Map<string, Handler>();
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };
  const logger: Logger = {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
  const db = {
    prepare: () => ({
      get: () => ({ rootPath: "/tmp/project" }),
    }),
  } as unknown as Database.Database;
  const watchService: CreonowWatchService = {
    start: (_args) => ({ ok: true, data: { watching: true } }),
    stop: (_args) => ({ ok: true, data: { watching: false } }),
    isWatching: (_args) => false,
  };

  const retrievedChunks = Array.from({ length: 250 }, (_v, index) => ({
    source: `rag:chunk:${index.toString()}`,
    content: `chunk-${index.toString()}`,
  }));

  registerContextIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    userDataDir: "/tmp",
    watchService,
    contextAssemblyService: createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "kg:entities", content: "角色设定" }],
      }),
      settings: async () => ({
        chunks: [{ source: "memory:semantic", content: "短句风格" }],
      }),
      retrieved: async () => ({
        chunks: retrievedChunks,
      }),
      immediate: async () => ({
        chunks: [{ source: "editor:cursor-window", content: "当前正文" }],
      }),
    }),
  });

  const assembleHandler = handlers.get("context:prompt:assemble");
  assert.ok(assembleHandler, "Missing handler context:prompt:assemble");
  if (!assembleHandler) {
    throw new Error("Missing handler context:prompt:assemble");
  }

  // Act
  const response = (await assembleHandler(
    {},
    {
      projectId: "project-1",
      documentId: "document-1",
      cursorPosition: 80,
      skillId: "continue-writing",
    },
  )) as IpcResponse<{
    warnings: string[];
    layers: {
      retrieved: {
        source: string[];
      };
    };
  }>;

  // Assert
  assert.deepEqual(CONTEXT_SLO_THRESHOLDS_MS, {
    assemble: { p95: 250, p99: 500 },
    inspect: { p95: 180, p99: 350 },
    budgetCalculation: { p95: 80, p99: 150 },
  });
  assert.deepEqual(CONTEXT_CAPACITY_LIMITS, {
    maxInputTokens: 64000,
    maxRetrievedChunks: 200,
    maxConcurrentByDocument: 4,
  });

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(
      response.data.layers.retrieved.source.length,
      CONTEXT_CAPACITY_LIMITS.maxRetrievedChunks,
    );
    assert.equal(
      response.data.warnings.includes("CONTEXT_RETRIEVED_CHUNK_LIMIT"),
      true,
    );
  }
}
