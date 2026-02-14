import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-R2-S1
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

  const errorEvents: string[] = [];
  const repository = createInMemoryEpisodeRepository();
  const service = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: (event: string) => {
        errorEvents.push(event);
      },
    },
    now: () => 1_700_000_000_000,
    semanticRecall: () => {
      throw new Error("vector index offline");
    },
  } as unknown as Parameters<typeof createEpisodicMemoryService>[0]);

  registerMemoryIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: {} as Database.Database,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: (event: string) => {
        errorEvents.push(event);
      },
    },
    episodicService: service,
  });

  const recordHandler = handlers.get("memory:episode:record");
  const queryHandler = handlers.get("memory:episode:query");
  assert.ok(recordHandler, "Missing handler memory:episode:record");
  assert.ok(queryHandler, "Missing handler memory:episode:query");

  const recorded = (await recordHandler!(
    {},
    {
      projectId: "proj-1",
      chapterId: "chapter-1",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "vector故障",
      candidates: ["A"],
      selectedIndex: 0,
      finalText: "主角挥剑",
      editDistance: 0.1,
    },
  )) as IpcResponse<{ accepted: true }>;
  assert.equal(recorded.ok, true);

  // Act
  const queried = (await queryHandler!(
    {},
    {
      projectId: "proj-1",
      sceneType: "action",
      queryText: "挥剑",
      limit: 3,
    },
  )) as IpcResponse<{
    items: Array<{ id: string }>;
    memoryDegraded: boolean;
  }>;

  // Assert
  assert.equal(queried.ok, true);
  if (queried.ok) {
    assert.equal(queried.data.items.length > 0, true);
    assert.equal(queried.data.memoryDegraded, true);
  }
  assert.equal(
    errorEvents.includes("MEMORY_DEGRADE_VECTOR_OFFLINE"),
    true,
    "expected vector-offline degrade event",
  );
}
