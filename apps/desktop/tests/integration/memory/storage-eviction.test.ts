import assert from "node:assert/strict";

import {
  EPISODIC_ACTIVE_BUDGET,
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS1-R3-S1
{
  // Arrange
  const now = 1_700_000_000_000;
  const repository = createInMemoryEpisodeRepository();
  const service = createEpisodicMemoryService({
    repository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => now,
  });

  const staleTs = now - 181 * 24 * 60 * 60 * 1000;
  repository.seedEpisodes(
    Array.from({ length: EPISODIC_ACTIVE_BUDGET + 12 }, (_v, idx) => ({
      id: `ep-${idx}`,
      projectId: "proj-1",
      scope: "project" as const,
      version: 1 as const,
      chapterId: "chapter-1",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "ctx",
      candidates: ["A"],
      selectedIndex: 0,
      finalText: `text-${idx}`,
      editDistance: 0.1,
      implicitSignal: "LIGHT_EDIT" as const,
      implicitWeight: 0.45,
      importance: idx === 0 ? 1 : 0.05,
      recallCount: idx === 0 ? 100 : 0,
      compressed: false,
      userConfirmed: idx === 0,
      createdAt: idx < 6 ? staleTs : now - idx,
      updatedAt: now - idx,
      lastRecalledAt: idx === 0 ? now : undefined,
    })),
  );

  // Act
  const evicted = service.realtimeEvictionTrigger({ projectId: "proj-1" });

  // Assert
  assert.equal(evicted.ok, true);
  const snapshot = repository.dump();
  const active = snapshot.episodes.filter(
    (item) => item.projectId === "proj-1" && item.compressed === false,
  );
  assert.ok(active.length <= EPISODIC_ACTIVE_BUDGET);
  assert.equal(
    active.some((item) => item.id === "ep-0"),
    true,
  );
  assert.equal(
    active.some((item) => item.createdAt === staleTs && !item.userConfirmed),
    false,
  );
}
