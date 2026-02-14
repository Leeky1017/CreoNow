import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerContextIpcHandlers } from "../../../main/src/ipc/context";
import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";
import type { Logger } from "../../../main/src/logging/logger";
import type { CreonowWatchService } from "../../../main/src/services/context/watchService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

// Scenario Mapping: CE1-R2-S1
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
        chunks: [{ source: "rag:retrieve", content: "历史片段" }],
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
      cursorPosition: 16,
      skillId: "continue-writing",
    },
  )) as IpcResponse<{
    prompt: string;
    tokenCount: number;
    stablePrefixHash: string;
    stablePrefixUnchanged: boolean;
    warnings: string[];
    layers: Record<string, { source: string[]; tokenCount: number }>;
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(typeof response.data.prompt, "string");
    assert.equal(response.data.prompt.length > 0, true);
    assert.equal(typeof response.data.tokenCount, "number");
    assert.equal(typeof response.data.stablePrefixHash, "string");
    assert.equal(typeof response.data.stablePrefixUnchanged, "boolean");
    assert.ok(Array.isArray(response.data.warnings));
    assert.deepEqual(response.data.layers.rules.source, ["kg:entities"]);
    assert.equal(response.data.layers.rules.tokenCount > 0, true);
    assert.deepEqual(response.data.layers.settings.source, ["memory:semantic"]);
    assert.equal(response.data.layers.settings.tokenCount > 0, true);
    assert.deepEqual(response.data.layers.retrieved.source, ["rag:retrieve"]);
    assert.equal(response.data.layers.retrieved.tokenCount > 0, true);
    assert.deepEqual(response.data.layers.immediate.source, [
      "editor:cursor-window",
    ]);
    assert.equal(response.data.layers.immediate.tokenCount > 0, true);
  }
}
