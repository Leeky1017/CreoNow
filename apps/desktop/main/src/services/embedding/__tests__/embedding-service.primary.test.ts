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

// Scenario Mapping: S3-ES-S1
{
  const logs: LogEntry[] = [];
  const logger = createLogger(logs);

  const onnxRuntime: OnnxEmbeddingRuntime = {
    encode: () => {
      return {
        ok: true,
        data: {
          vectors: [[0.11, 0.22, 0.33, 0.44]],
          dimension: 4,
        },
      };
    },
  };

  const embedding = createEmbeddingService({
    logger,
    onnxRuntime,
    providerPolicy: {
      primaryProvider: "onnx",
      fallback: {
        enabled: true,
        provider: "hash",
      },
    },
  });

  const encoded = embedding.encode({
    texts: ["alpha"],
  });

  assert.equal(encoded.ok, true);
  if (!encoded.ok) {
    throw new Error("S3-ES-S1: expected primary provider result");
  }

  assert.equal(encoded.data.dimension, 4);
  assert.deepEqual(encoded.data.vectors[0], [0.11, 0.22, 0.33, 0.44]);

  const fallbackWarning = logs.find(
    (entry) => entry.event === "embedding_provider_fallback",
  );
  assert.equal(
    Boolean(fallbackWarning),
    false,
    "S3-ES-S1: should not emit fallback warning when primary succeeds",
  );
}
