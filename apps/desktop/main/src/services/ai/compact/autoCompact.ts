/**
 * @module autoCompact
 * ## Responsibilities: trigger narrative compaction by context-budget threshold.
 * ## Does not do: summary generation details (delegated to narrativeCompact).
 * ## Dependency direction: ai/compact -> shared(tokenBudget) + ai/compact.
 * ## Invariants: INV-3, INV-5, INV-10.
 */

import { randomUUID } from "node:crypto";

import { estimateTokens } from "@shared/tokenBudget";

import type { CompactConfig } from "./compactConfig";
import {
  CIRCUIT_BREAKER_COOLDOWN_MS,
  resolveKnownContextWindow,
} from "./compactConfig";
import type {
  CompactMessage,
  NarrativeKnowledgeSnapshot,
} from "./narrativeCompact";
import type { createNarrativeCompact } from "./narrativeCompact";

type NarrativeCompactService = ReturnType<typeof createNarrativeCompact>;

export interface AutoCompactResult {
  messages: CompactMessage[];
  compacted: boolean;
  totalTokensBefore: number;
  totalTokensAfter: number;
  thresholdTokens: number;
  insufficientCompaction?: boolean;
  error?: unknown;
  reason:
    | "below-threshold"
    | "no-change"
    | "expansion-rejected"
    | "compacted-insufficient"
    | "compacted"
    | "compact-failed"
    | "circuit-open";
}

export interface AutoCompactService {
  maybeCompact: (args: {
    messages: CompactMessage[];
    auxiliaryModel?: string;
    requestModelId?: string;
    kgSnapshot: NarrativeKnowledgeSnapshot;
    requestId?: string;
  }) => Promise<AutoCompactResult>;
  getConsecutiveFailures: () => number;
  resetCircuitBreaker: () => void;
}

export function estimateConversationTokens(
  messages: ReadonlyArray<CompactMessage>,
): number {
  return messages.reduce(
    (total, message) => total + estimateTokens(message.content),
    0,
  );
}

export function createAutoCompact(args: {
  config?: CompactConfig;
  getConfig?: () => CompactConfig;
  narrativeCompact: NarrativeCompactService;
  now?: () => number;
  onCircuitBreakerStateChange?: (payload: {
    open: boolean;
    consecutiveFailures: number;
    openedAt: number | null;
    cooldownMs: number;
    reason: "threshold-reached" | "half-open-probe-failed" | "half-open-probe-succeeded" | "manual-reset";
  }) => void;
  logger?: {
    warn: (event: string, data?: Record<string, unknown>) => void;
  };
}): AutoCompactService {
  let consecutiveFailures = 0;
  let lastOpenedAt: number | null = null;
  const now = args.now ?? Date.now;
  const resolveConfig = (): CompactConfig => {
    if (args.getConfig) {
      return args.getConfig();
    }
    if (args.config) {
      return args.config;
    }
    throw new Error("AutoCompact requires config or getConfig");
  };

  const emitCircuitBreakerStateChange = (payload: {
    open: boolean;
    reason: "threshold-reached" | "half-open-probe-failed" | "half-open-probe-succeeded" | "manual-reset";
  }): void => {
    args.onCircuitBreakerStateChange?.({
      open: payload.open,
      consecutiveFailures,
      openedAt: lastOpenedAt,
      cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
      reason: payload.reason,
    });
  };

  const openCircuitBreaker = (reason: "threshold-reached" | "half-open-probe-failed"): void => {
    const openedAt = now();
    const alreadyOpen = lastOpenedAt !== null;
    lastOpenedAt = openedAt;
    if (!alreadyOpen || reason === "half-open-probe-failed") {
      emitCircuitBreakerStateChange({
        open: true,
        reason,
      });
    }
  };

  const closeCircuitBreaker = (
    reason: "half-open-probe-succeeded" | "manual-reset",
  ): void => {
    const wasOpen = lastOpenedAt !== null;
    consecutiveFailures = 0;
    lastOpenedAt = null;
    if (wasOpen) {
      emitCircuitBreakerStateChange({
        open: false,
        reason,
      });
    }
  };

  function isSameMessages(
    lhs: ReadonlyArray<CompactMessage>,
    rhs: ReadonlyArray<CompactMessage>,
  ): boolean {
    if (lhs.length !== rhs.length) {
      return false;
    }
    for (let index = 0; index < lhs.length; index += 1) {
      const left = lhs[index];
      const right = rhs[index];
      if (
        left?.id !== right?.id ||
        left?.role !== right?.role ||
        left?.content !== right?.content ||
        left?.compactable !== right?.compactable
      ) {
        return false;
      }
    }
    return true;
  }

  async function maybeCompact(input: {
    messages: CompactMessage[];
    auxiliaryModel?: string;
    requestModelId?: string;
    kgSnapshot: NarrativeKnowledgeSnapshot;
    requestId?: string;
  }): Promise<AutoCompactResult> {
    const config = resolveConfig();
    const totalTokensBefore = estimateConversationTokens(input.messages);
    const requestModelBudget = input.requestModelId
      ? resolveKnownContextWindow(input.requestModelId)
      : null;
    const contextBudget =
      requestModelBudget === null
        ? config.contextBudget
        : Math.min(config.contextBudget, requestModelBudget);
    const thresholdTokens = Math.floor(
      contextBudget * config.triggerThresholdPercent,
    );

    if (totalTokensBefore < config.minTokenThreshold) {
      return {
        messages: input.messages,
        compacted: false,
        totalTokensBefore,
        totalTokensAfter: totalTokensBefore,
        thresholdTokens,
        reason: "below-threshold",
      };
    }

    if (totalTokensBefore < thresholdTokens) {
      return {
        messages: input.messages,
        compacted: false,
        totalTokensBefore,
        totalTokensAfter: totalTokensBefore,
        thresholdTokens,
        reason: "below-threshold",
      };
    }

    const breakerOpen = consecutiveFailures >= config.maxConsecutiveFailures;
    if (breakerOpen && lastOpenedAt === null) {
      openCircuitBreaker("threshold-reached");
    }
    const cooldownElapsed =
      breakerOpen &&
      lastOpenedAt !== null &&
      now() - lastOpenedAt >= CIRCUIT_BREAKER_COOLDOWN_MS;
    const halfOpenProbe = breakerOpen && cooldownElapsed;
    if (breakerOpen && !halfOpenProbe) {
      return {
        messages: input.messages,
        compacted: false,
        totalTokensBefore,
        totalTokensAfter: totalTokensBefore,
        thresholdTokens,
        reason: "circuit-open",
      };
    }

    const auxiliaryModel =
      config.auxiliaryModel ?? input.auxiliaryModel ?? "default";

    try {
      const compacted = await args.narrativeCompact.compact({
        messages: input.messages,
        preserveRecentRounds: config.preserveRecentRounds,
        summaryMaxTokens: config.summaryMaxTokens,
        auxiliaryModel,
        kgSnapshot: input.kgSnapshot,
        requestId: input.requestId ?? randomUUID(),
      });
      const totalTokensAfter = estimateConversationTokens(compacted.compactedMessages);
      if (isSameMessages(compacted.compactedMessages, input.messages)) {
        if (halfOpenProbe) {
          closeCircuitBreaker("half-open-probe-succeeded");
        } else {
          consecutiveFailures = 0;
        }
        return {
          messages: input.messages,
          compacted: false,
          totalTokensBefore,
          totalTokensAfter,
          thresholdTokens,
          reason: "no-change",
        };
      }
      if (totalTokensAfter >= totalTokensBefore) {
        if (halfOpenProbe) {
          closeCircuitBreaker("half-open-probe-succeeded");
        } else {
          consecutiveFailures = 0;
        }
        return {
          messages: input.messages,
          compacted: false,
          totalTokensBefore,
          totalTokensAfter,
          thresholdTokens,
          reason: "expansion-rejected",
        };
      }
      if (totalTokensAfter > thresholdTokens) {
        // Spec circuit-breaker rule: compaction that still exceeds target budget counts as one failure.
        consecutiveFailures += 1;
        if (halfOpenProbe) {
          openCircuitBreaker("half-open-probe-failed");
        } else if (consecutiveFailures >= config.maxConsecutiveFailures) {
          openCircuitBreaker("threshold-reached");
        }
        args.logger?.warn("auto_compact_insufficient", {
          totalTokensBefore,
          totalTokensAfter,
          thresholdTokens,
          consecutiveFailures,
          maxConsecutiveFailures: config.maxConsecutiveFailures,
        });
        return {
          messages: compacted.compactedMessages,
          compacted: true,
          totalTokensBefore,
          totalTokensAfter,
          thresholdTokens,
          insufficientCompaction: true,
          reason: "compacted-insufficient",
        };
      }
      if (halfOpenProbe) {
        closeCircuitBreaker("half-open-probe-succeeded");
      } else {
        consecutiveFailures = 0;
      }
      return {
        messages: compacted.compactedMessages,
        compacted: true,
        totalTokensBefore,
        totalTokensAfter,
        thresholdTokens,
        reason: "compacted",
      };
    } catch (error) {
      consecutiveFailures += 1;
      if (halfOpenProbe) {
        openCircuitBreaker("half-open-probe-failed");
      } else if (consecutiveFailures >= config.maxConsecutiveFailures) {
        openCircuitBreaker("threshold-reached");
      }
      args.logger?.warn("auto_compact_failed", {
        reason: "narrative_compact_error",
        consecutiveFailures,
        maxConsecutiveFailures: config.maxConsecutiveFailures,
        error,
      });
      return {
        messages: input.messages,
        compacted: false,
        totalTokensBefore,
        totalTokensAfter: totalTokensBefore,
        thresholdTokens,
        error,
        reason: "compact-failed",
      };
    }
  }

  function resetCircuitBreaker(): void {
    closeCircuitBreaker("manual-reset");
  }

  return {
    maybeCompact,
    getConsecutiveFailures: () => consecutiveFailures,
    resetCircuitBreaker,
  };
}
