/**
 * Writing-level AI service adapter for WritingOrchestrator.
 *
 * ## Responsibility
 * Wraps the raw AiService into the streaming interface expected by
 * WritingOrchestrator.  The IPC layer (ai.ts) must not define this
 * adapter inline — doing so would put bare `aiService.runSkill()` calls
 * inside the IPC module, violating INV-7.
 *
 * ## What this module provides
 * - `createLegacyOrchestratorAiService`: adapts non-streaming `runSkill`
 *   into the `streamChat` interface used by WritingOrchestrator.
 * - `createWritingOrchestratorAiService`: composite that tries the bridge
 *   provider first, falls back to the legacy adapter on
 *   "unsupported-provider" errors.
 *
 * ## INV references
 * - INV-7 (统一入口): IPC module must not hold bare `aiService.runSkill` references
 * - INV-10 (错误不丢上下文): errors from the adapter propagate without silent catch
 */

import type { AiCompletionResult, AiTokenUsage } from "@shared/types/ai";
import { nowTs } from "@shared/timeUtils";
import type { AiService } from "./aiService";
import { estimateTokens } from "../context/tokenEstimation";

// Structural type matching the return value of createAiServiceBridge
type AiServiceBridge = {
  streamChat: (
    messages: Array<{ role: string; content: string }>,
    options: OrchestratorStreamOptions,
  ) => AsyncGenerator<OrchestratorStreamChunk>;
  estimateTokens: (text: string) => number;
  abort: () => void;
};

// ── Types (match orchestrator's internal AIService interface) ─────────

export interface OrchestratorStreamChunk {
  delta: string;
  finishReason: "stop" | "tool_use" | null;
  accumulatedTokens: number;
}

export interface OrchestratorStreamOptions {
  signal: AbortSignal;
  onComplete: (result: Partial<AiCompletionResult> & { usage?: Partial<AiTokenUsage> }) => void;
  onError: (e: unknown) => void;
  onApiCallStarted?: () => void;
  skillId?: string;
  requestId?: string;
  sessionId?: string;
}

export interface WritingOrchestratorAiService {
  streamChat(
    messages: Array<{ role: string; content: string }>,
    options: OrchestratorStreamOptions,
  ): AsyncGenerator<OrchestratorStreamChunk>;
  estimateTokens(text: string): number;
  abort(): void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function makeAbortError(message: string): Error & { kind: "aborted" } {
  const err = new Error(message) as Error & { kind: "aborted" };
  err.name = "AbortError";
  err.kind = "aborted";
  return err;
}

function isBridgeUnsupportedProviderError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return (error as { kind?: unknown }).kind === "unsupported-provider";
}

// ── Legacy adapter ────────────────────────────────────────────────────

/**
 * Adapts non-streaming `aiService.runSkill()` into the streaming interface
 * expected by WritingOrchestrator.
 *
 * Why: the legacy path is used when the bridge provider does not support
 * the newer streaming API. The adapter makes the underlying `runSkill`
 * call appear as a single-chunk stream to the orchestrator, preserving
 * consistent event semantics without duplicating that logic in the IPC
 * module.
 */
export function createLegacyOrchestratorAiService(
  aiService: AiService,
): WritingOrchestratorAiService {
  const legacyActiveAbortControllers = new Set<AbortController>();

  return {
    async *streamChat(
      messages: Array<{ role: string; content: string }>,
      options: OrchestratorStreamOptions,
    ) {
      const legacyAbortController = new AbortController();
      legacyActiveAbortControllers.add(legacyAbortController);
      const onExternalAbort = () => legacyAbortController.abort();
      options.signal.addEventListener("abort", onExternalAbort, { once: true });
      const throwIfAborted = () => {
        if (options.signal.aborted || legacyAbortController.signal.aborted) {
          throw makeAbortError("Streaming request aborted");
        }
      };

      try {
        throwIfAborted();

        // NOTE: For orchestrator-level cost/abort accounting, runSkill is the API boundary.
        // Internal provider resolution/preflight remains encapsulated in aiService.
        options.onApiCallStarted?.();
        const runSkillPromise = aiService.runSkill({
          skillId: options.skillId ?? "builtin:continue",
          input: messages[messages.length - 1]?.content ?? "",
          mode: "ask",
          model: "default",
          stream: false,
          ts: nowTs(),
          overrideMessages: messages,
          emitEvent: () => {},
        });
        let abortListener: (() => void) | undefined;
        const abortPromise = new Promise<never>((_, reject) => {
          abortListener = () => {
            reject(makeAbortError("Streaming request aborted"));
          };
          if (legacyAbortController.signal.aborted) {
            abortListener();
            return;
          }
          legacyAbortController.signal.addEventListener("abort", abortListener, {
            once: true,
          });
        });
        const res = await Promise.race([runSkillPromise, abortPromise]);
        if (abortListener) {
          legacyAbortController.signal.removeEventListener("abort", abortListener);
        }
        throwIfAborted();
        if (!res.ok) {
          const kind =
            res.error.code === "CANCELED"
              ? "aborted"
              : res.error.retryable
                ? "retryable"
                : "non-retryable";
          const streamError = {
            kind,
            message: res.error.message,
            retryCount: 0,
          };
          if (kind !== "aborted") {
            options.onError(streamError);
          }
          throw streamError;
        }

        const content = res.data.outputText ?? "";
        const completionTokens = estimateTokens(content);
        yield {
          delta: content,
          finishReason: res.data.finishReason ?? "stop",
          accumulatedTokens: completionTokens,
        };
        options.onComplete({
          content,
          usage: {
            promptTokens: 0,
            completionTokens,
            totalTokens: completionTokens,
            cachedTokens: 0,
          },
          wasRetried: false,
        });
      } finally {
        options.signal.removeEventListener("abort", onExternalAbort);
        legacyActiveAbortControllers.delete(legacyAbortController);
      }
    },
    estimateTokens,
    abort() {
      for (const controller of legacyActiveAbortControllers) {
        controller.abort();
      }
      legacyActiveAbortControllers.clear();
    },
  };
}

// ── Composite (bridge → legacy fallback) ─────────────────────────────

/**
 * Composite AI service for WritingOrchestrator.
 *
 * Tries the bridge provider first (supports model routing, budget tracking,
 * per-request timeouts). Falls back to the legacy adapter when the bridge
 * reports an "unsupported-provider" error — e.g. when the direct OpenAI
 * path is configured but the bridge does not support the selected model.
 *
 * Why: the fallback prevents silent failures from breaking skill execution
 * on configurations that have not yet been updated to use the bridge fully
 * (INV-10: errors must not be silently dropped).
 */
export function createWritingOrchestratorAiService(deps: {
  aiService: AiService;
  bridgeAiService: AiServiceBridge;
}): WritingOrchestratorAiService {
  const legacy = createLegacyOrchestratorAiService(deps.aiService);
  const bridge = deps.bridgeAiService;

  return {
    async *streamChat(
      messages: Array<{ role: string; content: string }>,
      options: OrchestratorStreamOptions,
    ) {
      try {
        yield* bridge.streamChat(messages, options);
      } catch (error) {
        if (!isBridgeUnsupportedProviderError(error)) {
          throw error;
        }
        yield* legacy.streamChat(messages, options);
      }
    },
    estimateTokens: bridge.estimateTokens,
    abort: () => {
      // Per-request cancellation is propagated by the request-level AbortSignal chain.
    },
  };
}

/**
 * Null/no-op AI service for WritingOrchestrator.
 * Used when DB or costTracker is unavailable (test stubs, early-init).
 */
export function createNullWritingOrchestratorAiService(): WritingOrchestratorAiService {
  return {
    async *streamChat() {
      return;
    },
    estimateTokens,
    abort() {
      return;
    },
  };
}
