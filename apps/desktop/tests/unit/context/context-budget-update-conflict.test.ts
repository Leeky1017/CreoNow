import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerContextIpcHandlers } from "../../../main/src/ipc/context";
import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";
import type { Logger } from "../../../main/src/logging/logger";
import type { CreonowWatchService } from "../../../main/src/services/context/watchService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

// Scenario Mapping: CE5-R2-S1
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
    contextAssemblyService: createContextLayerAssemblyService(),
  });

  const getHandler = handlers.get("context:budget:get");
  const updateHandler = handlers.get("context:budget:update");
  assert.ok(getHandler, "Missing handler context:budget:get");
  assert.ok(updateHandler, "Missing handler context:budget:update");
  if (!getHandler || !updateHandler) {
    throw new Error("Missing context budget handlers");
  }

  // Act
  const budgetResponse = (await getHandler({}, {})) as IpcResponse<{
    version: number;
    tokenizerId: string;
    tokenizerVersion: string;
    layers: {
      rules: { ratio: number; minimumTokens: number };
      settings: { ratio: number; minimumTokens: number };
      retrieved: { ratio: number; minimumTokens: number };
      immediate: { ratio: number; minimumTokens: number };
    };
  }>;
  assert.equal(budgetResponse.ok, true);
  if (!budgetResponse.ok) {
    throw new Error("Expected budget get success");
  }

  const firstUpdate = (await updateHandler(
    {},
    budgetResponse.data,
  )) as IpcResponse<{
    version: number;
    tokenizerId: string;
    tokenizerVersion: string;
    layers: {
      rules: { ratio: number; minimumTokens: number };
      settings: { ratio: number; minimumTokens: number };
      retrieved: { ratio: number; minimumTokens: number };
      immediate: { ratio: number; minimumTokens: number };
    };
  }>;

  const conflict = (await updateHandler(
    {},
    budgetResponse.data,
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(firstUpdate.ok, true);
  if (firstUpdate.ok) {
    assert.equal(firstUpdate.data.version > budgetResponse.data.version, true);
  }

  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.error.code, "CONTEXT_BUDGET_CONFLICT");
  }
}
