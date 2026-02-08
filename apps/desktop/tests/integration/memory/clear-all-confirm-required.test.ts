import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-X-S1
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
  const clearAllHandler = handlers.get("memory:clear:all");
  const listHandler = handlers.get("memory:semantic:list");

  assert.ok(addHandler, "Missing handler memory:semantic:add");
  assert.ok(clearAllHandler, "Missing handler memory:clear:all");
  assert.ok(listHandler, "Missing handler memory:semantic:list");

  const addResult = (await addHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "保留第一人称",
      category: "style",
      confidence: 0.9,
      scope: "project",
    },
  )) as IpcResponse<{ item: { id: string } }>;
  assert.equal(addResult.ok, true);

  // Act
  const clearResult = (await clearAllHandler!(
    {},
    { confirmed: false },
  )) as IpcResponse<{ ok: true }>;

  const listed = (await listHandler!(
    {},
    { projectId: "proj-1" },
  )) as IpcResponse<{ items: Array<{ id: string }> }>;

  // Assert
  assert.equal(clearResult.ok, false);
  if (!clearResult.ok) {
    assert.equal(clearResult.error.code, "MEMORY_CLEAR_CONFIRM_REQUIRED");
  }

  assert.equal(listed.ok, true);
  if (listed.ok) {
    assert.equal(listed.data.items.length, 1);
  }
}
