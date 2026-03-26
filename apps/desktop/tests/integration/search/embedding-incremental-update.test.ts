import assert from "node:assert/strict";

import { createEmbeddingService } from "../../../main/src/services/embedding/embeddingService";
import type { Logger } from "../../../main/src/logging/logger";
import { createSemanticChunkIndexService } from "../../../main/src/services/embedding/semanticChunkIndexService";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

// Scenario Mapping: SR2-R1-S3
{
  // Arrange
  const logger = createLogger();
  const embedding = createEmbeddingService({ logger });
  const service = createSemanticChunkIndexService({
    logger,
    embedding,
    defaultModel: "hash-v1",
  });

  const firstText = [
    "第一段：旧内容。",
    "第二段：旧内容。",
    "第三段：旧内容。",
  ].join("\n\n");

  const secondText = [
    "第一段：旧内容。",
    "第二段：新内容。",
    "第三段：旧内容。",
  ].join("\n\n");

  const first = service.upsertDocument({
    projectId: "proj_1",
    documentId: "doc_1",
    contentText: firstText,
    updatedAt: 100,
  });

  // Act
  const second = service.upsertDocument({
    projectId: "proj_1",
    documentId: "doc_1",
    contentText: secondText,
    updatedAt: 200,
  });

  // Assert
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.data.changedChunkIds.length, 3);
  }

  assert.equal(second.ok, true);
  if (second.ok) {
    assert.equal(second.data.changedChunkIds.length, 1);
    assert.equal(second.data.unchangedChunkIds.length, 2);
    assert.equal(second.data.changedChunkIds[0]?.includes("doc_1"), true);
  }
}
