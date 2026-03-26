import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS1-X-S1 + IPC success path
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

  const repository = createInMemoryEpisodeRepository({
    failInsertAttempts: 2,
  });
  const episodic = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => 1_700_000_000_000,
  });

  registerMemoryIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: {} as Database.Database,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    episodicService: episodic,
  });

  const handler = handlers.get("memory:episode:record");
  assert.ok(handler, "Missing handler memory:episode:record");

  // Act
  const response = (await handler!(
    {},
    {
      projectId: "proj-1",
      chapterId: "chapter-1",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "ctx",
      candidates: ["A", "B"],
      selectedIndex: 0,
      finalText: "text",
      editDistance: 0.1,
    },
  )) as IpcResponse<{ accepted: true; retryCount: number; episodeId: string }>;

  // Assert
  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.accepted, true);
    assert.equal(response.data.retryCount, 2);
  }
}
