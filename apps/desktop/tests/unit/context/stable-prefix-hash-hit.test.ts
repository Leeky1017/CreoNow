import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

// Scenario Mapping: CE3-R1-S1
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async (request) => ({
      chunks: [
        {
          source: "kg:rules",
          content:
            request.documentId === "doc-1"
              ? '{"constraints":[{"id":"c-2","priority":10},{"id":"c-1","priority":10}],"profile":{"style":"first-person","timestamp":1700000000000,"requestId":"req-1"}}'
              : '{"profile":{"requestId":"req-2","style":"first-person","timestamp":1700009999999},"constraints":[{"priority":10,"id":"c-1"},{"priority":10,"id":"c-2"}]}',
        },
      ],
    }),
    settings: async (request) => ({
      chunks: [
        {
          source: "memory:semantic",
          content:
            request.documentId === "doc-1"
              ? '{"constraints":[{"id":"s-2","priority":3},{"id":"s-1","priority":5}],"timezone":"UTC","nonce":"nonce-1"}'
              : '{"nonce":"nonce-2","timezone":"UTC","constraints":[{"priority":5,"id":"s-1"},{"priority":3,"id":"s-2"}]}',
        },
      ],
    }),
    retrieved: async () => ({ chunks: [] }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "current text" }],
    }),
  });

  // Act
  const first = await service.assemble({
    projectId: "project-1",
    documentId: "doc-1",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });
  const second = await service.assemble({
    projectId: "project-1",
    documentId: "doc-2",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });
  const modelChanged = await service.assemble({
    projectId: "project-1",
    documentId: "doc-2",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-3-7-sonnet",
    tokenizerVersion: "1.0.0",
  });
  const tokenizerChanged = await service.assemble({
    projectId: "project-1",
    documentId: "doc-2",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "2.0.0",
  });

  // Assert
  assert.equal(first.stablePrefixUnchanged, false);
  assert.equal(first.stablePrefixHash, second.stablePrefixHash);
  assert.equal(second.stablePrefixUnchanged, true);
  assert.equal(modelChanged.stablePrefixUnchanged, false);
  assert.equal(tokenizerChanged.stablePrefixUnchanged, false);
}
