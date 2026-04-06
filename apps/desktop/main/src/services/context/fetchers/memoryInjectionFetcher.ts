import type { ContextLayerFetcher } from "../types";
import type {
  SimpleMemoryService,
  MemoryInjection,
} from "../../memory/simpleMemoryService";
import type { Logger } from "../../../logging/logger";
import { DegradationCounter, logWarn } from "../../shared/degradationCounter";

const SIMPLE_MEMORY_UNAVAILABLE_WARNING =
  "SIMPLE_MEMORY_UNAVAILABLE: 简单记忆数据未注入";
const SIMPLE_MEMORY_EMPTY_WARNING =
  "SIMPLE_MEMORY_EMPTY: 无可用记忆";
const MEMORY_INJECTION_HEADER = "[项目记忆 — 自动注入]";

export type MemoryInjectionFetcherDeps = {
  simpleMemoryService: Pick<SimpleMemoryService, "inject">;
  logger?: Pick<Logger, "info" | "error"> & {
    warn?: (event: string, data?: Record<string, unknown>) => void;
  };
  degradationCounter?: DegradationCounter;
  degradationEscalationThreshold?: number;
};

/**
 * Why: SimpleMemoryService.inject() produces ready-to-use context text that
 * must flow into the settings layer so AI writing skills receive project
 * memories automatically.
 */
export function createMemoryInjectionFetcher(
  deps: MemoryInjectionFetcherDeps,
): ContextLayerFetcher {
  const counter =
    deps.degradationCounter ??
    new DegradationCounter({
      threshold: deps.degradationEscalationThreshold,
    });

  const reportDegradation = (args: {
    reason: string;
    errorMessage?: string;
  }): void => {
    if (!deps.logger) {
      return;
    }
    const tracked = counter.record("memoryInjectionFetcher");
    const payload: Record<string, unknown> = {
      module: "context-engine",
      fetcher: "memoryInjectionFetcher",
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
  };

  const resetDegradation = (): void => {
    counter.reset("memoryInjectionFetcher");
  };

  return async (request) => {
    try {
      const documentText = request.additionalInput ?? "";
      const result = await deps.simpleMemoryService.inject(
        request.projectId,
        { documentText },
      );

      if (!result.success) {
        reportDegradation({
          reason: "simple_memory_inject_failed",
          errorMessage: result.error?.message,
        });
        return {
          chunks: [],
          warnings: [SIMPLE_MEMORY_UNAVAILABLE_WARNING],
        };
      }

      const injection: MemoryInjection | undefined = result.data;
      if (!injection || injection.records.length === 0) {
        resetDegradation();
        return {
          chunks: [],
          warnings: [SIMPLE_MEMORY_EMPTY_WARNING],
        };
      }

      resetDegradation();
      const content = injection.injectedText.trim().length > 0
        ? `${MEMORY_INJECTION_HEADER}\n${injection.injectedText}`
        : MEMORY_INJECTION_HEADER;

      const warnings: string[] = [];
      if (injection.degraded) {
        warnings.push("SIMPLE_MEMORY_DEGRADED: token budget exceeded");
      }

      return {
        chunks: [
          {
            source: "simple-memory:injection",
            projectId: request.projectId,
            content,
          },
        ],
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    } catch (error) {
      reportDegradation({
        reason: "simple_memory_inject_throw",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return {
        chunks: [],
        warnings: [SIMPLE_MEMORY_UNAVAILABLE_WARNING],
      };
    }
  };
}
