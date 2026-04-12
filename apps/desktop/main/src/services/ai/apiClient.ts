/**
 * @module apiClient
 * ## 职责：OpenAI-compatible HTTP/SSE 客户端，负责发送 chat completion 请求并解析响应
 * ## 不做什么：不做模型路由（由 modelRouter 负责）、不做 provider 解析
 * ## 依赖方向：ai → shared(ipcResult, errorMapper, costTracker)
 * ## 关键不变量：INV-9（每次调用记录成本）· INV-10（错误保留上下文）
 */

import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { extractOpenAiDelta, extractOpenAiText } from "./aiPayloadParsers";
import type { CostTracker } from "./costTracker";
import { buildUpstreamHttpError } from "./errorMapper";
import { ipcError, type ServiceResult } from "../shared/ipcResult";

type JsonObject = Record<string, unknown>;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

type CompletionUsage = {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
};

type CompletionResult = {
  requestId: string;
  content: string;
  usage: CompletionUsage;
  model: string;
  retryCount?: number;
  persistenceError?: unknown;
};

type StreamChunk = {
  delta: string;
  done: boolean;
};

type OpenAiApiProviderConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs?: number;
};

type CreateChatCompletionArgs = {
  provider: OpenAiApiProviderConfig;
  messages: ChatMessage[];
  skillId: string;
  sessionId?: string;
  requestId?: string;
  signal?: AbortSignal;
};

type StreamChatCompletionArgs = CreateChatCompletionArgs & {
  onChunk?: (chunk: StreamChunk) => void;
};

export type ApiClient = {
  createChatCompletion: (
    args: CreateChatCompletionArgs,
  ) => Promise<ServiceResult<CompletionResult>>;
  streamChatCompletion: (
    args: StreamChatCompletionArgs,
  ) => Promise<ServiceResult<CompletionResult>>;
};

type OpenAiUsagePayload = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  cached_tokens?: unknown;
};

const MAX_FETCH_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as JsonObject;
}

function toNonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function parseUsage(raw: unknown): CompletionUsage {
  const row = asObject(raw) as OpenAiUsagePayload | null;
  if (!row) {
    return { promptTokens: 0, completionTokens: 0, cachedTokens: 0 };
  }
  return {
    promptTokens: toNonNegativeInt(row.prompt_tokens),
    completionTokens: toNonNegativeInt(row.completion_tokens),
    cachedTokens: toNonNegativeInt(row.cached_tokens),
  };
}

function classifyHttpRetryable(status: number): boolean {
  if (status === 429) {
    return true;
  }
  if (status >= 500) {
    return true;
  }
  return false;
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function createAbortError(message: string): Error {
  const abortError = new Error(message);
  abortError.name = "AbortError";
  return abortError;
}

function parseTimeoutMs(timeoutMs: number | undefined): number | undefined {
  return typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.floor(timeoutMs)
    : undefined;
}

function getRetryDelayMs(attemptNumber: number): number {
  return BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attemptNumber - 1);
}

function parseRetryAfterMs(retryAfterValue: string | null, nowMs: number): number | null {
  if (!retryAfterValue) {
    return null;
  }
  const trimmed = retryAfterValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const retrySeconds = Number(trimmed);
  if (Number.isFinite(retrySeconds) && retrySeconds >= 0) {
    return Math.floor(retrySeconds * 1000);
  }

  const retryAt = Date.parse(trimmed);
  if (Number.isFinite(retryAt)) {
    return Math.max(0, retryAt - nowMs);
  }
  return null;
}

function enrichDetailsWithRetryCount(
  details: unknown,
  retryCount: number,
): Record<string, unknown> {
  if (typeof details === "object" && details !== null && !Array.isArray(details)) {
    return {
      ...(details as Record<string, unknown>),
      retryCount,
    };
  }
  return details === undefined
    ? { retryCount }
    : { retryCount, primaryDetails: details };
}

type RetryFetchNetworkError = {
  kind: "network-error";
  cause: unknown;
  retryCount: number;
  abortedByUser: boolean;
};

function isRetryFetchNetworkError(error: unknown): error is RetryFetchNetworkError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: unknown }).kind === "network-error"
  );
}

function sleepWithSignal(args: { delayMs: number; signal?: AbortSignal }): Promise<void> {
  if (args.delayMs <= 0) {
    if (args.signal?.aborted) {
      return Promise.reject(createAbortError("Request aborted"));
    }
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    if (args.signal?.aborted) {
      reject(createAbortError("Request aborted"));
      return;
    }
    const timeout = setTimeout(() => {
      args.signal?.removeEventListener("abort", onAbort);
      resolve();
    }, args.delayMs);
    const onAbort = () => {
      clearTimeout(timeout);
      args.signal?.removeEventListener("abort", onAbort);
      reject(createAbortError("Request aborted"));
    };
    args.signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function buildApiUrl(args: { baseUrl: string; endpointPath: string }): string {
  const base = new URL(args.baseUrl.trim());
  const endpoint = args.endpointPath.startsWith("/")
    ? args.endpointPath
    : `/${args.endpointPath}`;

  if (!base.pathname.endsWith("/")) {
    base.pathname = `${base.pathname}/`;
  }

  const basePathNoSlash = base.pathname.endsWith("/")
    ? base.pathname.slice(0, -1)
    : base.pathname;
  const normalizedEndpoint =
    basePathNoSlash.endsWith("/v1") && endpoint.startsWith("/v1/")
      ? endpoint.slice(3)
      : endpoint;

  return new URL(normalizedEndpoint.slice(1), base.toString()).toString();
}

async function* readSse(args: {
  body: ReadableStream<Uint8Array>;
}): AsyncGenerator<{ event: string | null; data: string }> {
  const decoder = new TextDecoder();
  const reader = args.body.getReader();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      // Flush residual buffer — some upstreams omit trailing blank line.
      const residual = buffer.trim();
      if (residual.length > 0) {
        const lines = residual.split(/\r?\n/);
        let event: string | null = null;
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) {
            event = line.slice("event:".length).trim();
            continue;
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trimStart());
          }
        }
        if (dataLines.length > 0) {
          yield { event, data: dataLines.join("\n") };
        }
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const lfSeparator = buffer.indexOf("\n\n");
      const crlfSeparator = buffer.indexOf("\r\n\r\n");
      const hasLfSeparator = lfSeparator >= 0;
      const hasCrlfSeparator = crlfSeparator >= 0;
      if (!hasLfSeparator && !hasCrlfSeparator) {
        break;
      }

      const useLfSeparator =
        hasLfSeparator && (!hasCrlfSeparator || lfSeparator < crlfSeparator);
      const sepIndex = useLfSeparator ? lfSeparator : crlfSeparator;
      const sepLength = useLfSeparator ? 2 : 4;

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + sepLength);

      const lines = rawEvent.split(/\r?\n/);
      let event: string | null = null;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (dataLines.length > 0) {
        yield { event, data: dataLines.join("\n") };
      }
    }
  }
}

function insertCostRecord(args: {
  db: Database.Database;
  id: string;
  sessionId: string | null;
  model: string;
  usage: CompletionUsage;
  durationMs: number;
  estimatedCostUsd: number;
  now: () => number;
}): void {
  args.db
    .prepare(
      "INSERT INTO cost_records (id, session_id, model, input_tokens, output_tokens, cache_hit_tokens, duration_ms, estimated_cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      args.id,
      args.sessionId,
      args.model,
      args.usage.promptTokens,
      args.usage.completionTokens,
      args.usage.cachedTokens,
      Math.max(0, Math.floor(args.durationMs)),
      args.estimatedCostUsd,
      new Date(args.now()).toISOString(),
    );
}

function estimateCostUsd(args: {
  costTracker: CostTracker;
  logger: Logger;
  requestId: string;
  model: string;
  usage: CompletionUsage;
}): number {
  const pricing = args.costTracker.getPricingTable().prices[args.model];
  if (!pricing) {
    args.logger.info("ai_cost_model_not_found", {
      requestId: args.requestId,
      model: args.model,
    });
    return 0;
  }

  const promptTokens = Math.max(0, args.usage.promptTokens);
  const completionTokens = Math.max(0, args.usage.completionTokens);
  const cachedTokens = Math.max(0, args.usage.cachedTokens);

  const inputCost =
    cachedTokens > 0 && pricing.cachedInputPricePer1K !== undefined
      ? ((Math.max(0, promptTokens - cachedTokens) / 1000) * pricing.inputPricePer1K) +
        ((cachedTokens / 1000) * pricing.cachedInputPricePer1K)
      : (promptTokens / 1000) * pricing.inputPricePer1K;

  const outputCost = (completionTokens / 1000) * pricing.outputPricePer1K;
  return inputCost + outputCost;
}

function mergePersistenceErrorDetails(
  details: unknown,
  persistenceError: unknown,
): Record<string, unknown> {
  if (typeof details === "object" && details !== null && !Array.isArray(details)) {
    return {
      ...(details as Record<string, unknown>),
      persistenceError,
    };
  }
  return details === undefined
    ? { persistenceError }
    : { primaryDetails: details, persistenceError };
}

export function createApiClient(args: {
  db: Database.Database;
  costTracker: CostTracker;
  logger: Logger;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): ApiClient {
  const fetchImpl = args.fetchImpl ?? globalThis.fetch;
  const now = args.now ?? (() => Date.now());

  async function retryFetch(argsForFetch: {
    input: string;
    init: RequestInit;
    userSignal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<{ response: Response; retryCount: number }> {
    const timeoutMs = parseTimeoutMs(argsForFetch.timeoutMs);
    let retryCount = 0;
    const { signal: _ignoredSignal, ...initWithoutSignal } = argsForFetch.init;
    while (true) {
      if (argsForFetch.userSignal?.aborted) {
        throw {
          kind: "network-error",
          cause: createAbortError("Request aborted"),
          retryCount,
          abortedByUser: true,
        } satisfies RetryFetchNetworkError;
      }

      const attemptController = new AbortController();
      let abortedByUser = false;
      const onUserAbort = () => {
        abortedByUser = true;
        attemptController.abort(argsForFetch.userSignal?.reason);
      };
      if (argsForFetch.userSignal) {
        argsForFetch.userSignal.addEventListener("abort", onUserAbort, {
          once: true,
        });
      }

      const timeoutId =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              attemptController.abort(createAbortError("Request timeout"));
            }, timeoutMs);

      try {
        const response = await fetchImpl(argsForFetch.input, {
          ...initWithoutSignal,
          signal: attemptController.signal,
        });
        if (
          response.ok ||
          !classifyHttpRetryable(response.status) ||
          retryCount >= MAX_FETCH_RETRIES
        ) {
          return { response, retryCount };
        }
        retryCount += 1;
        const retryAfterMs = parseRetryAfterMs(
          response.headers.get("Retry-After"),
          now(),
        );
        try {
          await sleepWithSignal({
            delayMs: retryAfterMs ?? getRetryDelayMs(retryCount),
            signal: argsForFetch.userSignal,
          });
        } catch (sleepError) {
          throw {
            kind: "network-error",
            cause: sleepError,
            retryCount,
            abortedByUser:
              isAbortError(sleepError) && argsForFetch.userSignal?.aborted === true,
          } satisfies RetryFetchNetworkError;
        }
      } catch (error) {
        if (isRetryFetchNetworkError(error)) {
          throw error;
        }
        if (isAbortError(error) && (abortedByUser || argsForFetch.userSignal?.aborted)) {
          throw {
            kind: "network-error",
            cause: error,
            retryCount,
            abortedByUser: true,
          } satisfies RetryFetchNetworkError;
        }
        if (retryCount >= MAX_FETCH_RETRIES) {
          throw {
            kind: "network-error",
            cause: error,
            retryCount,
            abortedByUser: false,
          } satisfies RetryFetchNetworkError;
        }
        retryCount += 1;
        try {
          await sleepWithSignal({
            delayMs: getRetryDelayMs(retryCount),
            signal: argsForFetch.userSignal,
          });
        } catch (sleepError) {
          throw {
            kind: "network-error",
            cause: sleepError,
            retryCount,
            abortedByUser:
              isAbortError(sleepError) && argsForFetch.userSignal?.aborted === true,
          } satisfies RetryFetchNetworkError;
        }
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        argsForFetch.userSignal?.removeEventListener("abort", onUserAbort);
      }
    }
  }

  async function recordCost(argsForRecord: {
    requestId: string;
    sessionId?: string;
    skillId: string;
    model: string;
    usage: CompletionUsage;
    startedAtMs: number;
  }): Promise<ServiceResult<true>> {
    try {
      insertCostRecord({
        db: args.db,
        id: argsForRecord.requestId,
        sessionId: argsForRecord.sessionId ?? null,
        model: argsForRecord.model,
        usage: argsForRecord.usage,
        durationMs: now() - argsForRecord.startedAtMs,
        estimatedCostUsd: estimateCostUsd({
          costTracker: args.costTracker,
          logger: args.logger,
          requestId: argsForRecord.requestId,
          model: argsForRecord.model,
          usage: argsForRecord.usage,
        }),
        now,
      });
      return { ok: true, data: true };
    } catch (error) {
      return ipcError(
        "DB_ERROR",
        "Failed to persist AI cost record",
        {
          requestId: argsForRecord.requestId,
          reason: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  async function createChatCompletion(
    callArgs: CreateChatCompletionArgs,
  ): Promise<ServiceResult<CompletionResult>> {
    const requestId = callArgs.requestId ?? randomUUID();
    const startedAtMs = now();
    let retryCount = 0;
    let usage: CompletionUsage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
    };
    try {
      const retryResult = await retryFetch({
        input: buildApiUrl({
          baseUrl: callArgs.provider.baseUrl,
          endpointPath: "/v1/chat/completions",
        }),
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(callArgs.provider.apiKey
              ? { Authorization: `Bearer ${callArgs.provider.apiKey}` }
              : {}),
          },
          body: JSON.stringify({
            model: callArgs.provider.model,
            messages: callArgs.messages,
            temperature: callArgs.provider.temperature,
            max_tokens: callArgs.provider.maxTokens,
            stream: false,
          }),
        },
        userSignal: callArgs.signal,
        timeoutMs: callArgs.provider.timeoutMs,
      });
      const response = retryResult.response;
      retryCount = retryResult.retryCount;

      if (!response.ok) {
        const mapped = await buildUpstreamHttpError({
          res: response,
          fallbackMessage: "AI upstream request failed",
        });
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          return {
            ok: false,
            error: {
              ...mapped,
              retryable: classifyHttpRetryable(response.status),
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(mapped.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return {
          ok: false,
          error: {
            ...mapped,
            retryable: classifyHttpRetryable(response.status),
            details: enrichDetailsWithRetryCount(mapped.details, retryCount),
          },
        };
      }

      const parsed = (await response.json()) as unknown;
      usage = parseUsage(asObject(parsed)?.usage);
      const content = extractOpenAiText(parsed);
      if (!content) {
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          const invalidShape = ipcError(
            "LLM_API_ERROR",
            "Invalid OpenAI response shape",
            undefined,
            {
              retryable: false,
            },
          );
          return {
            ok: false,
            error: {
              ...invalidShape.error,
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(invalidShape.error.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "LLM_API_ERROR",
          "Invalid OpenAI response shape",
          { retryCount },
          {
            retryable: false,
          },
        );
      }

      const costRes = await recordCost({
        requestId,
        sessionId: callArgs.sessionId,
        skillId: callArgs.skillId,
        model: callArgs.provider.model,
        usage,
        startedAtMs,
      });
      if (!costRes.ok) {
        return {
          ok: true,
          data: {
            requestId,
            content,
            usage,
            model: callArgs.provider.model,
            retryCount,
            persistenceError: costRes.error,
          },
        };
      }

      return {
        ok: true,
        data: {
          requestId,
          content,
          usage,
          model: callArgs.provider.model,
          retryCount,
        },
      };
    } catch (error) {
      const retryFailure =
        isRetryFetchNetworkError(error) && error.kind === "network-error"
          ? error
          : {
              kind: "network-error" as const,
              cause: error,
              retryCount,
              abortedByUser:
                isAbortError(error) && callArgs.signal?.aborted === true,
            };
      retryCount = retryFailure.retryCount;
      const aborted = retryFailure.abortedByUser;
      const costRes = await recordCost({
        requestId,
        sessionId: callArgs.sessionId,
        skillId: callArgs.skillId,
        model: callArgs.provider.model,
        usage,
        startedAtMs,
      });
      if (!costRes.ok) {
        const resultError = ipcError(
          aborted ? "CANCELED" : "LLM_API_ERROR",
          retryFailure.cause instanceof Error
            ? retryFailure.cause.message
            : "AI request failed",
          { retryCount },
          { retryable: aborted ? false : true },
        );
        return {
          ok: false,
          error: {
            ...resultError.error,
            details: mergePersistenceErrorDetails(
              resultError.error.details,
              costRes.error,
            ),
          },
        };
      }
      return ipcError(
        aborted ? "CANCELED" : "LLM_API_ERROR",
        retryFailure.cause instanceof Error
          ? retryFailure.cause.message
          : "AI request failed",
        { retryCount },
        { retryable: aborted ? false : true },
      );
    }
  }

  async function streamChatCompletion(
    callArgs: StreamChatCompletionArgs,
  ): Promise<ServiceResult<CompletionResult>> {
    const requestId = callArgs.requestId ?? randomUUID();
    const startedAtMs = now();
    let retryCount = 0;
    let usage: CompletionUsage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
    };
    let content = "";

    try {
      const retryResult = await retryFetch({
        input: buildApiUrl({
          baseUrl: callArgs.provider.baseUrl,
          endpointPath: "/v1/chat/completions",
        }),
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(callArgs.provider.apiKey
              ? { Authorization: `Bearer ${callArgs.provider.apiKey}` }
              : {}),
          },
          body: JSON.stringify({
            model: callArgs.provider.model,
            messages: callArgs.messages,
            temperature: callArgs.provider.temperature,
            max_tokens: callArgs.provider.maxTokens,
            stream: true,
          }),
        },
        userSignal: callArgs.signal,
        timeoutMs: callArgs.provider.timeoutMs,
      });
      const response = retryResult.response;
      retryCount = retryResult.retryCount;

      if (!response.ok) {
        const mapped = await buildUpstreamHttpError({
          res: response,
          fallbackMessage: "AI upstream request failed",
        });
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          return {
            ok: false,
            error: {
              ...mapped,
              retryable: classifyHttpRetryable(response.status),
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(mapped.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return {
          ok: false,
          error: {
            ...mapped,
            retryable: classifyHttpRetryable(response.status),
            details: enrichDetailsWithRetryCount(mapped.details, retryCount),
          },
        };
      }

      if (!response.body) {
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          const missingBody = ipcError(
            "INTERNAL",
            "Missing streaming response body",
            undefined,
            { retryable: false },
          );
          return {
            ok: false,
            error: {
              ...missingBody.error,
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(missingBody.error.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "INTERNAL",
          "Missing streaming response body",
          { retryCount },
          { retryable: false },
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("text/event-stream")) {
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          const protocolError = ipcError(
            "LLM_API_ERROR",
            "Expected text/event-stream response for streaming request",
            { requestId, contentType },
            { retryable: false },
          );
          return {
            ok: false,
            error: {
              ...protocolError.error,
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(protocolError.error.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "LLM_API_ERROR",
          "Expected text/event-stream response for streaming request",
          { requestId, contentType, retryCount },
          { retryable: false },
        );
      }

      let sawSseDataEvent = false;
      let receivedDone = false;
      for await (const event of readSse({ body: response.body })) {
        sawSseDataEvent = true;
        if (event.data === "[DONE]") {
          receivedDone = true;
          break;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          const costRes = await recordCost({
            requestId,
            sessionId: callArgs.sessionId,
            skillId: callArgs.skillId,
            model: callArgs.provider.model,
            usage,
            startedAtMs,
          });
          if (!costRes.ok) {
            const invalidSse = ipcError(
              "LLM_API_ERROR",
              "Invalid SSE JSON payload",
              { requestId, data: event.data.slice(0, 200) },
              { retryable: false },
            );
            return {
              ok: false,
              error: {
                ...invalidSse.error,
                details: mergePersistenceErrorDetails(
                  enrichDetailsWithRetryCount(invalidSse.error.details, retryCount),
                  costRes.error,
                ),
              },
            };
          }
          return ipcError(
            "LLM_API_ERROR",
            "Invalid SSE JSON payload",
            { requestId, data: event.data.slice(0, 200), retryCount },
            { retryable: false },
          );
        }

        const delta = extractOpenAiDelta(parsed);
        if (delta && delta.length > 0) {
          content += delta;
          callArgs.onChunk?.({ delta, done: false });
        }

        const nextUsage = parseUsage(asObject(parsed)?.usage);
        usage = {
          promptTokens: Math.max(usage.promptTokens, nextUsage.promptTokens),
          completionTokens: Math.max(
            usage.completionTokens,
            nextUsage.completionTokens,
          ),
          cachedTokens: Math.max(usage.cachedTokens, nextUsage.cachedTokens),
        };
      }

      if (!sawSseDataEvent) {
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          const protocolError = ipcError(
            "LLM_API_ERROR",
            "Streaming response ended before any SSE data event was received",
            { requestId },
            { retryable: false },
          );
          return {
            ok: false,
            error: {
              ...protocolError.error,
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(protocolError.error.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "LLM_API_ERROR",
          "Streaming response ended before any SSE data event was received",
          { requestId, retryCount },
          { retryable: false },
        );
      }

      if (!receivedDone) {
        const costRes = await recordCost({
          requestId,
          sessionId: callArgs.sessionId,
          skillId: callArgs.skillId,
          model: callArgs.provider.model,
          usage,
          startedAtMs,
        });
        if (!costRes.ok) {
          const streamInterrupted = ipcError(
            "LLM_API_ERROR",
            "Streaming connection interrupted",
            { requestId, partialContent: content },
            { retryable: true },
          );
          return {
            ok: false,
            error: {
              ...streamInterrupted.error,
              details: mergePersistenceErrorDetails(
                enrichDetailsWithRetryCount(streamInterrupted.error.details, retryCount),
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "LLM_API_ERROR",
          "Streaming connection interrupted",
          { requestId, partialContent: content, retryCount },
          { retryable: true },
        );
      }

      callArgs.onChunk?.({ delta: "", done: true });
      const costRes = await recordCost({
        requestId,
        sessionId: callArgs.sessionId,
        skillId: callArgs.skillId,
        model: callArgs.provider.model,
        usage,
        startedAtMs,
      });
      if (!costRes.ok) {
        return {
          ok: true,
          data: {
            requestId,
            content,
            usage,
            model: callArgs.provider.model,
            retryCount,
            persistenceError: costRes.error,
          },
        };
      }

      return {
        ok: true,
        data: {
          requestId,
          content,
          usage,
          model: callArgs.provider.model,
          retryCount,
        },
      };
    } catch (error) {
      const retryFailure =
        isRetryFetchNetworkError(error) && error.kind === "network-error"
          ? error
          : {
              kind: "network-error" as const,
              cause: error,
              retryCount,
              abortedByUser:
                isAbortError(error) && callArgs.signal?.aborted === true,
            };
      retryCount = retryFailure.retryCount;
      const aborted = retryFailure.abortedByUser;
      const costRes = await recordCost({
        requestId,
        sessionId: callArgs.sessionId,
        skillId: callArgs.skillId,
        model: callArgs.provider.model,
        usage,
        startedAtMs,
      });
      if (!costRes.ok) {
        const streamError = ipcError(
          aborted ? "CANCELED" : "LLM_API_ERROR",
          retryFailure.cause instanceof Error
            ? retryFailure.cause.message
            : "Streaming request failed",
          { retryCount },
          { retryable: aborted ? false : true },
        );
        return {
          ok: false,
          error: {
            ...streamError.error,
            details: mergePersistenceErrorDetails(
              streamError.error.details,
              costRes.error,
            ),
          },
        };
      }
      return ipcError(
        aborted ? "CANCELED" : "LLM_API_ERROR",
        retryFailure.cause instanceof Error
          ? retryFailure.cause.message
          : "Streaming request failed",
        { retryCount },
        { retryable: aborted ? false : true },
      );
    }
  }

  return {
    createChatCompletion,
    streamChatCompletion,
  };
}
