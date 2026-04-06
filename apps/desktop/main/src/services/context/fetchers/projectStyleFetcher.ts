import type { ContextLayerFetcher } from "../types";
import type { ProjectStyleConfig } from "../../project/projectManager";
import type { Logger } from "../../../logging/logger";
import { DegradationCounter, logWarn } from "../../shared/degradationCounter";

const STYLE_UNAVAILABLE_WARNING =
  "PROJECT_STYLE_UNAVAILABLE: 项目风格配置未注入";
const STYLE_INJECTION_HEADER = "[项目风格与类型设定]";

type Result<T> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string } };

export type ProjectStyleFetcherDeps = {
  projectService: {
    getStyleConfig: (projectId: string) => Promise<Result<ProjectStyleConfig>>;
  };
  logger?: Pick<Logger, "info" | "error"> & {
    warn?: (event: string, data?: Record<string, unknown>) => void;
  };
  degradationCounter?: DegradationCounter;
  degradationEscalationThreshold?: number;
};

const NARRATIVE_PERSON_LABELS: Record<
  ProjectStyleConfig["narrativePerson"],
  string
> = {
  first: "第一人称",
  "third-limited": "第三人称（有限视角）",
  "third-omniscient": "第三人称（全知视角）",
};

function formatStyleForContext(style: ProjectStyleConfig): string {
  const lines: string[] = [STYLE_INJECTION_HEADER];

  if (style.genre.trim().length > 0) {
    lines.push(`- 类型/流派：${style.genre}`);
  }

  const personLabel = NARRATIVE_PERSON_LABELS[style.narrativePerson];
  lines.push(`- 叙事人称：${personLabel}`);

  if (style.languageStyle.trim().length > 0) {
    lines.push(`- 语言风格：${style.languageStyle}`);
  }

  if (style.tone.trim().length > 0) {
    lines.push(`- 基调/氛围：${style.tone}`);
  }

  if (style.targetAudience.trim().length > 0) {
    lines.push(`- 目标读者：${style.targetAudience}`);
  }

  return lines.join("\n");
}

/**
 * Why: project style/genre config is "dead data" unless injected into the AI
 * context. This fetcher transforms style settings into system-level writing
 * instructions for the settings layer.
 */
export function createProjectStyleFetcher(
  deps: ProjectStyleFetcherDeps,
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
    const tracked = counter.record("projectStyleFetcher");
    const payload: Record<string, unknown> = {
      module: "context-engine",
      fetcher: "projectStyleFetcher",
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
    counter.reset("projectStyleFetcher");
  };

  return async (request) => {
    try {
      const result = await deps.projectService.getStyleConfig(
        request.projectId,
      );

      if (!result.success) {
        reportDegradation({
          reason: "project_style_not_ok",
          errorMessage: result.error.message,
        });
        return {
          chunks: [],
          warnings: [STYLE_UNAVAILABLE_WARNING],
        };
      }

      if (!result.data) {
        resetDegradation();
        return { chunks: [] };
      }

      resetDegradation();
      const content = formatStyleForContext(result.data);

      return {
        chunks: [
          {
            source: "project:style",
            projectId: request.projectId,
            content,
          },
        ],
      };
    } catch (error) {
      reportDegradation({
        reason: "project_style_throw",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return {
        chunks: [],
        warnings: [STYLE_UNAVAILABLE_WARNING],
      };
    }
  };
}
