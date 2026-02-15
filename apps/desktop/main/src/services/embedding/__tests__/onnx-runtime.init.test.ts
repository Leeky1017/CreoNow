import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createSemanticChunkIndexService } from "../semanticChunkIndexService";
import { createEmbeddingService } from "../embeddingService";
import { createOnnxEmbeddingRuntime } from "../onnxRuntime";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

// Scenario Mapping: S3-ONNX-S1
{
  const logger = createLogger();
  let initCount = 0;
  const runtime = createOnnxEmbeddingRuntime({
    logger,
    modelPath: "/models/mini-embedding.onnx",
    provider: "cpu",
    dimension: 4,
    createSession: () => {
      initCount += 1;
      return {
        embed: (text) => {
          const seed = text.length;
          return [seed, seed + 1, seed + 2, seed + 3];
        },
      };
    },
  });
  const embedding = createEmbeddingService({
    logger,
    onnxRuntime: runtime,
  });

  const encoded = embedding.encode({
    texts: ["alpha", "beta"],
    model: "onnx",
  });
  assert.equal(encoded.ok, true);
  if (!encoded.ok) {
    throw new Error("expected onnx encode to succeed");
  }
  assert.equal(encoded.data.dimension, 4);
  assert.equal(encoded.data.vectors.length, 2);
  assert.equal(encoded.data.vectors[0]?.length, 4);

  const semantic = createSemanticChunkIndexService({
    logger,
    embedding,
    defaultModel: "onnx",
  });
  const upserted = semantic.upsertDocument({
    projectId: "proj-onnx",
    documentId: "doc-1",
    contentText: "alpha paragraph",
    updatedAt: 1739385600,
    model: "onnx",
  });
  assert.equal(upserted.ok, true);
  if (!upserted.ok) {
    throw new Error("expected semantic upsert to succeed");
  }

  const searched = semantic.search({
    projectId: "proj-onnx",
    queryText: "alpha",
    topK: 5,
    minScore: -1,
    model: "onnx",
  });
  assert.equal(searched.ok, true);
  if (!searched.ok) {
    throw new Error("expected semantic search to succeed");
  }
  assert.equal(searched.data.chunks.length, 1);

  const encodedAgain = embedding.encode({
    texts: ["gamma"],
    model: "onnx",
  });
  assert.equal(encodedAgain.ok, true);
  assert.equal(initCount, 1, "onnx session should initialize once");
}
