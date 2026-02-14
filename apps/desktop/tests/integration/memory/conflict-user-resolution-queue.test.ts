import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS2-R3-S2
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

  const service = createEpisodicMemoryService({
    repository: createInMemoryEpisodeRepository(),
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => 1_700_000_000_000,
    distillLlm: () => [
      {
        rule: "动作场景偏好长句",
        category: "pacing",
        confidence: 0.9,
        supportingEpisodes: ["ep-a"],
        contradictingEpisodes: ["ep-b"],
      },
      {
        rule: "动作场景偏好短句",
        category: "pacing",
        confidence: 0.9,
        supportingEpisodes: ["ep-c"],
        contradictingEpisodes: ["ep-d"],
      },
    ],
  });

  registerMemoryIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db: {} as Database.Database,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    episodicService: service,
  });

  const distillHandler = handlers.get("memory:semantic:distill");
  const listHandler = handlers.get("memory:semantic:list");
  assert.ok(distillHandler, "Missing handler memory:semantic:distill");
  assert.ok(listHandler, "Missing handler memory:semantic:list");

  // Act
  const distill = (await distillHandler!(
    {},
    { projectId: "proj-1", trigger: "manual" },
  )) as IpcResponse<{ accepted: true }>;
  const listed = (await listHandler!(
    {},
    { projectId: "proj-1" },
  )) as IpcResponse<{
    items: Array<{ confidence: number }>;
    conflictQueue: Array<{ status: "pending" | "resolved" }>;
  }>;

  // Assert
  assert.equal(distill.ok, true);
  assert.equal(listed.ok, true);
  if (listed.ok) {
    assert.equal(listed.data.conflictQueue.length, 1);
    assert.equal(listed.data.conflictQueue[0]?.status, "pending");
    assert.equal(
      listed.data.items.every((item) => item.confidence < 0.9),
      true,
    );
  }
}
