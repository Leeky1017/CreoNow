/**
 * ApiClient — OpenAI-compatible HTTP client for LLM chat completions.
 *
 * Builds request payloads, handles SSE streaming response parsing,
 * integrates with CostTracker for usage recording, and maps HTTP errors
 * via errorMapper.
 *
 * INV-6: Called only from within the Skill pipeline (via ModelRouter).
 * INV-9: Every API call writes to CostTracker; unknown model → cost=0.
 * INV-10: Errors are classified and propagated with context; never silently swallowed.
 */

import { randomUUID } from "node:crypto";

import type { CostTracker, RequestCost } from "./costTracker";
import type { RoutedProvider } from "./modelRouter";
import { buildUpstreamHttpError } from "./errorMapper";

// ─── Types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
  model: string;
}

/** SSE streaming delta from OpenAI-compatible API */
export interface StreamDelta {
  content: string | null;
  role?: string;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: string | null;
}

export interface StreamChunkPayload {
  id: string;
  choices: StreamChoice[];
  usage?: ChatCompletionUsage | null;
}

/** Classified API error */
export interface ApiError {
  kind: "auth" | "rate-limit" | "server" | "network" | "parse" | "unknown";
  status: number | null;
  message: string;
  retryable: boolean;
}

/**
 * Classify an HTTP status or network error into ApiError.
 */
export function classifyError(args: {
  status: number | null;
  message: string;
}): ApiError {
  const { status, message } = args;

  if (status === null) {
    // Network-level error (no HTTP response)
    return { kind: "network", status: null, message, retryable: true };
  }

  if (status === 401 || status === 403) {
    return { kind: "auth", status, message, retryable: false };
  }

  if (status === 429) {
    return { kind: "rate-limit", status, message, retryable: true };
  }

  if (status >= 500) {
    return { kind: "server", status, message, retryable: true };
  }

  return { kind: "unknown", status, message, retryable: false };
}

// ─── SSE Parser ─────────────────────────────────────────────────────

/**
 * Parse an SSE line into a StreamChunkPayload or null.
 * Returns null for comment lines, empty lines, and non-data lines.
 * Returns 'done' string for the [DONE] terminal.
 */
export function parseSSELine(
  line: string,
): StreamChunkPayload | "done" | null {
  const trimmed = line.trim();

  // Empty line or comment
  if (trimmed.length === 0 || trimmed.startsWith(":")) {
    return null;
  }

  // Must start with "data:"
  if (!trimmed.startsWith("data:")) {
    return null;
  }

  const data = trimmed.slice(5).trim();

  // Terminal signal
  if (data === "[DONE]") {
    return "done";
  }

  // Parse JSON payload
  const parsed = JSON.parse(data) as StreamChunkPayload;
  return parsed;
}

/**
 * Parse a full SSE text body into an array of StreamChunkPayload.
 * Stops at [DONE].
 */
export function parseSSEBody(body: string): StreamChunkPayload[] {
  const lines = body.split("\n");
  const chunks: StreamChunkPayload[] = [];

  for (const line of lines) {
    const result = parseSSELine(line);
    if (result === "done") break;
    if (result !== null) {
      chunks.push(result);
    }
  }

  return chunks;
}

// ─── Request Builder ────────────────────────────────────────────────

/**
 * Build the HTTP request for an OpenAI-compatible chat completion.
 */
export function buildChatCompletionRequest(args: {
  provider: RoutedProvider;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}): { url: string; init: RequestInit } {
  const { provider, messages, stream, temperature, maxTokens } = args;

  // Normalize base URL — strip trailing slash
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/v1/chat/completions`;

  const body: ChatCompletionRequest = {
    messages,
    model: provider.model,
    stream: stream ?? false,
  };

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (maxTokens !== undefined) {
    body.max_tokens = maxTokens;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.apiKey) {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
  }

  if (stream) {
    headers["Accept"] = "text/event-stream";
  }

  return {
    url,
    init: {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  };
}

// ─── ApiClient ──────────────────────────────────────────────────────

export interface ApiClient {
  /**
   * Send a non-streaming chat completion request.
   * Records cost via CostTracker after successful response.
   */
  chatCompletion(args: {
    provider: RoutedProvider;
    messages: ChatMessage[];
    skillId: string;
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<{
    response: ChatCompletionResponse;
    cost: RequestCost;
  }>;

  /**
   * Send a streaming chat completion request.
   * Yields parsed SSE chunks. Records cost after stream completes.
   */
  streamChatCompletion(args: {
    provider: RoutedProvider;
    messages: ChatMessage[];
    skillId: string;
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<StreamChunkPayload>;
}

export function createApiClient(deps: {
  costTracker: CostTracker;
  fetchFn?: typeof globalThis.fetch;
}): ApiClient {
  const costTracker = deps.costTracker;
  const fetchFn = deps.fetchFn ?? globalThis.fetch;

  function recordCost(args: {
    usage: ChatCompletionUsage;
    model: string;
    skillId: string;
  }): RequestCost {
    return costTracker.recordUsage(
      {
        promptTokens: args.usage.prompt_tokens,
        completionTokens: args.usage.completion_tokens,
      },
      args.model,
      randomUUID(),
      args.skillId,
    );
  }

  return {
    async chatCompletion(args) {
      const { url, init } = buildChatCompletionRequest({
        provider: args.provider,
        messages: args.messages,
        stream: false,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
      });

      let res: Response;
      try {
        res = await fetchFn(url, {
          ...init,
          signal: args.signal,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error";
        const classified = classifyError({ status: null, message });
        throw Object.assign(new Error(classified.message), {
          apiError: classified,
        });
      }

      if (!res.ok) {
        const ipcErr = await buildUpstreamHttpError({
          res,
          fallbackMessage: `Chat completion failed with status ${res.status}`,
        });
        const classified = classifyError({
          status: res.status,
          message: ipcErr.message,
        });
        throw Object.assign(new Error(classified.message), {
          apiError: classified,
          ipcError: ipcErr,
        });
      }

      const data = (await res.json()) as ChatCompletionResponse;

      // Record cost (INV-9) — unknown model → cost=0 via CostTracker
      const usage: ChatCompletionUsage = data.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const cost = recordCost({
        usage,
        model: args.provider.model,
        skillId: args.skillId,
      });

      return { response: data, cost };
    },

    async *streamChatCompletion(args) {
      const { url, init } = buildChatCompletionRequest({
        provider: args.provider,
        messages: args.messages,
        stream: true,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
      });

      let res: Response;
      try {
        res = await fetchFn(url, {
          ...init,
          signal: args.signal,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error";
        const classified = classifyError({ status: null, message });
        throw Object.assign(new Error(classified.message), {
          apiError: classified,
        });
      }

      if (!res.ok) {
        const ipcErr = await buildUpstreamHttpError({
          res,
          fallbackMessage: `Streaming request failed with status ${res.status}`,
        });
        const classified = classifyError({
          status: res.status,
          message: ipcErr.message,
        });
        throw Object.assign(new Error(classified.message), {
          apiError: classified,
          ipcError: ipcErr,
        });
      }

      if (!res.body) {
        throw new Error("Response body is null — streaming not supported");
      }

      // Track total usage across stream for cost recording
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep incomplete last line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const parsed = parseSSELine(line);
            if (parsed === "done") {
              // Record cost at stream end (INV-9)
              recordCost({
                usage: {
                  prompt_tokens: totalPromptTokens,
                  completion_tokens: totalCompletionTokens,
                  total_tokens: totalPromptTokens + totalCompletionTokens,
                },
                model: args.provider.model,
                skillId: args.skillId,
              });
              return;
            }
            if (parsed !== null) {
              // Accumulate usage if present in chunk
              if (parsed.usage) {
                totalPromptTokens = parsed.usage.prompt_tokens;
                totalCompletionTokens = parsed.usage.completion_tokens;
              }
              yield parsed;
            }
          }
        }

        // Stream ended without [DONE] — still record cost
        recordCost({
          usage: {
            prompt_tokens: totalPromptTokens,
            completion_tokens: totalCompletionTokens,
            total_tokens: totalPromptTokens + totalCompletionTokens,
          },
          model: args.provider.model,
          skillId: args.skillId,
        });
      } finally {
        reader.releaseLock();
      }
    },
  };
}
