/**
 * AI Streaming Service — 流式响应 + 重试 + 超时 + 取消
 *
 * 指数退避重试（1s→2s→4s，max 3 retries）
 * AbortController 取消
 * partial-result 错误保留 partialContent
 */

export interface StreamChunk {
  delta: string;
  finishReason: "stop" | "tool_use" | null;
  accumulatedTokens: number;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface StreamResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  wasRetried: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface StreamError {
  kind: "retryable" | "non-retryable" | "partial-result";
  message: string;
  retryCount: number;
  partialContent?: string;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onComplete: (result: StreamResult) => void;
  onError: (error: StreamError) => void;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface LLMProxy {
  stream: (
    messages: ChatMessage[],
  ) => AsyncGenerator<StreamChunk>;
  abort: () => void;
}

interface StreamingServiceConfig {
  maxRetries?: number;
  timeoutMs?: number;
}

export interface StreamingService {
  streamChat(
    messages: ChatMessage[],
    options: StreamOptions,
  ): AsyncGenerator<StreamChunk>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createStreamingService(
  proxy: LLMProxy,
  config?: StreamingServiceConfig,
): StreamingService {
  const maxRetries = config?.maxRetries ?? 3;
  const timeoutMs = config?.timeoutMs;

  return {
    async *streamChat(
      messages: ChatMessage[],
      options: StreamOptions,
    ): AsyncGenerator<StreamChunk> {
      let wasRetried = false;
      let attempt = 0;

      while (attempt <= maxRetries) {
        let accumulatedContent = "";
        let lastTokens = 0;

        try {
          // Set up timeout
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          let timedOut = false;
          let timeoutResolve: (() => void) | undefined;

          const timeoutPromise = timeoutMs
            ? new Promise<"timeout">((resolve) => {
                timeoutResolve = () => resolve("timeout");
                timeoutId = setTimeout(() => {
                  timedOut = true;
                  resolve("timeout");
                }, timeoutMs);
              })
            : null;

          try {
            const gen = proxy.stream(messages);
            let done = false;

            while (!done) {
              if (options.signal?.aborted) return;

              const nextPromise = gen.next();
              let result: IteratorResult<StreamChunk>;

              if (timeoutPromise) {
                const raceResult = await Promise.race([
                  nextPromise.then((r) => ({ tag: "chunk" as const, value: r })),
                  timeoutPromise.then(() => ({ tag: "timeout" as const })),
                ]);

                if (raceResult.tag === "timeout" || timedOut) {
                  const streamError: StreamError = { kind: "retryable", message: "Stream timed out", retryCount: attempt };
                  options.onError(streamError);
                  throw streamError;
                }

                result = (raceResult as { tag: "chunk"; value: IteratorResult<StreamChunk> }).value;
              } else {
                result = await nextPromise;
              }

              if (options.signal?.aborted) return;

              if (result.done) {
                done = true;
                break;
              }

              const chunk = result.value;
              accumulatedContent += chunk.delta;
              lastTokens = chunk.accumulatedTokens;

              yield chunk;

              if (chunk.finishReason === "stop") {
                done = true;
              }
            }
          } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            if (timeoutResolve) timeoutResolve();
          }

          // Success — call onComplete
          const promptTokens = messages.reduce(
            (sum, m) => sum + Math.ceil(m.content.length / 4),
            0,
          );
          options.onComplete({
            content: accumulatedContent,
            usage: {
              promptTokens,
              completionTokens: lastTokens,
            },
            wasRetried,
          });
          return;
        } catch (err: unknown) {
          // Check abort
          if (options.signal?.aborted) {
            return;
          }

          // If the error is a StreamError already reported via onError (e.g., timeout), just re-throw
          if (typeof err === "object" && err !== null && "kind" in err && "retryCount" in err) {
            throw err;
          }

          // Connection error — retry or fail
          if (attempt >= maxRetries) {
            if (accumulatedContent.length > 0) {
              options.onError({
                kind: "partial-result",
                message: String(err),
                retryCount: attempt,
                partialContent: accumulatedContent,
              });
            } else {
              options.onError({
                kind: "retryable",
                message: String(err),
                retryCount: attempt,
              });
            }
            throw err;
          }

          wasRetried = true;
          attempt++;
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await delay(backoffMs);
        }
      }
    },
  };
}
