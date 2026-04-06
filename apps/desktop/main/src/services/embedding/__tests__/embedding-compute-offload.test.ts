/**
 * embeddingComputeOffload — offload orchestration, timeout, abort, error mapping
 *
 * Covers: successful compute offload, timeout failure mapping, abort handling,
 * error status mapping.
 */
import { describe, it, expect, vi } from "vitest";

import {
  createEmbeddingComputeOffload,
  type EmbeddingComputeRunner,
} from "../embeddingComputeOffload";

// ── helpers ──────────────────────────────────────────────────────────

function createSuccessRunner(): EmbeddingComputeRunner {
  return {
    run: async (args) => {
      const result = await args.execute(new AbortController().signal);
      return { status: "completed" as const, value: result };
    },
  };
}

function createTimeoutRunner(): EmbeddingComputeRunner {
  return {
    run: async () => ({
      status: "timeout" as const,
      error: new Error("operation timed out"),
    }),
  };
}

function createErrorRunner(): EmbeddingComputeRunner {
  return {
    run: async () => ({
      status: "error" as const,
      error: new Error("compute crashed"),
    }),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe("embeddingComputeOffload — success path", () => {
  it("returns encoding result from compute runner", async () => {
    const offload = createEmbeddingComputeOffload({
      computeRunner: createSuccessRunner(),
      encodeOnCompute: async (args) => ({
        ok: true,
        data: {
          vectors: args.texts.map(() => [0.1, 0.2, 0.3]),
          dimension: 3,
        },
      }),
    });

    const res = await offload.encode({ texts: ["hello"] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dimension).toBe(3);
      expect(res.data.vectors.length).toBe(1);
    }
  });
});

describe("embeddingComputeOffload — timeout handling", () => {
  it("maps timeout to ENCODING_FAILED", async () => {
    const offload = createEmbeddingComputeOffload({
      computeRunner: createTimeoutRunner(),
      encodeOnCompute: async () => ({
        ok: true,
        data: { vectors: [], dimension: 0 },
      }),
    });

    const res = await offload.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("ENCODING_FAILED");
      const details = res.error.details as Record<string, unknown>;
      expect(details.status).toBe("timeout");
    }
  });
});

describe("embeddingComputeOffload — error handling", () => {
  it("maps compute error to ENCODING_FAILED", async () => {
    const offload = createEmbeddingComputeOffload({
      computeRunner: createErrorRunner(),
      encodeOnCompute: async () => ({
        ok: true,
        data: { vectors: [], dimension: 0 },
      }),
    });

    const res = await offload.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("ENCODING_FAILED");
      const details = res.error.details as Record<string, unknown>;
      expect(details.status).toBe("error");
    }
  });

  it("catches thrown errors from compute runner", async () => {
    const offload = createEmbeddingComputeOffload({
      computeRunner: {
        run: async () => {
          throw new Error("unexpected crash");
        },
      },
      encodeOnCompute: async () => ({
        ok: true,
        data: { vectors: [], dimension: 0 },
      }),
    });

    const res = await offload.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("ENCODING_FAILED");
    }
  });
});

describe("embeddingComputeOffload — propagates encode errors", () => {
  it("passes through encoding failure from compute", async () => {
    const offload = createEmbeddingComputeOffload({
      computeRunner: createSuccessRunner(),
      encodeOnCompute: async () => ({
        ok: false,
        error: {
          code: "INVALID_ARGUMENT" as const,
          message: "texts too long",
        },
      }),
    });

    const res = await offload.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("embeddingComputeOffload — default timeout", () => {
  it("uses custom defaultTimeoutMs", async () => {
    const runSpy = vi.fn().mockImplementation(async (args: { execute: (s: AbortSignal) => Promise<unknown>; timeoutMs?: number }) => {
      return {
        status: "completed" as const,
        value: await args.execute(new AbortController().signal),
      };
    });

    const offload = createEmbeddingComputeOffload({
      computeRunner: { run: runSpy },
      encodeOnCompute: async () => ({
        ok: true,
        data: { vectors: [[0.1]], dimension: 1 },
      }),
      defaultTimeoutMs: 10_000,
    });

    await offload.encode({ texts: ["hello"] });
    expect(runSpy).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 10_000 }),
    );
  });
});
