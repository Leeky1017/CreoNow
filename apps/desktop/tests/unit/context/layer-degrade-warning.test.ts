import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

// Scenario Mapping: CE1-R1-S2
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [{ source: "constraints:policy", content: "严格第一人称叙述" }],
      warnings: ["KG_UNAVAILABLE"],
    }),
    settings: async () => ({ chunks: [] }),
    retrieved: async () => ({ chunks: [] }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "测试段落" }],
    }),
  });

  // Act
  const assembled = await service.assemble({
    projectId: "project-2",
    documentId: "document-2",
    cursorPosition: 12,
    skillId: "continue-writing",
  });

  // Assert
  assert.equal(assembled.warnings.includes("KG_UNAVAILABLE"), true);
  assert.deepEqual(assembled.layers.rules.source, ["constraints:policy"]);
  assert.equal(assembled.layers.rules.tokenCount > 0, true);
}

// Scenario Mapping: CE-DEGRADE-S1
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => {
      throw new Error("rules unavailable");
    },
    settings: async () => {
      throw new Error("settings unavailable");
    },
    retrieved: async () => {
      throw new Error("retrieved unavailable");
    },
    immediate: async () => {
      throw new Error("immediate unavailable");
    },
  });

  // Act
  const assembled = await service.assemble({
    projectId: "project-all-degrade",
    documentId: "document-all-degrade",
    cursorPosition: 0,
    skillId: "continue-writing",
  });

  // Assert
  assert.equal(assembled.prompt.trim().length > 0, true);
  assert.equal(assembled.warnings.includes("KG_UNAVAILABLE"), true);
  assert.equal(assembled.warnings.includes("SETTINGS_UNAVAILABLE"), true);
  assert.equal(assembled.warnings.includes("RAG_UNAVAILABLE"), true);
  assert.equal(assembled.warnings.includes("IMMEDIATE_UNAVAILABLE"), true);
  assert.equal(assembled.layers.rules.tokenCount, 0);
  assert.equal(assembled.layers.settings.tokenCount, 0);
  assert.equal(assembled.layers.retrieved.tokenCount, 0);
  assert.equal(assembled.layers.immediate.tokenCount, 0);
}
