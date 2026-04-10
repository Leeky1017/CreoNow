/**
 * @module aiServiceBridge
 * ## 职责：把 modelConfig + modelRouter + apiClient 组合成 WritingOrchestrator 所需 aiService 接口
 * ## 不做什么：不实现 Skill 编排、不处理写回权限门禁
 * ## 依赖方向：ipc/skills → ai(bridge→router→apiClient)
 * ## 关键不变量：INV-9（调用成本入库）· INV-10（上游错误上下文保留）
 */

import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { estimateTokens as estimateTokenCount } from "../context/tokenEstimation";
import type { ServiceResult } from "../shared/ipcResult";
import { createApiClient } from "./apiClient";
import type { CostTracker } from "./costTracker";
import { startFakeAiServer } from "./fakeAiServer";
import { createModelConfigService } from "./modelConfig";
import { createModelRouter } from "./modelRouter";
import { logWarn } from "../shared/degradationCounter";
import {
  createProviderResolver,
  type ProviderConfig,
  type ProxySettings,
} from "./providerResolver";
import type { StreamChunk } from "./streaming";

type StreamChatOptions = {
  signal: AbortSignal;
  onComplete: (r: unknown) => void;
  onError: (e: unknown) => void;
  onApiCallStarted?: () => void;
  skillId?: string;
  requestId?: string;
  sessionId?: string;
};

type BridgeMessage = {
  role: string;
  content: string;
};

type StreamError = {
  kind:
    | "retryable"
    | "non-retryable"
    | "partial-result"
    | "aborted"
    | "unsupported-provider";
  message: string;
  retryCount: number;
  partialContent?: string;
};

type StreamContext = {
  skillId: string;
  sessionId?: string;
  requestId?: string;
};

const DEFAULT_SKILL_ID = "builtin:continue";

function normalizeRole(role: string): "system" | "user" | "assistant" | "tool" {
  if (role === "system" || role === "assistant" || role === "tool") {
    return role;
  }
  return "user";
}

function toOpenAiProvider(
  provider: ProviderConfig & {
    model: string;
    maxTokens: number;
    temperature: number;
  },
): {
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
} {
  return {
    baseUrl: provider.baseUrl,
    ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
    model: provider.model,
    maxTokens: provider.maxTokens,
    temperature: provider.temperature,
    timeoutMs: provider.timeoutMs,
  };
}

function extractStreamContext(options: StreamChatOptions): StreamContext {
  return {
    skillId: options.skillId ?? DEFAULT_SKILL_ID,
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    ...(options.requestId ? { requestId: options.requestId } : {}),
  };
}

function makeStreamError(args: {
  retryable?: boolean;
  kind?: StreamError["kind"];
  message: string;
  partialContent?: string;
}): StreamError {
  const kind = args.kind ?? (args.retryable ? "retryable" : "non-retryable");
  return {
    kind,
    message: args.message,
    retryCount: 0,
    ...(args.partialContent ? { partialContent: args.partialContent } : {}),
  };
}

function makeAbortError(message: string): Error & { kind: "aborted" } {
  const err = new Error(message) as Error & { kind: "aborted" };
  err.name = "AbortError";
  err.kind = "aborted";
  return err;
}

export function createAiServiceBridge(args: {
  db: Database.Database;
  logger: Logger;
  costTracker: CostTracker;
  env: NodeJS.ProcessEnv;
  runtimeAiTimeoutMs: number;
  getProxySettings?: () => ProxySettings | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): {
  streamChat: (
    messages: BridgeMessage[],
    options: StreamChatOptions,
  ) => AsyncGenerator<StreamChunk>;
  estimateTokens: (text: string) => number;
  abort: () => void;
} {
  const providerResolver = createProviderResolver({ logger: args.logger });
  let fakeServerPromise: Promise<
    Awaited<ReturnType<typeof startFakeAiServer>>
  > | null = null;
  const modelConfigService = createModelConfigService({
    db: args.db,
    logger: args.logger,
  });
  const modelRouter = createModelRouter({
    modelConfigService,
    resolveProvider: () =>
      providerResolver.resolveProviderConfig({
        env: args.env,
        runtimeAiTimeoutMs: args.runtimeAiTimeoutMs,
        getFakeServer: () => {
          if (!fakeServerPromise) {
            fakeServerPromise = startFakeAiServer({
              logger: args.logger,
              env: args.env,
            });
          }
          return fakeServerPromise;
        },
        getProxySettings: args.getProxySettings,
      }),
  });
  const apiClient = createApiClient({
    db: args.db,
    costTracker: args.costTracker,
    logger: args.logger,
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
    ...(args.now ? { now: args.now } : {}),
  });

  let activeAbortController: AbortController | null = null;

  async function* streamChat(
    messages: BridgeMessage[],
    options: StreamChatOptions,
  ): AsyncGenerator<StreamChunk> {
    if (options.signal.aborted) {
      const abortedError = makeAbortError("Streaming request aborted");
      throw abortedError;
    }

    const streamContext = extractStreamContext(options);
    const routeResult = await modelRouter.selectProvider({
      skillId: streamContext.skillId,
    });
    if (options.signal.aborted) {
      const abortedError = makeAbortError("Streaming request aborted");
      throw abortedError;
    }
    if (!routeResult.ok) {
      const streamError = makeStreamError({
        retryable: routeResult.error.retryable ?? false,
        message: routeResult.error.message,
      });
      options.onError(streamError);
      throw streamError;
    }
    if (
      routeResult.data.provider !== "openai" &&
      routeResult.data.provider !== "proxy"
    ) {
      const streamError = makeStreamError({
        kind: "unsupported-provider",
        message: `Bridge only supports OpenAI-compatible providers, got: ${routeResult.data.provider}`,
      });
      throw streamError;
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    const onExternalAbort = () => abortController.abort();
    options.signal.addEventListener("abort", onExternalAbort, { once: true });

    const pendingChunks: Array<{ delta: string; done: boolean }> = [];
    let notify: (() => void) | null = null;
    let streamSettled = false;
    let accumulatedText = "";

    const wake = () => {
      if (notify) {
        const resolver = notify;
        notify = null;
        resolver();
      }
    };

    options.onApiCallStarted?.();
    const requestPromise: Promise<
      ServiceResult<{
        requestId: string;
        content: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          cachedTokens: number;
        };
        model: string;
        persistenceError?: unknown;
      }>
    > = apiClient.streamChatCompletion({
      provider: toOpenAiProvider(routeResult.data),
      messages: messages.map((message) => ({
        role: normalizeRole(message.role),
        content: message.content,
      })),
      skillId: streamContext.skillId,
      ...(streamContext.sessionId
        ? { sessionId: streamContext.sessionId }
        : {}),
      ...(streamContext.requestId
        ? { requestId: streamContext.requestId }
        : {}),
      signal: abortController.signal,
      onChunk: (chunk) => {
        pendingChunks.push(chunk);
        wake();
      },
    });
    const settlePromise = requestPromise.finally(() => {
      streamSettled = true;
      wake();
    });

    try {
      while (!streamSettled || pendingChunks.length > 0) {
        if (pendingChunks.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
          continue;
        }

        const nextChunk = pendingChunks.shift();
        if (!nextChunk) {
          continue;
        }
        if (nextChunk.delta.length > 0) {
          accumulatedText += nextChunk.delta;
        }

        yield {
          delta: nextChunk.delta,
          finishReason: nextChunk.done ? "stop" : null,
          accumulatedTokens: estimateTokenCount(accumulatedText),
        };
      }

      await settlePromise;
      const streamResult = await requestPromise;

      if (!streamResult.ok) {
        const errorKind: StreamError["kind"] =
          streamResult.error.code === "CANCELED"
            ? "aborted"
            : accumulatedText.length > 0
              ? "partial-result"
            : streamResult.error.retryable
              ? "retryable"
              : "non-retryable";
        const streamError = makeStreamError({
          kind: errorKind,
          message: streamResult.error.message,
          partialContent:
            accumulatedText.length > 0 ? accumulatedText : undefined,
        });
        if (streamError.kind !== "aborted") {
          options.onError(streamError);
        }
        throw streamError;
      }

      options.onComplete({
        content: streamResult.data.content,
        usage: {
          promptTokens: streamResult.data.usage.promptTokens,
          completionTokens: streamResult.data.usage.completionTokens,
        },
        ...(streamResult.data.persistenceError
          ? { persistenceError: streamResult.data.persistenceError }
          : {}),
        wasRetried: false,
      });
      if (streamResult.data.persistenceError) {
        logWarn(args.logger, "ai_cost_persistence_degraded", {
          requestId: streamResult.data.requestId,
          skillId: streamContext.skillId,
          error: streamResult.data.persistenceError,
        });
      }
    } finally {
      options.signal.removeEventListener("abort", onExternalAbort);
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  }

  return {
    streamChat,
    estimateTokens: (text: string) => estimateTokenCount(text),
    abort: () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
    },
  };
}
