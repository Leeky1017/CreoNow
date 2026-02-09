import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

function textForTokens(tokens: number): string {
  return "x".repeat(tokens * 4);
}

// Scenario Mapping: CE2-R1-S2
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [{ source: "kg:entities", content: textForTokens(900) }],
    }),
    settings: async () => ({
      chunks: [{ source: "memory:semantic", content: textForTokens(1000) }],
    }),
    retrieved: async () => ({
      chunks: [{ source: "rag:retrieve", content: textForTokens(500) }],
    }),
    immediate: async () => ({
      chunks: [
        { source: "editor:cursor-window", content: textForTokens(5100) },
      ],
    }),
  });

  // Act
  const assembled = await service.assemble({
    projectId: "project-1",
    documentId: "document-1",
    cursorPosition: 8,
    skillId: "continue-writing",
  });

  // Assert
  assert.equal(assembled.tokenCount <= 6000, true);
  assert.equal(assembled.layers.rules.tokenCount, 900);
  assert.equal(assembled.layers.rules.truncated, false);
  assert.equal(assembled.layers.retrieved.tokenCount, 0);
  assert.equal(assembled.layers.retrieved.truncated, true);
  assert.equal(assembled.layers.settings.tokenCount, 200);
  assert.equal(assembled.layers.settings.truncated, true);
  assert.equal(assembled.layers.immediate.tokenCount, 4900);
  assert.equal(assembled.layers.immediate.truncated, true);
}
