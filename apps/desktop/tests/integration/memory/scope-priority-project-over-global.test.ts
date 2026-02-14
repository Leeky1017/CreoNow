import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-R1-S1
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

  const addHandler = handlers.get("memory:semantic:add");
  const queryHandler = handlers.get("memory:episode:query");
  assert.ok(addHandler, "Missing handler memory:semantic:add");
  assert.ok(queryHandler, "Missing handler memory:episode:query");

  const globalAdded = (await addHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "偏好第一人称",
      category: "style",
      confidence: 0.8,
      scope: "global",
    },
  )) as IpcResponse<{ item: { id: string } }>;
  assert.equal(globalAdded.ok, true);

  const projectAdded = (await addHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "使用第三人称全知",
      category: "style",
      confidence: 0.9,
      scope: "project",
    },
  )) as IpcResponse<{ item: { id: string } }>;
  assert.equal(projectAdded.ok, true);

  // Act
  const queried = (await queryHandler!(
    {},
    {
      projectId: "proj-1",
      sceneType: "narration",
      queryText: "人称偏好",
    },
  )) as IpcResponse<{
    semanticRules: Array<{ rule: string; scope: "project" | "global" }>;
  }>;

  // Assert
  assert.equal(queried.ok, true);
  if (queried.ok) {
    const rules = queried.data.semanticRules;
    assert.equal(
      rules.some((rule) => rule.rule === "使用第三人称全知"),
      true,
      "expected project-scoped rule to be injected",
    );
    assert.equal(
      rules.some((rule) => rule.rule === "偏好第一人称"),
      false,
      "expected conflicting global rule to be ignored",
    );
    const selected = rules.find((rule) => rule.rule === "使用第三人称全知");
    assert.equal(selected?.scope, "project");
  }
}
