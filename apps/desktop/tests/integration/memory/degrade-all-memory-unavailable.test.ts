import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  type EpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-R2-S2
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
  const repository: EpisodeRepository = {
    insertEpisode: () => {
      throw new Error("unused");
    },
    updateEpisodeSignal: () => false,
    listEpisodesByScene: () => {
      throw new Error("db unavailable");
    },
    listEpisodesByProject: () => {
      throw new Error("db unavailable");
    },
    markEpisodesRecalled: () => {},
    countEpisodes: () => 0,
    deleteExpiredEpisodes: () => 0,
    deleteLruEpisodes: () => 0,
    compressEpisodes: () => 0,
    purgeCompressedEpisodes: () => 0,
    listSemanticPlaceholders: () => {
      throw new Error("db unavailable");
    },
    upsertSemanticPlaceholder: () => {},
    deleteSemanticPlaceholder: () => false,
    clearEpisodesByProject: () => 0,
    clearAllEpisodes: () => 0,
    clearSemanticPlaceholdersByProject: () => 0,
    clearAllSemanticPlaceholders: () => 0,
  };

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
  });

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

  const queryHandler = handlers.get("memory:episode:query");
  assert.ok(queryHandler, "Missing handler memory:episode:query");

  // Act
  const queried = (await queryHandler!(
    {},
    { projectId: "proj-1", sceneType: "dialogue", queryText: "test" },
  )) as IpcResponse<{
    items: Array<unknown>;
    memoryDegraded: boolean;
    fallbackRules: string[];
  }>;

  // Assert
  assert.equal(queried.ok, true);
  if (queried.ok) {
    assert.equal(queried.data.items.length, 0);
    assert.equal(queried.data.memoryDegraded, true);
    assert.equal(queried.data.fallbackRules.length > 0, true);
  }
  assert.equal(
    errorEvents.includes("MEMORY_DEGRADE_ALL_MEMORY_UNAVAILABLE"),
    true,
    "expected all-memory-unavailable degrade event",
  );
}
