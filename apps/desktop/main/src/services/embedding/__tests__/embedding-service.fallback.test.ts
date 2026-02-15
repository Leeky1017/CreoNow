import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import type { OnnxEmbeddingRuntime } from "../onnxRuntime";
import { createEmbeddingService } from "../embeddingService";

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

function createTimeoutRuntime(): OnnxEmbeddingRuntime {
  return {
    encode: () => {
      return {
        ok: false,
        error: {
          code: "EMBEDDING_RUNTIME_UNAVAILABLE",
          message: "primary timeout",
          details: {
            provider: "cpu",
            modelPath: "/models/primary.onnx",
            error: "ETIMEDOUT: primary provider timeout",
          },
        },
      };
    },
  };
}

// Scenario Mapping: S3-ES-S2
{
  const logs: LogEntry[] = [];
  const logger = createLogger(logs);

  const embedding = createEmbeddingService({
    logger,
    onnxRuntime: createTimeoutRuntime(),
    providerPolicy: {
      primaryProvider: "onnx",
      fallback: {
        enabled: true,
        provider: "hash",
      },
    },
  });

  const encoded = embedding.encode({
    texts: ["fallback text"],
  });

  assert.equal(encoded.ok, true);
  if (!encoded.ok) {
    throw new Error("S3-ES-S2: expected fallback provider result");
  }

  assert.equal(encoded.data.dimension, 256);
  assert.equal(encoded.data.vectors.length, 1);

  const warning = logs.find(
    (entry) => entry.event === "embedding_provider_fallback",
  );
  assert.ok(warning, "S3-ES-S2: expected structured fallback warning");
  assert.equal(warning?.data?.primaryProvider, "onnx");
  assert.equal(warning?.data?.fallbackProvider, "hash");
  assert.equal(warning?.data?.reason, "PRIMARY_TIMEOUT");
}

// Scenario Mapping: S3-ES-S3
{
  const logs: LogEntry[] = [];
  const logger = createLogger(logs);

  const embedding = createEmbeddingService({
    logger,
    onnxRuntime: createTimeoutRuntime(),
    providerPolicy: {
      primaryProvider: "onnx",
      fallback: {
        enabled: false,
        provider: "hash",
      },
    },
  });

  const encoded = embedding.encode({
    texts: ["no fallback"],
  });

  assert.equal(encoded.ok, false);
  if (encoded.ok) {
    throw new Error("S3-ES-S3: expected explicit provider unavailable failure");
  }

  assert.equal(encoded.error.code, "EMBEDDING_PROVIDER_UNAVAILABLE");

  const fallbackWarning = logs.find(
    (entry) => entry.event === "embedding_provider_fallback",
  );
  assert.equal(
    Boolean(fallbackWarning),
    false,
    "S3-ES-S3: fallback disabled must not emit fallback warning",
  );
}
