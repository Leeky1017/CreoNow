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

// Scenario Mapping: MS3-R2-S2
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

  const feedbackCalls: Array<{
    projectId: string;
    generationId: string;
    verdict: "correct" | "incorrect";
    reason?: string;
  }> = [];

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
        message: "Trace not found",
      },
    }),
    recordFeedback: (payload: {
      projectId: string;
      generationId: string;
      verdict: "correct" | "incorrect";
      reason?: string;
    }) => {
      feedbackCalls.push(payload);
      return {
        ok: true,
        data: {
          accepted: true,
          feedbackId: "fb-1",
        },
      };
    },
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

  const feedbackHandler = handlers.get("memory:trace:feedback");
  assert.ok(feedbackHandler, "Missing handler memory:trace:feedback");

  // Act
  const response = (await feedbackHandler!(
    {},
    {
      projectId: "proj-1",
      generationId: "gen-1",
      verdict: "incorrect",
      reason: "不相关的规则",
    },
  )) as IpcResponse<{ accepted: true }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.accepted, true);
  }
  assert.equal(feedbackCalls.length, 1);
  assert.deepEqual(feedbackCalls[0], {
    projectId: "proj-1",
    generationId: "gen-1",
    verdict: "incorrect",
    reason: "不相关的规则",
  });
}
