import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

// Scenario Mapping: CE1-R1-S1
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [{ source: "kg:entities", content: "角色：林远" }],
    }),
    settings: async () => ({
      chunks: [{ source: "memory:semantic", content: "动作场景偏好短句" }],
    }),
    retrieved: async () => ({
      chunks: [{ source: "rag:retrieve", content: "第六章相关片段" }],
    }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "当前章节草稿内容" }],
    }),
  });

  // Act
  const assembled = await service.assemble({
    projectId: "project-1",
    documentId: "document-1",
    cursorPosition: 128,
    skillId: "continue-writing",
  });

  // Assert
  assert.deepEqual(assembled.assemblyOrder, [
    "rules",
    "settings",
    "retrieved",
    "immediate",
  ]);
  assert.deepEqual(assembled.layers.rules.source, ["kg:entities"]);
  assert.deepEqual(assembled.layers.settings.source, ["memory:semantic"]);
  assert.deepEqual(assembled.layers.retrieved.source, ["rag:retrieve"]);
  assert.deepEqual(assembled.layers.immediate.source, ["editor:cursor-window"]);
  assert.equal(assembled.layers.rules.tokenCount > 0, true);
  assert.equal(assembled.layers.settings.tokenCount > 0, true);
  assert.equal(assembled.layers.retrieved.tokenCount > 0, true);
  assert.equal(assembled.layers.immediate.tokenCount > 0, true);
}
