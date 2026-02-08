import assert from "node:assert/strict";

import {
  createEpisodicMemoryService,
  type EpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS1-R3-S2
{
  // Arrange
  const failingRepository: EpisodeRepository = {
    insertEpisode: () => {
      throw new Error("unused");
    },
    updateEpisodeSignal: () => false,
    listEpisodesByScene: () => {
      throw new Error("index read failed");
    },
    listEpisodesByProject: () => [],
    markEpisodesRecalled: () => {},
    countEpisodes: () => 0,
    deleteExpiredEpisodes: () => 0,
    deleteLruEpisodes: () => 0,
    compressEpisodes: () => 0,
    purgeCompressedEpisodes: () => 0,
    listSemanticPlaceholders: () => [],
    upsertSemanticPlaceholder: () => {},
    deleteSemanticPlaceholder: () => false,
    clearEpisodesByProject: () => 0,
    clearAllEpisodes: () => 0,
    clearSemanticPlaceholdersByProject: () => 0,
    clearAllSemanticPlaceholders: () => 0,
  };

  const service = createEpisodicMemoryService({
    repository: failingRepository,
    logger: {
      logPath: "<test>",
      info: () => {},
      error: () => {},
    },
    now: () => 1_700_000_000_000,
  });

  // Act
  const result = service.queryEpisodes({
    projectId: "proj-1",
    sceneType: "dialogue",
    queryText: "test",
  });

  // Assert
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.memoryDegraded, true);
    assert.ok(result.data.fallbackRules.length > 0);
    assert.equal(result.data.items.length, 0);
  }
}
