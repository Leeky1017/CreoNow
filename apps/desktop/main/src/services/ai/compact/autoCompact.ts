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
  error?: unknown;
  reason:
    | "below-threshold"
    | "compacted"
    | "compact-failed"
    | "circuit-open";
}

export interface AutoCompactService {
  maybeCompact: (args: {
    messages: CompactMessage[];
    auxiliaryModel?: string;
    kgSnapshot: NarrativeKnowledgeSnapshot;
    requestId?: string;
  }) => Promise<AutoCompactResult>;
  getConsecutiveFailures: () => number;
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
  logger?: {
    warn: (event: string, data?: Record<string, unknown>) => void;
  };
}): AutoCompactService {
  let consecutiveFailures = 0;
  const resolveConfig = (): CompactConfig => {
    if (args.getConfig) {
      return args.getConfig();
    }
    if (args.config) {
      return args.config;
    }
    throw new Error("AutoCompact requires config or getConfig");
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
    kgSnapshot: NarrativeKnowledgeSnapshot;
    requestId?: string;
  }): Promise<AutoCompactResult> {
    const config = resolveConfig();
    const totalTokensBefore = estimateConversationTokens(input.messages);
    const thresholdTokens = Math.floor(
      config.contextBudget * config.triggerThresholdPercent,
    );

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

    if (consecutiveFailures >= config.maxConsecutiveFailures) {
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
      consecutiveFailures = 0;
      const totalTokensAfter = estimateConversationTokens(compacted.compactedMessages);
      if (isSameMessages(compacted.compactedMessages, input.messages)) {
        return {
          messages: input.messages,
          compacted: false,
          totalTokensBefore,
          totalTokensAfter: totalTokensBefore,
          thresholdTokens,
          reason: "below-threshold",
        };
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

  return {
    maybeCompact,
    getConsecutiveFailures: () => consecutiveFailures,
  };
}
