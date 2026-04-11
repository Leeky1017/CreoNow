/**
 * AIServiceAdapter — 适配器
 *
 * 包装底层 AI 服务，提供 streamChat / estimateTokens / abort 接口
 */

import type { AiCompletionResult } from "@shared/types/ai";
import { estimateTokens } from "../context/tokenEstimation";
import type { StreamChunk } from "./streaming";

export type { StreamChunk };

interface StreamOptions {
  signal?: AbortSignal;
  onComplete: (result: AiCompletionResult) => void;
  onError: (error: { kind: string; message: string; retryCount: number; partialContent?: string }) => void;
  onApiCallStarted?: () => void;
}

interface ChatMessage {
  role: string;
  content: string;
}

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
  ) => AsyncGenerator<StreamChunk> | Promise<AsyncGenerator<StreamChunk>>;
  runSkill?: (params: unknown) => Promise<{ ok: boolean; data?: { text?: string } }>;
  [key: string]: unknown;
}

export function createAIServiceAdapter(
  underlying: UnderlyingService,
): AIServiceAdapter {
  const activeAbortControllers = new Set<AbortController>();

  return {
    async *streamChat(
      messages: ChatMessage[],
      options: StreamOptions,
    ): AsyncGenerator<StreamChunk> {
      const abortController = new AbortController();
      activeAbortControllers.add(abortController);

      try {
        if (typeof underlying.streamChat === "function") {
          options.onApiCallStarted?.();
          const genResult = underlying.streamChat(messages);

          let gen: AsyncGenerator<StreamChunk>;
          if (
            genResult !== null &&
            typeof genResult === "object" &&
            typeof (genResult as AsyncGenerator<StreamChunk>).next === "function"
          ) {
            gen = genResult as AsyncGenerator<StreamChunk>;
          } else {
            gen = await (genResult as Promise<AsyncGenerator<StreamChunk>>);
          }

          let hasYielded = false;
          let content = "";
          let completionTokens = 0;

          for await (const chunk of gen) {
            if (abortController.signal.aborted || options.signal?.aborted) {
              return;
            }
            hasYielded = true;
            content += chunk.delta;
            completionTokens = Math.max(completionTokens, chunk.accumulatedTokens);
            yield chunk;
          }

          if (!hasYielded) {
            yield { delta: "", finishReason: "stop", accumulatedTokens: 0 };
          }

          options.onComplete({
            content,
            usage: {
              promptTokens: 0,
              completionTokens,
              totalTokens: completionTokens,
            },
            wasRetried: false,
          });
        } else if (typeof underlying.runSkill === "function") {
          if (abortController.signal.aborted || options.signal?.aborted) return;

          options.onApiCallStarted?.();
          const result = await underlying.runSkill({ messages });

          if (abortController.signal.aborted || options.signal?.aborted) return;

          const text = result?.data?.text ?? "";
          const tokens = estimateTokens(text);

          if (text) {
            yield { delta: text, finishReason: null, accumulatedTokens: tokens };
          }
          yield { delta: "", finishReason: "stop", accumulatedTokens: tokens };
          options.onComplete({
            content: text,
            usage: {
              promptTokens: 0,
              completionTokens: tokens,
              totalTokens: tokens,
            },
            wasRetried: false,
          });
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          return;
        }
        throw err;
      } finally {
        activeAbortControllers.delete(abortController);
      }
    },

    estimateTokens(text: string): number {
      return estimateTokens(text);
    },

    abort(): void {
      for (const controller of activeAbortControllers) {
        controller.abort();
      }
      activeAbortControllers.clear();
    },
  };
}
