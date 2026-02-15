import type { Logger } from "../../logging/logger";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: OnnxEmbeddingRuntimeError };
export type RuntimeResult<T> = Ok<T> | Err;

export type OnnxEmbeddingRuntimeErrorCode =
  | "EMBEDDING_RUNTIME_UNAVAILABLE"
  | "EMBEDDING_DIMENSION_MISMATCH";

export type OnnxEmbeddingRuntimeError = {
  code: OnnxEmbeddingRuntimeErrorCode;
  message: string;
  details: {
    provider: string;
    modelPath: string;
    error?: string;
    expectedDimension?: number;
    actualDimension?: number;
  };
};

export type OnnxEmbeddingEncodeResult = {
  vectors: number[][];
  dimension: number;
};

export type OnnxEmbeddingRuntime = {
  encode: (args: {
    texts: readonly string[];
  }) => RuntimeResult<OnnxEmbeddingEncodeResult>;
};

export type OnnxEmbeddingSession = {
  embed: (text: string) => readonly number[];
};

export type OnnxEmbeddingSessionFactory = (args: {
  modelPath: string;
  provider: string;
  dimension: number;
}) => OnnxEmbeddingSession;

function defaultCreateSession(_args: {
  modelPath: string;
  provider: string;
  dimension: number;
}): OnnxEmbeddingSession {
  throw new Error("onnx runtime adapter unavailable");
}

function runtimeError(args: {
  code: OnnxEmbeddingRuntimeErrorCode;
  message: string;
  provider: string;
  modelPath: string;
  error?: string;
  expectedDimension?: number;
  actualDimension?: number;
}): Err {
  return {
    ok: false,
    error: {
      code: args.code,
      message: args.message,
      details: {
        provider: args.provider,
        modelPath: args.modelPath,
        ...(args.error ? { error: args.error } : {}),
        ...(typeof args.expectedDimension === "number"
          ? { expectedDimension: args.expectedDimension }
          : {}),
        ...(typeof args.actualDimension === "number"
          ? { actualDimension: args.actualDimension }
          : {}),
      },
    },
  };
}

/**
 * Create an ONNX embedding runtime with lazy one-time session initialization.
 *
 * Why: keep model init deterministic and centralize runtime/dimension failures.
 */
export function createOnnxEmbeddingRuntime(deps: {
  logger: Logger;
  modelPath: string;
  provider: string;
  dimension: number;
  createSession?: OnnxEmbeddingSessionFactory;
}): OnnxEmbeddingRuntime {
  const provider =
    deps.provider.trim().length > 0 ? deps.provider.trim() : "cpu";
  const modelPath = deps.modelPath.trim();
  const dimension = Math.max(1, Math.floor(deps.dimension));
  const createSession = deps.createSession ?? defaultCreateSession;
  let session: OnnxEmbeddingSession | null = null;

  const ensureSession = (): RuntimeResult<OnnxEmbeddingSession> => {
    if (session) {
      return { ok: true, data: session };
    }

    try {
      session = createSession({ modelPath, provider, dimension });
      deps.logger.info("embedding_onnx_runtime_initialized", {
        provider,
        modelPath,
        dimension,
      });
      return { ok: true, data: session };
    } catch (error) {
      return runtimeError({
        code: "EMBEDDING_RUNTIME_UNAVAILABLE",
        message: "ONNX runtime initialization failed",
        provider,
        modelPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    encode: (args) => {
      const initialized = ensureSession();
      if (!initialized.ok) {
        return initialized;
      }

      const vectors: number[][] = [];
      for (const text of args.texts) {
        let vector: readonly number[];
        try {
          vector = initialized.data.embed(text);
        } catch (error) {
          return runtimeError({
            code: "EMBEDDING_RUNTIME_UNAVAILABLE",
            message: "ONNX runtime inference failed",
            provider,
            modelPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        if (vector.length !== dimension) {
          return runtimeError({
            code: "EMBEDDING_DIMENSION_MISMATCH",
            message: "ONNX output dimension mismatch",
            provider,
            modelPath,
            expectedDimension: dimension,
            actualDimension: vector.length,
          });
        }

        vectors.push(Array.from(vector));
      }

      return {
        ok: true,
        data: {
          vectors,
          dimension,
        },
      };
    },
  };
}
