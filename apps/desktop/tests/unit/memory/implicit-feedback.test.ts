import assert from "node:assert/strict";

import {
  IMPLICIT_SIGNAL_WEIGHTS,
  resolveImplicitFeedback,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS1-R2-S2
{
  // Arrange
  const input = {
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0,
    undoAfterAccept: true,
  };

  // Act
  const feedback = resolveImplicitFeedback(input);

  // Assert
  assert.equal(feedback.signal, "UNDO_AFTER_ACCEPT");
  assert.equal(feedback.weight, IMPLICIT_SIGNAL_WEIGHTS.UNDO_AFTER_ACCEPT);
}

// Scenario Mapping: MS1-R2-S2 (weight accumulation)
{
  // Arrange
  const input = {
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0.3,
    repeatedSceneSkillCount: 3,
  };

  // Act
  const feedback = resolveImplicitFeedback(input);

  // Assert
  assert.equal(feedback.signal, "REPEATED_SCENE_SKILL");
  assert.equal(
    feedback.weight,
    IMPLICIT_SIGNAL_WEIGHTS.REPEATED_SCENE_SKILL * 3,
  );
}
