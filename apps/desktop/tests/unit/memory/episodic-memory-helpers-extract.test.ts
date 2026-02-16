import assert from "node:assert/strict";

import {
  IMPLICIT_SIGNAL_WEIGHTS,
  assembleMemoryLayers,
  calculateDecayScore,
  classifyDecayLevel,
  resolveImplicitFeedback,
} from "../../../main/src/services/memory/episodicMemoryHelpers";

// Scenario Mapping: aud-h6b Core Path Stabilized
{
  const score = calculateDecayScore({
    ageInDays: 17,
    recallCount: 0,
    importance: 1,
  });
  assert.ok(score > 0.1 && score < 0.3);
  assert.equal(classifyDecayLevel(score), "to_compress");
}

// Scenario Mapping: aud-h6b Error Path Deterministic
{
  const feedback = resolveImplicitFeedback({
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0,
    undoAfterAccept: true,
  });

  assert.equal(feedback.signal, "UNDO_AFTER_ACCEPT");
  assert.equal(feedback.weight, IMPLICIT_SIGNAL_WEIGHTS.UNDO_AFTER_ACCEPT);
}

// Scenario Mapping: aud-h6b Core Path Stabilized
{
  const assembled = assembleMemoryLayers({
    projectId: "project-1",
    sessionId: "session-1",
    working: [],
    episodes: [],
    semanticRules: [],
    memoryDegraded: true,
    fallbackRules: ["fallback-rule"],
  });

  assert.equal(assembled.settings.memoryDegraded, true);
  assert.deepEqual(assembled.settings.fallbackRules, ["fallback-rule"]);
}
