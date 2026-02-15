import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { embedTextToUnitVector } from "./hashEmbedding";
import type {
  OnnxEmbeddingRuntime,
  OnnxEmbeddingRuntimeError,
} from "./onnxRuntime";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type EmbeddingEncodeResult = { vectors: number[][]; dimension: number };

export type EmbeddingService = {
  /**
   * Encode texts into vectors.
   *
   * Why: both RAG rerank and future vector indexing need a single encoding surface
   * with deterministic, testable error semantics.
   */
  encode: (args: {
    texts: readonly string[];
    model?: string;
  }) => ServiceResult<EmbeddingEncodeResult>;
};

const MAX_TEXTS = 64;
const MAX_TEXT_LENGTH = 8_000;

const HASH_MODEL_ALIASES = new Set([
  "hash",
  "hash-v1",
  "local:hash",
  "local:hash-v1",
]);

const HASH_MODEL_DIMENSION = 256;
const ONNX_MODEL_ALIASES = new Set(["onnx", "onnx-v1", "local:onnx"]);

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function normalizeModelId(model?: string): string {
  const m = typeof model === "string" ? model.trim() : "";
  return m.length === 0 ? "default" : m;
}

function mapOnnxRuntimeError(args: {
  modelId: string;
  logger: Logger;
  error: OnnxEmbeddingRuntimeError;
}): Err {
  const details = {
    model: args.modelId,
    runtimeCode: args.error.code,
    provider: args.error.details.provider,
    modelPath: args.error.details.modelPath,
    ...(args.error.details.error ? { error: args.error.details.error } : {}),
    ...(typeof args.error.details.expectedDimension === "number"
      ? { expectedDimension: args.error.details.expectedDimension }
      : {}),
    ...(typeof args.error.details.actualDimension === "number"
      ? { actualDimension: args.error.details.actualDimension }
      : {}),
  };

  args.logger.error("embedding_runtime_error", details);

  if (args.error.code === "EMBEDDING_RUNTIME_UNAVAILABLE") {
    return ipcError("MODEL_NOT_READY", "Embedding model not ready", details);
  }

  return ipcError("ENCODING_FAILED", "Embedding encoding failed", details);
}

/**
 * Create an embedding service with a deterministic local baseline.
 */
export function createEmbeddingService(deps: {
  logger: Logger;
  onnxRuntime?: OnnxEmbeddingRuntime;
}): EmbeddingService {
  return {
    encode: (args) => {
      if (!Array.isArray(args.texts) || args.texts.length === 0) {
        return ipcError("INVALID_ARGUMENT", "texts is required");
      }
      if (args.texts.length > MAX_TEXTS) {
        return ipcError("INVALID_ARGUMENT", "texts is too large", {
          max: MAX_TEXTS,
        });
      }
      for (const text of args.texts) {
        if (typeof text !== "string" || text.trim().length === 0) {
          return ipcError(
            "INVALID_ARGUMENT",
            "texts must be non-empty strings",
          );
        }
        if (text.length > MAX_TEXT_LENGTH) {
          return ipcError("INVALID_ARGUMENT", "text is too long", {
            maxLength: MAX_TEXT_LENGTH,
          });
        }
      }

      const modelId = normalizeModelId(args.model);
      if (HASH_MODEL_ALIASES.has(modelId)) {
        const vectors = args.texts.map((t) =>
          embedTextToUnitVector({ text: t, dimension: HASH_MODEL_DIMENSION }),
        );
        deps.logger.info("embedding_encode_hash", {
          model: modelId,
          textCount: args.texts.length,
          dimension: HASH_MODEL_DIMENSION,
        });
        return {
          ok: true,
          data: { vectors, dimension: HASH_MODEL_DIMENSION },
        };
      }

      if (ONNX_MODEL_ALIASES.has(modelId)) {
        if (!deps.onnxRuntime) {
          return mapOnnxRuntimeError({
            modelId,
            logger: deps.logger,
            error: {
              code: "EMBEDDING_RUNTIME_UNAVAILABLE",
              message: "ONNX runtime not configured",
              details: {
                provider: "cpu",
                modelPath: "<unset>",
                error: "ONNX runtime not configured",
              },
            },
          });
        }

        const encoded = deps.onnxRuntime.encode({
          texts: args.texts,
        });
        if (!encoded.ok) {
          return mapOnnxRuntimeError({
            modelId,
            logger: deps.logger,
            error: encoded.error,
          });
        }

        deps.logger.info("embedding_encode_onnx", {
          model: modelId,
          textCount: args.texts.length,
          dimension: encoded.data.dimension,
        });
        return {
          ok: true,
          data: encoded.data,
        };
      }

      deps.logger.info("embedding_model_not_ready", {
        textCount: args.texts.length,
        model: modelId,
      });

      if (modelId !== "default") {
        return ipcError("INVALID_ARGUMENT", "Unknown embedding model", {
          model: modelId,
          supported: [...HASH_MODEL_ALIASES.values()].sort(),
        });
      }

      return ipcError("MODEL_NOT_READY", "Embedding model not ready", {
        model: modelId,
      });
    },
  };
}
