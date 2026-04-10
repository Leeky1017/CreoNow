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
      new Date().toISOString(),
    );
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

  async function recordCost(argsForRecord: {
    requestId: string;
    sessionId?: string;
    skillId: string;
    model: string;
    usage: CompletionUsage;
    startedAtMs: number;
  }): Promise<ServiceResult<true>> {
    try {
      const tracked = args.costTracker.recordUsage(
        {
          promptTokens: argsForRecord.usage.promptTokens,
          completionTokens: argsForRecord.usage.completionTokens,
        },
        argsForRecord.model,
        argsForRecord.requestId,
        argsForRecord.skillId,
        argsForRecord.usage.cachedTokens,
      );

      if (tracked.warning === "COST_MODEL_NOT_FOUND") {
        args.logger.info("ai_cost_model_not_found", {
          requestId: argsForRecord.requestId,
          model: argsForRecord.model,
        });
      }

      insertCostRecord({
        db: args.db,
        id: argsForRecord.requestId,
        sessionId: argsForRecord.sessionId ?? null,
        model: argsForRecord.model,
        usage: argsForRecord.usage,
        durationMs: now() - argsForRecord.startedAtMs,
        estimatedCostUsd: tracked.cost,
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
    let usage: CompletionUsage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
    };
    try {
      const response = await fetchImpl(
        buildApiUrl({
          baseUrl: callArgs.provider.baseUrl,
          endpointPath: "/v1/chat/completions",
        }),
        {
          method: "POST",
          signal: callArgs.signal,
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
      );

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
                mapped.details,
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
                invalidShape.error.details,
                costRes.error,
              ),
            },
          };
        }
        return ipcError("LLM_API_ERROR", "Invalid OpenAI response shape", undefined, {
          retryable: false,
        });
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
        },
      };
    } catch (error) {
      const costRes = await recordCost({
        requestId,
        sessionId: callArgs.sessionId,
        skillId: callArgs.skillId,
        model: callArgs.provider.model,
        usage,
        startedAtMs,
      });
      if (!costRes.ok) {
        const networkError = ipcError(
          "LLM_API_ERROR",
          error instanceof Error ? error.message : "AI request failed",
          undefined,
          { retryable: true },
        );
        return {
          ok: false,
          error: {
            ...networkError.error,
            details: mergePersistenceErrorDetails(
              networkError.error.details,
              costRes.error,
            ),
          },
        };
      }
      return ipcError(
        "LLM_API_ERROR",
        error instanceof Error ? error.message : "AI request failed",
        undefined,
        { retryable: true },
      );
    }
  }

  async function streamChatCompletion(
    callArgs: StreamChatCompletionArgs,
  ): Promise<ServiceResult<CompletionResult>> {
    const requestId = callArgs.requestId ?? randomUUID();
    const startedAtMs = now();
    let usage: CompletionUsage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
    };
    let content = "";

    try {
      const response = await fetchImpl(
        buildApiUrl({
          baseUrl: callArgs.provider.baseUrl,
          endpointPath: "/v1/chat/completions",
        }),
        {
          method: "POST",
          signal: callArgs.signal,
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
      );

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
                mapped.details,
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
                missingBody.error.details,
                costRes.error,
              ),
            },
          };
        }
        return ipcError(
          "INTERNAL",
          "Missing streaming response body",
          undefined,
          { retryable: false },
        );
      }

      for await (const event of readSse({ body: response.body })) {
        if (event.data === "[DONE]") {
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
                  invalidSse.error.details,
                  costRes.error,
                ),
              },
            };
          }
          return ipcError(
            "LLM_API_ERROR",
            "Invalid SSE JSON payload",
            { requestId, data: event.data.slice(0, 200) },
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
        },
      };
    } catch (error) {
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
          "LLM_API_ERROR",
          error instanceof Error ? error.message : "Streaming request failed",
          undefined,
          { retryable: true },
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
        "LLM_API_ERROR",
        error instanceof Error ? error.message : "Streaming request failed",
        undefined,
        { retryable: true },
      );
    }
  }

  return {
    createChatCompletion,
    streamChatCompletion,
  };
}
