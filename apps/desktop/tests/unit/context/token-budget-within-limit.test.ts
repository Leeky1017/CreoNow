import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

function textForTokens(tokens: number): string {
  return "x".repeat(tokens * 4);
}

// Scenario Mapping: CE2-R1-S1
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [{ source: "kg:entities", content: textForTokens(900) }],
    }),
    settings: async () => ({
      chunks: [{ source: "memory:semantic", content: textForTokens(600) }],
    }),
    retrieved: async () => ({
      chunks: [{ source: "rag:retrieve", content: textForTokens(1000) }],
    }),
    immediate: async () => ({
      chunks: [
        { source: "editor:cursor-window", content: textForTokens(3000) },
      ],
    }),
  });

  // Act
  const budget = service.getBudgetProfile();
  const assembled = await service.assemble({
    projectId: "project-1",
    documentId: "document-1",
    cursorPosition: 8,
    skillId: "continue-writing",
  });

  // Assert
  assert.equal(budget.layers.rules.ratio, 0.15);
  assert.equal(budget.layers.settings.ratio, 0.1);
  assert.equal(budget.layers.retrieved.ratio, 0.25);
  assert.equal(budget.layers.immediate.ratio, 0.5);
  assert.equal(assembled.tokenCount <= 6000, true);
  assert.equal(assembled.layers.rules.truncated, false);
  assert.equal(assembled.layers.settings.truncated, false);
  assert.equal(assembled.layers.retrieved.truncated, false);
  assert.equal(assembled.layers.immediate.truncated, false);
}
