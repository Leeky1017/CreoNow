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

// Scenario Mapping: CE5-R2-S2
{
  // Arrange
  const handlers = new Map<string, Handler>();
  const loggerEvents: Array<{ event: string; data?: Record<string, unknown> }> =
    [];
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };
  const logger: Logger = {
    logPath: "<test>",
    info: (event, data) => {
      loggerEvents.push({ event, data });
    },
    error: (event, data) => {
      loggerEvents.push({ event, data });
    },
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
        chunks: [],
      }),
      retrieved: async () => ({
        chunks: [
          {
            source: "rag:cross-project",
            content: "来自其他项目的片段",
            projectId: "project-2",
          } as {
            source: string;
            content: string;
            projectId: string;
          },
        ],
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
      cursorPosition: 32,
      skillId: "continue-writing",
    },
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "CONTEXT_SCOPE_VIOLATION");
  }
  assert.equal(
    loggerEvents.some((entry) => entry.event === "context_scope_violation"),
    true,
  );
}
