import assert from "node:assert/strict";

import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS2-R2-S3
{
  // Arrange
  let now = 1_700_000_000_000;
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

  const confirmed = service.addSemanticMemory({
    projectId: "proj-1",
    rule: "叙事视角保持第一人称",
    category: "structure",
    confidence: 0.95,
    userConfirmed: true,
  });
  assert.equal(confirmed.ok, true);

  const unconfirmed = service.addSemanticMemory({
    projectId: "proj-1",
    rule: "对白偏口语",
    category: "style",
    confidence: 0.8,
    userConfirmed: false,
  });
  assert.equal(unconfirmed.ok, true);

  now += 35 * 24 * 60 * 60 * 1000;

  // Act
  const recompute = service.dailyDecayRecomputeTrigger();
  const listed = service.listSemanticMemory({ projectId: "proj-1" });

  // Assert
  assert.equal(recompute.ok, true);
  assert.equal(listed.ok, true);
  if (listed.ok) {
    const confirmedRule = listed.data.items.find((item) => item.userConfirmed);
    const mutableRule = listed.data.items.find((item) => !item.userConfirmed);
    assert.equal(confirmedRule?.confidence, 0.95);
    assert.ok((mutableRule?.confidence ?? 1) < 0.8);
  }
}
