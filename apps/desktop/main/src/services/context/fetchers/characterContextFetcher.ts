import type { ContextLayerFetcher } from "../types";
import type { CharacterListService } from "../../skills/characterListService";
import type { Logger } from "../../../logging/logger";
import { DegradationCounter, logWarn } from "../../shared/degradationCounter";

const CHARACTER_UNAVAILABLE_WARNING =
  "CHARACTER_CONTEXT_UNAVAILABLE: 角色/地点数据未注入";
const DEFAULT_TOKEN_BUDGET = 800;

export type CharacterContextFetcherDeps = {
  characterListService: Pick<CharacterListService, "injectCharactersIntoContext">;
  tokenBudget?: number;
  logger?: Pick<Logger, "info" | "error"> & {
    warn?: (event: string, data?: Record<string, unknown>) => void;
  };
  degradationCounter?: DegradationCounter;
  degradationEscalationThreshold?: number;
};

/**
 * Why: character/location descriptions from KG must reach the AI context so
 * writing skills maintain consistency with established characters and settings.
 */
export function createCharacterContextFetcher(
  deps: CharacterContextFetcherDeps,
): ContextLayerFetcher {
  const counter =
    deps.degradationCounter ??
    new DegradationCounter({
      threshold: deps.degradationEscalationThreshold,
    });
  const tokenBudget = deps.tokenBudget ?? DEFAULT_TOKEN_BUDGET;

  const reportDegradation = (args: {
    reason: string;
    errorMessage?: string;
  }): void => {
    if (!deps.logger) {
      return;
    }
    const tracked = counter.record("characterContextFetcher");
    const payload: Record<string, unknown> = {
      module: "context-engine",
      fetcher: "characterContextFetcher",
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
    counter.reset("characterContextFetcher");
  };

  return async (request) => {
    try {
      const result = deps.characterListService.injectCharactersIntoContext(
        request.projectId,
        tokenBudget,
      );

      if (!result.ok) {
        reportDegradation({
          reason: "character_inject_not_ok",
          errorMessage: result.error.message,
        });
        return {
          chunks: [],
          warnings: [CHARACTER_UNAVAILABLE_WARNING],
        };
      }

      if (
        result.data.characterCount === 0 &&
        result.data.locationCount === 0
      ) {
        resetDegradation();
        return { chunks: [] };
      }

      resetDegradation();
      return {
        chunks: [
          {
            source: "characters:list",
            projectId: request.projectId,
            content: result.data.text,
          },
        ],
        truncated: result.data.truncated,
      };
    } catch (error) {
      reportDegradation({
        reason: "character_inject_throw",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return {
        chunks: [],
        warnings: [CHARACTER_UNAVAILABLE_WARNING],
      };
    }
  };
}
