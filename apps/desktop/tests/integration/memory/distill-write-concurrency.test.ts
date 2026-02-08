import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerMemoryIpcHandlers } from "../../../main/src/ipc/memory";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

// Scenario Mapping: MS2-X-S1
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
  const sender = { id: 11, send: () => {} };

  let concurrentWritePromise:
    | Promise<IpcResponse<{ accepted: true }>>
    | undefined;
  const service = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => 1_700_000_000_000,
    distillScheduler: (job) => job(),
    distillLlm: ({ snapshotEpisodes, trigger }) => {
      const manualRecordHandler = handlers.get("memory:episode:record");
      if (manualRecordHandler && trigger === "manual") {
        concurrentWritePromise = manualRecordHandler(
          { sender },
          {
            projectId: "proj-1",
            chapterId: "chapter-concurrent",
            sceneType: "action",
            skillUsed: "continue",
            inputContext: "并发写入上下文",
            candidates: ["A"],
            selectedIndex: 0,
            finalText: "并发写入内容",
            editDistance: 0.1,
          },
        ) as Promise<IpcResponse<{ accepted: true }>>;
      }

      return [
        {
          rule: "动作场景偏好短句",
          category: "pacing",
          confidence: 0.88,
          supportingEpisodes: snapshotEpisodes.map((episode) => episode.id),
          contradictingEpisodes: [],
        },
      ];
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

  const recordHandler = handlers.get("memory:episode:record");
  const distillHandler = handlers.get("memory:semantic:distill");
  const listHandler = handlers.get("memory:semantic:list");
  assert.ok(recordHandler, "Missing handler memory:episode:record");
  assert.ok(distillHandler, "Missing handler memory:semantic:distill");
  assert.ok(listHandler, "Missing handler memory:semantic:list");

  for (let i = 0; i < 50; i += 1) {
    const response = (await recordHandler!(
      { sender },
      {
        projectId: "proj-1",
        chapterId: `chapter-${i}`,
        sceneType: "action",
        skillUsed: "continue",
        inputContext: "动作上下文",
        candidates: ["A", "B"],
        selectedIndex: 0,
        finalText: `片段-${i}`,
        editDistance: 0.1,
      },
    )) as IpcResponse<{ accepted: true }>;
    assert.equal(response.ok, true);
  }

  // Act
  const distill = (await distillHandler!(
    { sender },
    { projectId: "proj-1", trigger: "manual" },
  )) as IpcResponse<{ accepted: true }>;

  assert.ok(concurrentWritePromise);
  const concurrentWrite = (await concurrentWritePromise) as IpcResponse<{
    accepted: true;
  }>;
  const listed = (await listHandler!(
    { sender },
    { projectId: "proj-1" },
  )) as IpcResponse<{
    items: Array<{ supportingEpisodes: string[] }>;
  }>;

  // Assert
  assert.equal(distill.ok, true);
  assert.equal(concurrentWrite.ok, true);

  const snapshot = repository.dump();
  assert.equal(snapshot.episodes.length, 51);

  assert.equal(listed.ok, true);
  if (listed.ok) {
    const generated = listed.data.items.find((item) => item.supportingEpisodes);
    assert.equal(generated?.supportingEpisodes.length, 50);
  }
}
