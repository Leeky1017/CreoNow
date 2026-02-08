import assert from "node:assert/strict";

import {
  assembleMemoryLayers,
  type EpisodeRecord,
  type SemanticMemoryRulePlaceholder,
  type WorkingMemoryLayerItem,
} from "../../../main/src/services/memory/episodicMemoryService";

// Scenario Mapping: MS1-R1-S1
{
  // Arrange
  const working: WorkingMemoryLayerItem[] = [
    {
      id: "wm-1",
      projectId: "proj-1",
      sessionId: "sess-1",
      kind: "editor-focus",
      tokenCount: 180,
      importance: 0.92,
      createdAt: 1,
      updatedAt: 2,
      content: "当前章节战斗片段",
    },
  ];

  const episodes: EpisodeRecord[] = [
    {
      id: "ep-1",
      projectId: "proj-1",
      scope: "project",
      version: 1,
      chapterId: "chapter-7",
      sceneType: "action",
      skillUsed: "continue",
      inputContext: "战斗场景",
      candidates: ["A", "B", "C"],
      selectedIndex: 1,
      finalText: "主角拔剑突进",
      editDistance: 0.15,
      implicitSignal: "LIGHT_EDIT",
      implicitWeight: 0.45,
      importance: 0.8,
      recallCount: 0,
      compressed: false,
      userConfirmed: false,
      createdAt: 3,
      updatedAt: 3,
    },
  ];

  const semanticRules: SemanticMemoryRulePlaceholder[] = [
    {
      id: "rule-1",
      projectId: "proj-1",
      scope: "project",
      version: 1,
      rule: "动作场景偏好短句",
      confidence: 0.87,
      createdAt: 4,
      updatedAt: 4,
    },
  ];

  // Act
  const assembled = assembleMemoryLayers({
    projectId: "proj-1",
    sessionId: "sess-1",
    working,
    episodes,
    semanticRules,
  });

  // Assert
  assert.equal(assembled.immediate.items.length, 1);
  assert.equal(assembled.immediate.items[0]?.id, "wm-1");
  assert.equal(assembled.episodic.items.length, 1);
  assert.equal(assembled.episodic.items[0]?.id, "ep-1");
  assert.equal(assembled.settings.rules.length, 1);
  assert.equal(assembled.settings.rules[0]?.rule, "动作场景偏好短句");
  assert.equal(assembled.settings.memoryDegraded, false);
}
