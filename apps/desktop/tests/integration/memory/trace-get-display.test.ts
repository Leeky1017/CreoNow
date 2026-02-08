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

// Scenario Mapping: MS3-R2-S1
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
    getTrace: ({
      projectId,
      generationId,
    }: {
      projectId: string;
      generationId: string;
    }) => {
      if (projectId !== "proj-1" || generationId !== "gen-1") {
        return {
          ok: false,
          error: {
            code: "MEMORY_TRACE_MISMATCH",
            message: "Trace not found",
          },
        };
      }
      return {
        ok: true,
        data: {
          trace: {
            generationId: "gen-1",
            projectId: "proj-1",
            memoryReferences: {
              working: ["wk-1"],
              episodic: ["ep-1"],
              semantic: ["sm-1"],
            },
            influenceWeights: [
              { memoryType: "semantic", referenceId: "sm-1", weight: 0.35 },
              { memoryType: "episodic", referenceId: "ep-1", weight: 0.25 },
              { memoryType: "working", referenceId: "wk-1", weight: 0.2 },
            ],
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        },
      };
    },
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
    { projectId: "proj-1", generationId: "gen-1" },
  )) as IpcResponse<{
    trace: {
      generationId: string;
      memoryReferences: {
        working: string[];
        episodic: string[];
        semantic: string[];
      };
      influenceWeights: Array<{
        memoryType: "working" | "episodic" | "semantic";
        referenceId: string;
        weight: number;
      }>;
    };
  }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.trace.generationId, "gen-1");
    assert.deepEqual(response.data.trace.memoryReferences.semantic, ["sm-1"]);
    assert.equal(response.data.trace.influenceWeights.length, 3);
  }
}
