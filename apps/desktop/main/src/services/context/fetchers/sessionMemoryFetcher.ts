/**
 * sessionMemoryFetcher — L1 session-aware context injection fetcher
 *
 * Wraps SessionMemoryService.injectForContext() as a ContextLayerFetcher so
 * the layerAssemblyService can include L1 content in the "settings" layer.
 *
 * ## Placement: settings layer (same as SimpleMemory / L0)
 * ## Budget: enforced inside SessionMemoryService at 15% of total budget
 * ## INV-3: CJK-aware token estimation done in SessionMemoryService
 * ## INV-4: FTS5 keyword retrieval; no extra vector store
 *
 * Degrades gracefully: if SessionMemoryService is unavailable or returns an
 * error, the fetcher returns empty chunks and a warning tag — it does not
 * propagate failures to the context assembly caller.
 */

import type { ContextLayerFetcher } from "../types";
import type { SessionMemoryService } from "../../memory/sessionMemory";
import type { Logger } from "../../../logging/logger";
import { DegradationCounter, logWarn } from "../../shared/degradationCounter";

const SESSION_MEMORY_UNAVAILABLE_WARNING =
  "SESSION_MEMORY_UNAVAILABLE: L1 会话记忆未注入";
const SESSION_MEMORY_EMPTY_WARNING =
  "SESSION_MEMORY_EMPTY: 无可用会话记忆";
const DEFAULT_TOTAL_CONTEXT_BUDGET_TOKENS = 6000;

export type SessionMemoryFetcherDeps = {
  sessionMemoryService: Pick<SessionMemoryService, "injectForContext">;
  logger?: Pick<Logger, "info" | "error"> & {
    warn?: (event: string, data?: Record<string, unknown>) => void;
  };
  degradationCounter?: DegradationCounter;
  degradationEscalationThreshold?: number;
  /**
   * Default session ID used when request.sessionId is absent. When both are
   * missing the fetcher returns empty chunks.
   *
   * Why: some call sites may not thread chat session IDs into every assembly
   * request yet; this preserves backward compatibility.
   */
  sessionId?: string;
  /**
   * Fallback total context budget when request does not provide one.
   * Default: 6000 tokens.
   */
  fallbackTotalContextBudgetTokens?: number;
};

/**
 * Create a ContextLayerFetcher that injects L1 session memory into the context.
 *
 * The total context budget comes from request.totalContextBudgetTokens when
 * available; otherwise falls back to deps.fallbackTotalContextBudgetTokens (or
 * 6000 by default). SessionMemoryService enforces the 15% cap internally.
 */
export function createSessionMemoryFetcher(
  deps: SessionMemoryFetcherDeps,
): ContextLayerFetcher {
  const counter =
    deps.degradationCounter ??
    new DegradationCounter({
      threshold: deps.degradationEscalationThreshold,
    });

  const FETCHER_KEY = "sessionMemoryFetcher";

  function reportDegradation(args: {
    reason: string;
    errorMessage?: string;
  }): void {
    if (!deps.logger) {
      return;
    }
    const tracked = counter.record(FETCHER_KEY);
    const payload: Record<string, unknown> = {
      module: "context-engine",
      fetcher: FETCHER_KEY,
      reason: args.reason,
      count: tracked.count,
      firstDegradedAt: tracked.firstDegradedAt,
    };
    if (args.errorMessage) {
      payload.error = args.errorMessage;
    }
    logWarn(deps.logger, "context_fetcher_degradation", payload);
    if (tracked.escalated) {
      deps.logger.error("context_fetcher_degradation_escalation", payload);
    }
  }

  function resetDegradation(): void {
    counter.reset(FETCHER_KEY);
  }

  return async (request) => {
    // Prefer per-request sessionId (threaded from AI chat IPC) over the static
    // dep captured at service creation time.
    const sessionId = request.sessionId ?? deps.sessionId;

    if (!sessionId) {
      // No active session wired — degrade silently; not an error condition.
      return { chunks: [] };
    }

    try {
      const totalBudgetFromRequest = request.totalContextBudgetTokens;
      const totalBudget =
        typeof totalBudgetFromRequest === "number" &&
        Number.isFinite(totalBudgetFromRequest) &&
        totalBudgetFromRequest > 0
          ? totalBudgetFromRequest
          : deps.fallbackTotalContextBudgetTokens ??
            DEFAULT_TOTAL_CONTEXT_BUDGET_TOKENS;

      const result = await deps.sessionMemoryService.injectForContext({
        sessionId,
        projectId: request.projectId,
        queryText: request.additionalInput,
        totalContextBudgetTokens: totalBudget,
      });

      if (!result.ok) {
        reportDegradation({
          reason: "session_memory_inject_failed",
          errorMessage: result.error.message,
        });
        return {
          chunks: [],
          warnings: [SESSION_MEMORY_UNAVAILABLE_WARNING],
        };
      }

      if (result.data.injectedText === "") {
        resetDegradation();
        return {
          chunks: [],
          warnings: [SESSION_MEMORY_EMPTY_WARNING],
        };
      }

      resetDegradation();
      return {
        chunks: [
          {
            source: "session_memory:l1",
            content: result.data.injectedText,
            projectId: request.projectId,
          },
        ],
        truncated: result.data.truncated,
      };
    } catch (err) {
      reportDegradation({
        reason: "session_memory_fetcher_exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return {
        chunks: [],
        warnings: [SESSION_MEMORY_UNAVAILABLE_WARNING],
      };
    }
  };
}
