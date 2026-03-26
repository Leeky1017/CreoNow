import assert from "node:assert/strict";

import type { EmbeddingEncodeResult, ServiceResult } from "../embeddingService";
import {
  createEmbeddingComputeOffload,
  type EmbeddingComputeRunner,
} from "../embeddingComputeOffload";

/**
 * Scenario: BE-EMR-S2
 * encode should run via compute runner (no main-thread direct inference).
 */
{
  let runCalls = 0;
  let inComputeRunner = false;
  let observedTexts: readonly string[] = [];

  const computeRunner: EmbeddingComputeRunner = {
    run: async (args) => {
      runCalls += 1;
      inComputeRunner = true;
      try {
        const value = await args.execute(new AbortController().signal);
        return {
          status: "completed",
          value,
        };
      } finally {
        inComputeRunner = false;
      }
    },
  };

  const offload = createEmbeddingComputeOffload({
    computeRunner,
    encodeOnCompute: (args): ServiceResult<EmbeddingEncodeResult> => {
      assert.equal(
        inComputeRunner,
        true,
        "encode must execute inside compute runner",
      );
      observedTexts = args.texts;
      return {
        ok: true,
        data: {
          vectors: [[0.12, 0.34, 0.56]],
          dimension: 3,
        },
      };
    },
  });

  const encoded = await offload.encode({
    texts: ["hello offload"],
    model: "default",
  });

  assert.equal(runCalls, 1);
  assert.deepEqual(observedTexts, ["hello offload"]);
  assert.equal(encoded.ok, true);
  if (!encoded.ok) {
    throw new Error("BE-EMR-S2: expected encode result from compute runner");
  }
  assert.equal(encoded.data.dimension, 3);
  assert.deepEqual(encoded.data.vectors, [[0.12, 0.34, 0.56]]);
}
