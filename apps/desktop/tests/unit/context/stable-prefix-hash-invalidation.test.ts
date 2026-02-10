import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

// Scenario Mapping: CE3-R1-S2
{
  // Arrange
  let callIndex = 0;
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [
        {
          source: "kg:rules",
          content:
            callIndex === 0
              ? '{"constraints":[{"id":"r-1","priority":9}],"timestamp":1111111111111}'
              : '{"timestamp":2222222222222,"constraints":[{"priority":9,"id":"r-1"}]}',
        },
      ],
    }),
    settings: async () => ({
      chunks: [
        {
          source: "memory:semantic",
          content:
            callIndex === 0
              ? '{"constraints":[{"id":"s-1","priority":5}],"requestId":"req-1"}'
              : '{"requestId":"req-2","constraints":[{"id":"s-1","priority":5},{"id":"s-2","priority":1}]}',
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
    additionalInput: "timestamp=170001",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });

  callIndex = 1;
  const second = await service.assemble({
    projectId: "project-1",
    documentId: "doc-1",
    cursorPosition: 8,
    skillId: "continue-writing",
    additionalInput: "timestamp=170002",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });

  // Assert
  assert.notEqual(first.stablePrefixHash, second.stablePrefixHash);
  assert.equal(second.stablePrefixUnchanged, false);
}

// Scenario Mapping: CE3-R1-S2 + nondeterministic guard
{
  // Arrange
  let phase: "first" | "second" = "first";
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [
        {
          source: "kg:rules",
          content:
            phase === "first"
              ? '{"constraints":[{"id":"r-2","priority":3},{"id":"r-1","priority":6}],"requestId":"req-a","timestamp":101}'
              : '{"timestamp":202,"constraints":[{"priority":6,"id":"r-1"},{"priority":3,"id":"r-2"}],"requestId":"req-b"}',
        },
      ],
    }),
    settings: async () => ({
      chunks: [
        {
          source: "memory:semantic",
          content:
            phase === "first"
              ? '{"constraints":[{"id":"s-1","priority":2}],"nonce":"nonce-a"}'
              : '{"nonce":"nonce-b","constraints":[{"priority":2,"id":"s-1"}]}',
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
    projectId: "project-2",
    documentId: "doc-1",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });

  phase = "second";
  const second = await service.assemble({
    projectId: "project-2",
    documentId: "doc-1",
    cursorPosition: 8,
    skillId: "continue-writing",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokenizerVersion: "1.0.0",
  });

  // Assert
  assert.equal(first.stablePrefixHash, second.stablePrefixHash);
  assert.equal(second.stablePrefixUnchanged, true);
}
