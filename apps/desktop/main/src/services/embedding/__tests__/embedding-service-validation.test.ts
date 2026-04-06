/**
 * embeddingService — input validation, model routing, provider fallback
 *
 * Covers: texts validation (empty, too many, too long, non-string),
 * model alias routing (hash, onnx, default), onnx unavailable fallback,
 * provider policy fallback on timeout.
 */
import { describe, it, expect, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import type { OnnxEmbeddingRuntime } from "../onnxRuntime";
import { createEmbeddingService } from "../embeddingService";

// ── helpers ──────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: vi.fn(), error: vi.fn() };
}

function createSuccessOnnx(dimension = 4): OnnxEmbeddingRuntime {
  return {
    encode: (args) => ({
      ok: true as const,
      data: {
        vectors: args.texts.map(() =>
          Array.from({ length: dimension }, (_, i) => 0.1 * (i + 1)),
        ),
        dimension,
      },
    }),
  };
}

function createFailingOnnx(
  code: "EMBEDDING_RUNTIME_UNAVAILABLE" | "EMBEDDING_DIMENSION_MISMATCH" = "EMBEDDING_RUNTIME_UNAVAILABLE",
  errorMessage = "timeout occurred",
): OnnxEmbeddingRuntime {
  return {
    encode: () => ({
      ok: false as const,
      error: {
        code,
        message: errorMessage,
        details: {
          provider: "cpu",
          modelPath: "/model.onnx",
          error: errorMessage,
        },
      },
    }),
  };
}

// ── input validation ─────────────────────────────────────────────────

describe("embeddingService — input validation", () => {
  it("rejects empty texts array", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: [] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects non-array texts", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: "not an array" as unknown as string[] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects texts exceeding max count (64)", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const texts = Array.from({ length: 65 }, (_, i) => `text-${i}`);
    const res = svc.encode({ texts });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects empty string in texts", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: ["valid", "  "] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects text exceeding max length", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const longText = "a".repeat(8_001);
    const res = svc.encode({ texts: [longText] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

// ── model alias routing ──────────────────────────────────────────────

describe("embeddingService — model routing", () => {
  it("routes hash model to deterministic hash embedding", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: ["hello"], model: "hash" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dimension).toBe(256);
      expect(res.data.vectors.length).toBe(1);
      expect(res.data.vectors[0].length).toBe(256);
    }
  });

  it("routes hash-v1 alias", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: ["hello"], model: "hash-v1" });
    expect(res.ok).toBe(true);
  });

  it("routes local:hash alias", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: ["hello"], model: "local:hash" });
    expect(res.ok).toBe(true);
  });

  it("routes onnx model to onnx runtime", () => {
    const onnx = createSuccessOnnx();
    const svc = createEmbeddingService({
      logger: createLogger(),
      onnxRuntime: onnx,
    });
    const res = svc.encode({ texts: ["hello"], model: "onnx" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dimension).toBe(4);
    }
  });

  it("returns error when onnx requested but runtime not configured", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const res = svc.encode({ texts: ["hello"], model: "onnx" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("MODEL_NOT_READY");
    }
  });

  it("uses default model when model is empty or undefined", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    // Without provider policy and without onnx, default model should log model_not_ready
    const res = svc.encode({ texts: ["hello"] });
    // Should fall through to model_not_ready path for unrecognized default
    expect(res.ok).toBe(false);
  });
});

// ── provider policy with fallback ────────────────────────────────────

describe("embeddingService — provider fallback", () => {
  it("uses primary when it succeeds", () => {
    const svc = createEmbeddingService({
      logger: createLogger(),
      onnxRuntime: createSuccessOnnx(),
      providerPolicy: {
        primaryProvider: "onnx",
        fallback: { enabled: true, provider: "hash" },
      },
    });

    const res = svc.encode({ texts: ["hello"] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dimension).toBe(4); // onnx dimension
    }
  });

  it("falls back to hash when onnx times out", () => {
    const svc = createEmbeddingService({
      logger: createLogger(),
      onnxRuntime: createFailingOnnx("EMBEDDING_RUNTIME_UNAVAILABLE", "timeout occurred"),
      providerPolicy: {
        primaryProvider: "onnx",
        fallback: {
          enabled: true,
          provider: "hash",
          onReasons: ["PRIMARY_TIMEOUT"],
        },
      },
    });

    const res = svc.encode({ texts: ["hello"] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dimension).toBe(256); // hash dimension
    }
  });

  it("returns error when fallback is disabled", () => {
    const svc = createEmbeddingService({
      logger: createLogger(),
      onnxRuntime: createFailingOnnx(),
      providerPolicy: {
        primaryProvider: "onnx",
        fallback: { enabled: false, provider: "hash" },
      },
    });

    const res = svc.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("EMBEDDING_PROVIDER_UNAVAILABLE");
    }
  });

  it("returns EMBEDDING_PROVIDER_UNAVAILABLE when no fallback configured", () => {
    const svc = createEmbeddingService({
      logger: createLogger(),
      onnxRuntime: createFailingOnnx(),
      providerPolicy: {
        primaryProvider: "onnx",
      },
    });

    const res = svc.encode({ texts: ["hello"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("EMBEDDING_PROVIDER_UNAVAILABLE");
    }
  });
});

// ── hash embedding determinism ───────────────────────────────────────

describe("embeddingService — hash embedding determinism", () => {
  it("produces same output for same input", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const r1 = svc.encode({ texts: ["stable text"], model: "hash" });
    const r2 = svc.encode({ texts: ["stable text"], model: "hash" });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.data.vectors).toEqual(r2.data.vectors);
    }
  });

  it("produces different output for different input", () => {
    const svc = createEmbeddingService({ logger: createLogger() });
    const r1 = svc.encode({ texts: ["alpha"], model: "hash" });
    const r2 = svc.encode({ texts: ["beta"], model: "hash" });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.data.vectors[0]).not.toEqual(r2.data.vectors[0]);
    }
  });
});
