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
