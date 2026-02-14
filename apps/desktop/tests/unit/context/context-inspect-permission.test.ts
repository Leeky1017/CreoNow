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

type LogEntry = {
  level: "info" | "error";
  event: string;
  data?: Record<string, unknown>;
};

// Scenario Mapping: CE5-R1-S2
{
  // Arrange
  const handlers = new Map<string, Handler>();
  const logEntries: LogEntry[] = [];
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };

  const logger: Logger = {
    logPath: "<test>",
    info: (event, data) => {
      logEntries.push({ level: "info", event, data });
    },
    error: (event, data) => {
      logEntries.push({ level: "error", event, data });
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
  const denied = (await inspectHandler(
    {},
    {
      projectId: "project-1",
      documentId: "document-1",
      cursorPosition: 16,
      skillId: "continue-writing",
      debugMode: false,
      requestedBy: "qa-member",
      callerRole: "member",
      additionalInput: "SECRET-RAW-CONTENT",
    },
  )) as IpcResponse<unknown>;

  const allowed = (await inspectHandler(
    {},
    {
      projectId: "project-1",
      documentId: "document-1",
      cursorPosition: 16,
      skillId: "continue-writing",
      debugMode: true,
      requestedBy: "qa-owner",
      callerRole: "owner",
    },
  )) as IpcResponse<{
    inspectMeta: {
      debugMode: boolean;
      requestedBy: string;
      requestedAt: number;
    };
  }>;

  // Assert
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.error.code, "CONTEXT_INSPECT_FORBIDDEN");
  }

  const auditEntry = logEntries.find(
    (entry) => entry.event === "context_inspect_forbidden",
  );
  assert.ok(auditEntry, "Missing context_inspect_forbidden audit log");
  assert.equal(
    JSON.stringify(auditEntry?.data ?? {}).includes("SECRET-RAW-CONTENT"),
    false,
  );

  assert.equal(allowed.ok, true);
  if (allowed.ok) {
    assert.equal(allowed.data.inspectMeta.debugMode, true);
    assert.equal(allowed.data.inspectMeta.requestedBy, "qa-owner");
  }
}
