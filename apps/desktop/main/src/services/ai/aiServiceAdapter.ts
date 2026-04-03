/**
 * AIServiceAdapter — 适配器
 *
 * 包装底层 AI 服务，提供 streamChat / estimateTokens / abort 接口
 */

import { estimateTokens } from "../context/tokenEstimation";
import type {
  ChatMessage,
  StreamChunk,
  StreamOptions,
  StreamResult,
} from "./streaming";

export type {
  ChatMessage,
  ChatToolDefinition,
  StreamChunk,
  StreamOptions,
  StreamResult,
} from "./streaming";

export interface AIServiceAdapter {
  streamChat(
    messages: ChatMessage[],
    options: StreamOptions,
  ): AsyncGenerator<StreamChunk>;
  estimateTokens(text: string): number;
  abort(): void;
}

interface UnderlyingService {
  streamChat?: (
    messages: ChatMessage[],
    options: StreamOptions,
  ) => AsyncGenerator<StreamChunk> | Promise<AsyncGenerator<StreamChunk>>;
  runSkill?: (params: unknown) => Promise<{ ok: boolean; data?: { text?: string } }>;
  [key: string]: unknown;
}

function appendAssistantMessage(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  return [
    ...messages,
    {
      role: "assistant",
      content,
    },
  ];
}

function composeAbortSignal(
  outerSignal: AbortSignal | undefined,
  innerController: AbortController,
): AbortSignal {
  if (!outerSignal) {
    return innerController.signal;
  }
  if (outerSignal.aborted) {
    innerController.abort();
    return innerController.signal;
  }
  outerSignal.addEventListener("abort", () => innerController.abort(), {
    once: true,
  });
  return innerController.signal;
}

function buildFallbackResult(args: {
  messages: ChatMessage[];
  content: string;
  completionTokens: number;
}): StreamResult {
  const promptTokens = estimateTokens(
    args.messages.map((message) => message.content).join("\n\n"),
  );
  return {
    content: args.content,
    usage: {
      promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: promptTokens + args.completionTokens,
    },
    wasRetried: false,
    finishReason: "stop",
    messages: appendAssistantMessage(args.messages, args.content),
  };
}

export function createAIServiceAdapter(
  underlying: UnderlyingService,
): AIServiceAdapter {
  let currentAbortController: AbortController | null = null;

  return {
    async *streamChat(
      messages: ChatMessage[],
      options: StreamOptions,
    ): AsyncGenerator<StreamChunk> {
      const abortController = new AbortController();
      currentAbortController = abortController;
      const signal = composeAbortSignal(options.signal, abortController);

      try {
        if (typeof underlying.streamChat === "function") {
          let didComplete = false;
          const genResult = underlying.streamChat(messages, {
            ...options,
            signal,
            onComplete: (result) => {
              didComplete = true;
              options.onComplete(result);
            },
          });

          const gen =
            genResult !== null &&
            typeof genResult === "object" &&
            typeof (genResult as AsyncGenerator<StreamChunk>).next === "function"
              ? (genResult as AsyncGenerator<StreamChunk>)
              : await (genResult as Promise<AsyncGenerator<StreamChunk>>);

          let hasYielded = false;

          for await (const chunk of gen) {
            if (signal.aborted) {
              return;
            }
            hasYielded = true;
            yield chunk;
          }

          if (!hasYielded) {
            if (!didComplete) {
              const fallback = buildFallbackResult({
                messages,
                content: "",
                completionTokens: 0,
              });
              options.onComplete(fallback);
            }
            yield { delta: "", finishReason: "stop", accumulatedTokens: 0 };
          }
          return;
        }

        if (typeof underlying.runSkill === "function") {
          if (signal.aborted) {
            return;
          }

          const result = await underlying.runSkill({ messages });

          if (signal.aborted) {
            return;
          }

          const text = result?.data?.text ?? "";
          const tokens = estimateTokens(text);

          if (text) {
            yield { delta: text, finishReason: null, accumulatedTokens: tokens };
          }

          options.onComplete(
            buildFallbackResult({
              messages,
              content: text,
              completionTokens: tokens,
            }),
          );
          yield { delta: "", finishReason: "stop", accumulatedTokens: tokens };
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          return;
        }
        throw err;
      } finally {
        if (currentAbortController === abortController) {
          currentAbortController = null;
        }
      }
    },

    estimateTokens(text: string): number {
      return estimateTokens(text);
    },

    abort(): void {
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
    },
  };
}
