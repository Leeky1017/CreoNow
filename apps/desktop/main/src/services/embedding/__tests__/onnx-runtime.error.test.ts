import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createEmbeddingService } from "../embeddingService";
import { createOnnxEmbeddingRuntime } from "../onnxRuntime";

type LogEntry = {
  event: string;
  data: Record<string, unknown> | undefined;
};

function createLogger(entries: LogEntry[]): Logger {
  return {
    logPath: "<test>",
    info: (event, data) => {
      entries.push({ event, data });
    },
    error: (event, data) => {
      entries.push({ event, data });
    },
  };
}

// Scenario Mapping: S3-ONNX-S2
{
  const logs: LogEntry[] = [];
  const logger = createLogger(logs);
  const runtime = createOnnxEmbeddingRuntime({
    logger,
    modelPath: "/models/missing.onnx",
    provider: "cpu",
    dimension: 4,
    createSession: () => {
      throw new Error("ENOENT: model not found");
    },
  });
  const embedding = createEmbeddingService({
    logger,
    onnxRuntime: runtime,
  });

  const encoded = embedding.encode({
    texts: ["alpha"],
    model: "onnx",
  });
  assert.equal(encoded.ok, false);
  if (encoded.ok) {
    throw new Error("expected runtime unavailable failure");
  }
  assert.equal(encoded.error.code, "MODEL_NOT_READY");
  assert.equal(
    (encoded.error.details as Record<string, unknown>).runtimeCode,
    "EMBEDDING_RUNTIME_UNAVAILABLE",
  );

  const log = logs.find((entry) => entry.event === "embedding_runtime_error");
  assert.ok(log, "expected embedding_runtime_error log");
  assert.equal(log?.data?.provider, "cpu");
  assert.equal(log?.data?.modelPath, "/models/missing.onnx");
  assert.equal(
    String(log?.data?.error ?? "").includes("ENOENT"),
    true,
    "log should contain runtime error text",
  );
}

// Scenario Mapping: S3-ONNX-S3
{
  const logs: LogEntry[] = [];
  const logger = createLogger(logs);
  const runtime = createOnnxEmbeddingRuntime({
    logger,
    modelPath: "/models/dim.onnx",
    provider: "cpu",
    dimension: 4,
    createSession: () => ({
      embed: () => [0.1, 0.2, 0.3],
    }),
  });
  const embedding = createEmbeddingService({
    logger,
    onnxRuntime: runtime,
  });

  const encoded = embedding.encode({
    texts: ["alpha"],
    model: "onnx",
  });
  assert.equal(encoded.ok, false);
  if (encoded.ok) {
    throw new Error("expected dimension mismatch failure");
  }
  assert.equal(encoded.error.code, "ENCODING_FAILED");
  assert.equal(
    (encoded.error.details as Record<string, unknown>).runtimeCode,
    "EMBEDDING_DIMENSION_MISMATCH",
  );
  assert.equal(
    (encoded.error.details as Record<string, unknown>).expectedDimension,
    4,
  );
  assert.equal(
    (encoded.error.details as Record<string, unknown>).actualDimension,
    3,
  );
}
