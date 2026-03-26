import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  EPISODIC_ACTIVE_BUDGET,
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS1-X-S2 + IPC failure path
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

  const repository = createInMemoryEpisodeRepository();
  repository.seedEpisodes(
    Array.from({ length: EPISODIC_ACTIVE_BUDGET }, (_v, idx) => ({
      id: `protected-${idx}`,
      projectId: "proj-1",
      scope: "project" as const,
      version: 1 as const,
      chapterId: "chapter-1",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "ctx",
      candidates: ["A"],
      selectedIndex: 0,
      finalText: "protected",
      editDistance: 0,
      implicitSignal: "DIRECT_ACCEPT" as const,
      implicitWeight: 1,
      importance: 1,
      recallCount: 99,
      compressed: false,
      userConfirmed: true,
      createdAt: 1_700_000_000_000 - idx,
      updatedAt: 1_700_000_000_000 - idx,
    })),
  );

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
      chapterId: "chapter-2",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "ctx",
      candidates: ["A"],
      selectedIndex: 0,
      finalText: "new text",
      editDistance: 0,
    },
  )) as IpcResponse<{ accepted: true; retryCount: number; episodeId: string }>;

  // Assert
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "MEMORY_CAPACITY_EXCEEDED");
  }
}
