import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-R1-S3
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

  const addSemanticHandler = handlers.get("memory:semantic:add");
  const recordEpisodeHandler = handlers.get("memory:episode:record");
  const clearProjectHandler = handlers.get("memory:clear:project");
  const clearAllHandler = handlers.get("memory:clear:all");
  const listSemanticHandler = handlers.get("memory:semantic:list");
  const queryEpisodeHandler = handlers.get("memory:episode:query");

  assert.ok(addSemanticHandler, "Missing handler memory:semantic:add");
  assert.ok(recordEpisodeHandler, "Missing handler memory:episode:record");
  assert.ok(clearProjectHandler, "Missing handler memory:clear:project");
  assert.ok(clearAllHandler, "Missing handler memory:clear:all");
  assert.ok(listSemanticHandler, "Missing handler memory:semantic:list");
  assert.ok(queryEpisodeHandler, "Missing handler memory:episode:query");

  const addRule = (await addSemanticHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "动作场景偏好短句",
      category: "pacing",
      confidence: 0.88,
      scope: "project",
    },
  )) as IpcResponse<{ item: { id: string } }>;
  assert.equal(addRule.ok, true);

  const recordEpisode = (await recordEpisodeHandler!(
    {},
    {
      projectId: "proj-1",
      chapterId: "chapter-1",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "战斗",
      candidates: ["候选A"],
      selectedIndex: 0,
      finalText: "主角挥剑",
      editDistance: 0.1,
    },
  )) as IpcResponse<{ accepted: true }>;
  assert.equal(recordEpisode.ok, true);

  // Act
  const clearedProject = (await clearProjectHandler!(
    {},
    { projectId: "proj-1", confirmed: true },
  )) as IpcResponse<{ ok: true }>;

  const listAfterProjectClear = (await listSemanticHandler!(
    {},
    { projectId: "proj-1" },
  )) as IpcResponse<{ items: Array<{ id: string }> }>;

  const queryAfterProjectClear = (await queryEpisodeHandler!(
    {},
    { projectId: "proj-1", sceneType: "action" },
  )) as IpcResponse<{ items: Array<{ id: string }> }>;

  const clearedAll = (await clearAllHandler!(
    {},
    { confirmed: true },
  )) as IpcResponse<{ ok: true }>;

  // Assert
  assert.equal(clearedProject.ok, true);
  assert.equal(clearedAll.ok, true);

  assert.equal(listAfterProjectClear.ok, true);
  if (listAfterProjectClear.ok) {
    assert.equal(listAfterProjectClear.data.items.length, 0);
  }

  assert.equal(queryAfterProjectClear.ok, true);
  if (queryAfterProjectClear.ok) {
    assert.equal(queryAfterProjectClear.data.items.length, 0);
  }
}
