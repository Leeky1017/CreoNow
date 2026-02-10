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

// Scenario Mapping: CE5-R3-S1
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

  const assembleHandler = handlers.get("context:prompt:assemble");
  assert.ok(assembleHandler, "Missing handler context:prompt:assemble");
  if (!assembleHandler) {
    throw new Error("Missing handler context:prompt:assemble");
  }

  const hugeInput = "超大输入".repeat(120000);

  // Act
  const response = (await assembleHandler(
    {},
    {
      projectId: "project-1",
      documentId: "document-1",
      cursorPosition: 256,
      skillId: "continue-writing",
      additionalInput: hugeInput,
    },
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "CONTEXT_INPUT_TOO_LARGE");
    assert.match(response.error.message, /reduce|split|shrink/i);
  }
}
