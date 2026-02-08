import assert from "node:assert/strict";

import {
  WORKING_MEMORY_TOKEN_BUDGET,
  createWorkingMemoryBudgetState,
  writeWorkingMemoryEntry,
} from "../../../renderer/src/stores/memoryStore";

// Scenario Mapping: MS1-R1-S2
{
  // Arrange
  let state = createWorkingMemoryBudgetState();

  state = writeWorkingMemoryEntry(state, {
    id: "focus",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "editor-focus",
    tokenCount: 2200,
    importance: 0.95,
    focusScore: 1,
    createdAt: 1,
    updatedAt: 1,
    content: "当前焦点段落",
  });

  state = writeWorkingMemoryEntry(state, {
    id: "old-intent",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "intent-stack",
    tokenCount: 3300,
    importance: 0.05,
    focusScore: 0,
    createdAt: 1,
    updatedAt: 1,
    content: "旧意图",
  });

  state = writeWorkingMemoryEntry(state, {
    id: "mid",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "ai-context",
    tokenCount: 2600,
    importance: 0.35,
    focusScore: 0.2,
    createdAt: 1,
    updatedAt: 1,
    content: "中等重要上下文",
  });

  // Act
  state = writeWorkingMemoryEntry(state, {
    id: "new-focus",
    projectId: "proj-1",
    sessionId: "sess-1",
    kind: "editor-focus",
    tokenCount: 1500,
    importance: 0.9,
    focusScore: 1,
    createdAt: 2,
    updatedAt: 2,
    content: "新焦点",
  });

  // Assert
  assert.ok(state.tokenTotal <= WORKING_MEMORY_TOKEN_BUDGET);
  assert.equal(
    state.items.some((item) => item.id === "old-intent"),
    false,
  );
  assert.equal(
    state.items.some((item) => item.id === "new-focus"),
    true,
  );
}
