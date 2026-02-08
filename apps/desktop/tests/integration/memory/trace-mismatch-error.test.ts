import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";
import type { MemoryTraceService } from "../../../main/src/services/memory/memoryTraceService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS3-X-S1
{
  // Arrange
  const handlers = new Map<
    string,
    (event: unknown, payload: unknown) => Promise<unknown>
  >();
  const ipcMain = {
    handle: (
      channel: string,
      handler: (event: unknown, payload: unknown) => Promise<unknown>,
    ) => {
      handlers.set(channel, handler);
    },
  };

  const episodic = createEpisodicMemoryService({
    repository: createInMemoryEpisodeRepository(),
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
  });

  const traceService: MemoryTraceService = {
    getTrace: () => ({
      ok: false,
      error: {
        code: "MEMORY_TRACE_MISMATCH",
        message: "Trace payload mismatch",
      },
    }),
    recordFeedback: () => ({
      ok: true,
      data: {
        accepted: true,
        feedbackId: "fb-1",
      },
    }),
    upsertTrace: () => {},
    listFeedbackForGeneration: () => [],
  };

  registerMemoryIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: {} as Database.Database,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    episodicService: episodic,
    traceService,
  });

  const traceGetHandler = handlers.get("memory:trace:get");
  assert.ok(traceGetHandler, "Missing handler memory:trace:get");

  // Act
  const response = (await traceGetHandler!(
    {},
    { projectId: "proj-1", generationId: "missing" },
  )) as IpcResponse<{ trace: unknown }>;

  // Assert
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "MEMORY_TRACE_MISMATCH");
  }
}
