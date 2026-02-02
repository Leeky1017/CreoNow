import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { embedTextToUnitVector } from "./hashEmbedding";

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

/**
 * Create an embedding service with a deterministic local baseline.
 */
export function createEmbeddingService(deps: { logger: Logger }): EmbeddingService {
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
          return ipcError("INVALID_ARGUMENT", "texts must be non-empty strings");
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

