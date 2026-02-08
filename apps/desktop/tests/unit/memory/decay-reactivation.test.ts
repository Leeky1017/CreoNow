import assert from "node:assert/strict";

import { createEpisodicMemoryService } from "../../../main/src/services/memory/episodicMemoryService";
import { createInMemoryEpisodeRepository } from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS2-R2-S2
{
  // Arrange
  const now = 1_700_000_000_000;
  const repository = createInMemoryEpisodeRepository();
  repository.seedEpisodes([
    {
      id: "ep-1",
      projectId: "proj-1",
      scope: "project",
      version: 1,
      chapterId: "chapter-1",
      sceneType: "dialogue",
      skillUsed: "continue",
      inputContext: "对白上下文",
      candidates: ["A", "B"],
      selectedIndex: 0,
      finalText: "她轻声说。",
      editDistance: 0.1,
      implicitSignal: "LIGHT_EDIT",
      implicitWeight: 0.45,
      importance: 1,
      recallCount: 0,
      compressed: false,
      userConfirmed: false,
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      updatedAt: now - 10 * 24 * 60 * 60 * 1000,
    },
  ]);

  const service = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => now,
  });

  // Act
  const before = service.dailyDecayRecomputeTrigger();
  assert.equal(before.ok, true);

  for (let i = 0; i < 3; i += 1) {
    const recalled = service.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      queryText: "对白",
    });
    assert.equal(recalled.ok, true);
  }

  const after = service.dailyDecayRecomputeTrigger();
  assert.equal(after.ok, true);

  // Assert
  const snapshot = repository.dump();
  const item = snapshot.episodes.find((episode) => episode.id === "ep-1");
  assert.equal(item?.decayLevel, "active");
  assert.ok((item?.decayScore ?? 0) >= 0.7);
}
