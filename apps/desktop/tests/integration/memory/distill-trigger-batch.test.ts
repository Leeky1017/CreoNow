import assert from "node:assert/strict";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS2-R1-S1
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

  const pushes: Array<{ channel: string; payload: unknown }> = [];
  const sender = {
    id: 1,
    send: (channel: string, payload: unknown) => {
      pushes.push({ channel, payload });
    },
  };

  const repository = createInMemoryEpisodeRepository();
  const episodic = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => 1_700_000_000_000,
    distillScheduler: (job) => job(),
    distillLlm: () => [
      {
        rule: "动作场景偏好短句",
        category: "pacing",
        confidence: 0.87,
        supportingEpisodes: [],
        contradictingEpisodes: [],
      },
    ],
    onDistillProgress: (event) => {
      pushes.push({ channel: "memory:distill:progress", payload: event });
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
    episodicService: episodic,
  });

  const recordHandler = handlers.get("memory:episode:record");
  const semanticListHandler = handlers.get("memory:semantic:list");
  assert.ok(recordHandler, "Missing handler memory:episode:record");
  assert.ok(semanticListHandler, "Missing handler memory:semantic:list");

  // Act
  for (let i = 0; i < 50; i += 1) {
    const response = (await recordHandler!(
      { sender },
      {
        projectId: "proj-1",
        chapterId: `chapter-${i}`,
        sceneType: "action",
        skillUsed: "continue",
        inputContext: "动作场景上下文",
        candidates: ["A", "B"],
        selectedIndex: 0,
        finalText: `片段-${i}`,
        editDistance: 0.1,
      },
    )) as IpcResponse<{ accepted: true }>;
    assert.equal(response.ok, true);
  }

  const semantic = (await semanticListHandler!(
    { sender },
    { projectId: "proj-1" },
  )) as IpcResponse<{ items: Array<{ rule: string }> }>;

  // Assert
  assert.equal(semantic.ok, true);
  if (semantic.ok) {
    assert.equal(
      semantic.data.items.some((item) =>
        item.rule.includes("动作场景偏好短句"),
      ),
      true,
    );
  }
  assert.equal(
    pushes.some((event) => event.channel === "memory:distill:progress"),
    true,
  );
}
