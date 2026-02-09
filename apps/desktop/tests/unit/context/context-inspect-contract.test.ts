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

// Scenario Mapping: CE1-R2-S2
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

  const inspectHandler = handlers.get("context:prompt:inspect");
  assert.ok(inspectHandler, "Missing handler context:prompt:inspect");
  if (!inspectHandler) {
    throw new Error("Missing handler context:prompt:inspect");
  }

  // Act
  const response = (await inspectHandler(
    {},
    {
      projectId: "project-1",
      documentId: "document-1",
      cursorPosition: 16,
      skillId: "continue-writing",
      debugMode: true,
      requestedBy: "unit-test",
    },
  )) as IpcResponse<{
    layersDetail: Record<
      string,
      {
        content: string;
        source: string[];
        tokenCount: number;
        truncated: boolean;
      }
    >;
    totals: { tokenCount: number; warningsCount: number };
    inspectMeta: {
      debugMode: boolean;
      requestedBy: string;
      requestedAt: number;
    };
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(typeof response.data.layersDetail.rules.content, "string");
    assert.deepEqual(response.data.layersDetail.rules.source, ["kg:entities"]);
    assert.equal(response.data.layersDetail.rules.tokenCount > 0, true);
    assert.equal(typeof response.data.totals.tokenCount, "number");
    assert.equal(typeof response.data.totals.warningsCount, "number");
    assert.equal(response.data.inspectMeta.debugMode, true);
    assert.equal(response.data.inspectMeta.requestedBy, "unit-test");
    assert.equal(typeof response.data.inspectMeta.requestedAt, "number");
    assert.equal(
      Object.prototype.hasOwnProperty.call(response.data, "prompt"),
      false,
    );
  }
}
