import assert from "node:assert/strict";

import {
  archiveAndClearWorkingMemory,
  createWorkingMemoryBudgetState,
  writeWorkingMemoryEntry,
} from "../../../renderer/src/stores/memoryStore";

// Scenario Mapping: MS1-R1-S3
{
  // Arrange
  let state = createWorkingMemoryBudgetState();

  state = writeWorkingMemoryEntry(state, {
    id: "sig-high",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "preference-signal",
    tokenCount: 120,
    importance: 0.82,
    focusScore: 0.3,
    createdAt: 1,
    updatedAt: 1,
    content: "动作场景偏好短句",
  });

  state = writeWorkingMemoryEntry(state, {
    id: "sig-low",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "preference-signal",
    tokenCount: 80,
    importance: 0.2,
    focusScore: 0,
    createdAt: 1,
    updatedAt: 1,
    content: "临时偏好信号",
  });

  // Act
  const archived = archiveAndClearWorkingMemory(state, {
    projectId: "proj-1",
    chapterId: "chapter-7",
    sessionId: "sess-1",
    archiveThreshold: 0.6,
    sceneType: "action",
    skillUsed: "continue",
  });

  // Assert
  assert.equal(archived.archivedSignals.length, 1);
  assert.equal(archived.archivedSignals[0]?.projectId, "proj-1");
  assert.equal(archived.archivedSignals[0]?.chapterId, "chapter-7");
  assert.equal(
    archived.archivedSignals[0]?.implicitSignalHint,
    "REPEATED_SCENE_SKILL",
  );
  assert.equal(archived.discardedSignals, 1);
  assert.equal(archived.nextState.items.length, 0);
  assert.equal(archived.nextState.tokenTotal, 0);
}
