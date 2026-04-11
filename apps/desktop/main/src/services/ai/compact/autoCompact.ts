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
    auxiliaryModel: string;
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
  config: CompactConfig;
  narrativeCompact: NarrativeCompactService;
  logger?: {
    warn: (event: string, data?: Record<string, unknown>) => void;
  };
}): AutoCompactService {
  let consecutiveFailures = 0;

  async function maybeCompact(input: {
    messages: CompactMessage[];
    auxiliaryModel: string;
    kgSnapshot: NarrativeKnowledgeSnapshot;
    requestId?: string;
  }): Promise<AutoCompactResult> {
    const totalTokensBefore = estimateConversationTokens(input.messages);
    const thresholdTokens = Math.floor(
      args.config.contextBudget * args.config.triggerThresholdPercent,
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

    if (consecutiveFailures >= args.config.maxConsecutiveFailures) {
      return {
        messages: input.messages,
        compacted: false,
        totalTokensBefore,
        totalTokensAfter: totalTokensBefore,
        thresholdTokens,
        reason: "circuit-open",
      };
    }

    try {
      const compacted = await args.narrativeCompact.compact({
        messages: input.messages,
        preserveRecentRounds: args.config.preserveRecentRounds,
        summaryMaxTokens: args.config.summaryMaxTokens,
        auxiliaryModel: input.auxiliaryModel,
        kgSnapshot: input.kgSnapshot,
        requestId: input.requestId ?? randomUUID(),
      });
      consecutiveFailures = 0;
      const totalTokensAfter = estimateConversationTokens(compacted.compactedMessages);
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
        maxConsecutiveFailures: args.config.maxConsecutiveFailures,
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
