import assert from "node:assert/strict";

import {
  calculateDecayScore,
  classifyDecayLevel,
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS2-R2-S1
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
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "很长的动作上下文".repeat(60),
      candidates: ["A", "B", "C"],
      selectedIndex: 0,
      finalText: "动作描写".repeat(120),
      editDistance: 0.1,
      implicitSignal: "LIGHT_EDIT",
      implicitWeight: 0.45,
      importance: 1,
      recallCount: 0,
      compressed: false,
      userConfirmed: false,
      createdAt: now - 17 * 24 * 60 * 60 * 1000,
      updatedAt: now - 17 * 24 * 60 * 60 * 1000,
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
  const decay = calculateDecayScore({
    ageInDays: 17,
    recallCount: 0,
    importance: 1,
  });
  const level = classifyDecayLevel(decay);
  const recompute = service.dailyDecayRecomputeTrigger();
  const compressed = service.weeklyCompressTrigger({ projectId: "proj-1" });

  // Assert
  assert.ok(decay > 0.1 && decay < 0.3);
  assert.equal(level, "to_compress");
  assert.equal(recompute.ok, true);
  assert.equal(compressed.ok, true);

  const snapshot = repository.dump();
  const item = snapshot.episodes.find((episode) => episode.id === "ep-1");
  assert.equal(item?.compressed, true);
  assert.equal((item?.inputContext.length ?? 0) <= 800, true);
  assert.equal((item?.finalText.length ?? 0) <= 800, true);
}
