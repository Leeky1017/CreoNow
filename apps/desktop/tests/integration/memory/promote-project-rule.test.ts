import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-R1-S2
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
  const promoteHandler = handlers.get("memory:scope:promote");
  const listHandler = handlers.get("memory:semantic:list");
  assert.ok(addHandler, "Missing handler memory:semantic:add");
  assert.ok(promoteHandler, "Missing handler memory:scope:promote");
  assert.ok(listHandler, "Missing handler memory:semantic:list");

  const added = (await addHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "对白避免感叹号",
      category: "vocabulary",
      confidence: 0.92,
      scope: "project",
      userConfirmed: true,
    },
  )) as IpcResponse<{
    item: { id: string; scope: "project" | "global" };
  }>;
  assert.equal(added.ok, true);
  if (!added.ok) {
    throw new Error("failed to add project rule");
  }

  // Act
  const promoted = (await promoteHandler!(
    {},
    { projectId: "proj-1", ruleId: added.data.item.id },
  )) as IpcResponse<{
    item: { id: string; scope: "project" | "global" };
  }>;

  const listed = (await listHandler!(
    {},
    { projectId: "proj-1" },
  )) as IpcResponse<{
    items: Array<{ id: string; scope: "project" | "global" }>;
  }>;

  // Assert
  assert.equal(promoted.ok, true);
  if (promoted.ok) {
    assert.equal(promoted.data.item.scope, "global");
  }

  assert.equal(listed.ok, true);
  if (listed.ok) {
    const target = listed.data.items.find(
      (item) => item.id === added.data.item.id,
    );
    assert.equal(target?.scope, "global");
  }
}
