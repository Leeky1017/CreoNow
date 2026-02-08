import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS4-X-S2
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
  const service = createEpisodicMemoryService({
    repository: createInMemoryEpisodeRepository(),
    logger: {
      logPath: "<test>",
      info: () => {},
      error: (event: string) => {
        errorEvents.push(event);
      },
    },
    distillLlm: () => {
      throw new Error("network io failed");
    },
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

  const addHandler = handlers.get("memory:semantic:add");
  const distillHandler = handlers.get("memory:semantic:distill");
  const queryHandler = handlers.get("memory:episode:query");

  assert.ok(addHandler, "Missing handler memory:semantic:add");
  assert.ok(distillHandler, "Missing handler memory:semantic:distill");
  assert.ok(queryHandler, "Missing handler memory:episode:query");

  const addBaseline = (await addHandler!(
    {},
    {
      projectId: "proj-1",
      rule: "已有偏好规则",
      category: "style",
      confidence: 0.7,
      scope: "project",
    },
  )) as IpcResponse<{ item: { id: string } }>;
  assert.equal(addBaseline.ok, true);

  // Act
  const distill = (await distillHandler!(
    {},
    { projectId: "proj-1", trigger: "manual" },
  )) as IpcResponse<{ accepted: true; runId: string }>;

  const queried = (await queryHandler!(
    {},
    { projectId: "proj-1", sceneType: "dialogue", queryText: "测试" },
  )) as IpcResponse<{
    memoryDegraded: boolean;
    fallbackRules: string[];
    semanticRules: Array<{ rule: string }>;
  }>;

  // Assert
  assert.equal(distill.ok, false);
  assert.equal(queried.ok, true);
  if (queried.ok) {
    assert.equal(queried.data.memoryDegraded, true);
    assert.equal(queried.data.fallbackRules.length > 0, true);
    assert.equal(
      queried.data.semanticRules.some((rule) => rule.rule === "已有偏好规则"),
      true,
    );
  }
  assert.equal(
    errorEvents.includes("MEMORY_DEGRADE_DISTILL_IO_FAILED"),
    true,
    "expected distill IO degrade event",
  );
}
