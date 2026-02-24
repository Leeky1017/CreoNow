import type { BackgroundTaskResult } from "../utilityprocess/backgroundTaskRunner";
import type { EmbeddingEncodeResult, ServiceResult } from "./embeddingService";

const DEFAULT_TIMEOUT_MS = 5_000;

type ComputeRunArgs<T> = {
  execute: (signal: AbortSignal) => Promise<T>;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type EmbeddingComputeRunner = {
  run: <T>(args: ComputeRunArgs<T>) => Promise<BackgroundTaskResult<T>>;
};

export type EmbeddingComputeOffload = {
  encode: (args: {
    texts: readonly string[];
    model?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  }) => Promise<ServiceResult<EmbeddingEncodeResult>>;
};

function toFailureResult(
  status: Exclude<BackgroundTaskResult<unknown>["status"], "completed">,
  error: Error,
): ServiceResult<EmbeddingEncodeResult> {
  return {
    ok: false,
    error: {
      code: "ENCODING_FAILED",
      message: "Embedding compute offload failed",
      details: {
        status,
        error: error.message,
      },
    },
  };
}

export function createEmbeddingComputeOffload(args: {
  computeRunner: EmbeddingComputeRunner;
  encodeOnCompute: (args: {
    texts: readonly string[];
    model?: string;
    signal: AbortSignal;
  }) =>
    | ServiceResult<EmbeddingEncodeResult>
    | Promise<ServiceResult<EmbeddingEncodeResult>>;
  defaultTimeoutMs?: number;
}): EmbeddingComputeOffload {
  const defaultTimeoutMs =
    typeof args.defaultTimeoutMs === "number" &&
    Number.isFinite(args.defaultTimeoutMs) &&
    args.defaultTimeoutMs > 0
      ? Math.floor(args.defaultTimeoutMs)
      : DEFAULT_TIMEOUT_MS;

  return {
    encode: async (encodeArgs) => {
      try {
        const runResult = await args.computeRunner.run({
          timeoutMs: encodeArgs.timeoutMs ?? defaultTimeoutMs,
          signal: encodeArgs.signal,
          execute: async (signal) => {
            return await args.encodeOnCompute({
              texts: encodeArgs.texts,
              model: encodeArgs.model,
              signal,
            });
          },
        });

        if (runResult.status !== "completed") {
          return toFailureResult(runResult.status, runResult.error);
        }

        return runResult.value;
      } catch (error) {
        return toFailureResult(
          "error",
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "unknown error"),
        );
      }
    },
  };
}
