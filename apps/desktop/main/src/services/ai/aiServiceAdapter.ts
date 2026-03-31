/**
 * AIServiceAdapter — 适配器
 *
 * 包装底层 AI 服务，提供 streamChat / estimateTokens / abort 接口
 */

import { estimateTokens } from "../context/tokenEstimation";
import type { StreamChunk } from "./streaming";

export type { StreamChunk };

interface StreamOptions {
  signal?: AbortSignal;
  onComplete: (result: { content: string; usage: { promptTokens: number; completionTokens: number }; wasRetried: boolean }) => void;
  onError: (error: { kind: string; message: string; retryCount: number; partialContent?: string }) => void;
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
  let currentAbortController: AbortController | null = null;

  return {
    async *streamChat(
      messages: ChatMessage[],
      options: StreamOptions,
    ): AsyncGenerator<StreamChunk> {
      const abortController = new AbortController();
      currentAbortController = abortController;

      try {
        if (typeof underlying.streamChat === "function") {
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

          for await (const chunk of gen) {
            if (abortController.signal.aborted || options.signal?.aborted) {
              return;
            }
            hasYielded = true;
            yield chunk;
          }

          if (!hasYielded) {
            yield { delta: "", finishReason: "stop", accumulatedTokens: 0 };
          }
        } else if (typeof underlying.runSkill === "function") {
          if (abortController.signal.aborted || options.signal?.aborted) return;

          const result = await underlying.runSkill({ messages });

          if (abortController.signal.aborted || options.signal?.aborted) return;

          const text = result?.data?.text ?? "";
          const tokens = estimateTokens(text);

          if (text) {
            yield { delta: text, finishReason: null, accumulatedTokens: tokens };
          }
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
