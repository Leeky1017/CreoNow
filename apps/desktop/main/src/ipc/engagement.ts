import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { ipcError } from "../services/shared/ipcResult";
import {
  createCompletionEstimatorService,
  type CompletionEstimate,
} from "../services/engagement/completionEstimatorService";
import {
  createMilestoneService,
  type MilestoneReachedRow,
} from "../services/engagement/milestoneService";
import {
  createWorldScaleService,
  type WorldScale,
} from "../services/engagement/worldScaleService";
import {
  createWritingStyleAnalysisService,
  type AnalysisScope,
  type WritingStyleProfile,
} from "../services/engagement/writingStyleAnalysisService";
import {
  createProjectAccessHandler,
  isRecord,
} from "./helpers";
import type { ProjectLifecycle } from "../services/projects/projectLifecycle";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type ProjectScopedPayload = {
  projectId: string;
};

type StyleAnalyzePayload = {
  projectId: string;
  scope?: AnalysisScope;
};

type MilestoneListResponse = {
  items: MilestoneReachedRow[];
};

type EngagementServices = {
  worldScale: ReturnType<typeof createWorldScaleService>;
  milestone: ReturnType<typeof createMilestoneService>;
  style: ReturnType<typeof createWritingStyleAnalysisService>;
  completion: ReturnType<typeof createCompletionEstimatorService>;
};

function engagementNotReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: {
      code: "DB_ERROR",
      message: "Database not ready",
      details: null,
    },
  };
}

function parseProjectId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (typeof payload.projectId !== "string") {
    return null;
  }
  const projectId = payload.projectId.trim();
  return projectId.length > 0 ? projectId : null;
}

function parseAnalysisScope(payload: unknown): AnalysisScope | null {
  if (!isRecord(payload) || payload.scope === undefined) {
    return "full";
  }
  if (payload.scope === "recent" || payload.scope === "full") {
    return payload.scope;
  }
  return null;
}

/**
 * Register `engagement:*` IPC handlers.
 *
 * Why: ENG-05/06/07/18 services must be reachable from renderer through
 * contract-validated IPC channels instead of ad-hoc process bridges.
 */
export function registerEngagementIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  projectLifecycle?: ProjectLifecycle;
}): void {
  let services: EngagementServices | null = null;
  let lifecycleRegistered = false;

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  function getServices(): EngagementServices | null {
    if (!deps.db) {
      return null;
    }
    if (services) {
      return services;
    }
    services = {
      worldScale: createWorldScaleService({ db: deps.db }),
      milestone: createMilestoneService({ db: deps.db }),
      style: createWritingStyleAnalysisService({ db: deps.db }),
      completion: createCompletionEstimatorService({ db: deps.db }),
    };
    return services;
  }

  function disposeServices(): void {
    services?.worldScale.dispose();
    services?.milestone.dispose();
    services = null;
  }

  function ensureLifecycleRegistered(): void {
    if (lifecycleRegistered || !deps.projectLifecycle) {
      return;
    }
    lifecycleRegistered = true;
    deps.projectLifecycle.register({
      id: "engagement",
      unbind: () => {
        disposeServices();
      },
      bind: () => {
        getServices();
      },
    });
  }

  ensureLifecycleRegistered();

  handleWithProjectAccess(
    "engagement:worldscale:get",
    async (_event, payload: ProjectScopedPayload): Promise<IpcResponse<WorldScale>> => {
      const projectId = parseProjectId(payload);
      if (!projectId) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const svc = getServices();
      if (!svc) {
        return engagementNotReady<WorldScale>();
      }

      try {
        svc.worldScale.invalidateCache(projectId);
        return {
          ok: true,
          data: svc.worldScale.getWorldScale(projectId),
        };
      } catch (error) {
        deps.logger.error("engagement_worldscale_get_failed", {
          projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("INTERNAL_ERROR", "Failed to get world scale");
      }
    },
  );

  handleWithProjectAccess(
    "engagement:milestone:list",
    async (
      _event,
      payload: ProjectScopedPayload,
    ): Promise<IpcResponse<MilestoneListResponse>> => {
      const projectId = parseProjectId(payload);
      if (!projectId) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const svc = getServices();
      if (!svc) {
        return engagementNotReady<MilestoneListResponse>();
      }

      try {
        return {
          ok: true,
          data: { items: svc.milestone.listReached(projectId) },
        };
      } catch (error) {
        deps.logger.error("engagement_milestone_list_failed", {
          projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("INTERNAL_ERROR", "Failed to list milestones");
      }
    },
  );

  handleWithProjectAccess(
    "engagement:style:analyze",
    async (
      _event,
      payload: StyleAnalyzePayload,
    ): Promise<IpcResponse<WritingStyleProfile>> => {
      const projectId = parseProjectId(payload);
      if (!projectId) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }
      const scope = parseAnalysisScope(payload);
      if (!scope) {
        return ipcError("INVALID_ARGUMENT", "scope must be recent or full");
      }

      const svc = getServices();
      if (!svc) {
        return engagementNotReady<WritingStyleProfile>();
      }

      try {
        return {
          ok: true,
          data: svc.style.analyze({ projectId, scope }),
        };
      } catch (error) {
        deps.logger.error("engagement_style_analyze_failed", {
          projectId,
          scope,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("INTERNAL_ERROR", "Failed to analyze writing style");
      }
    },
  );

  handleWithProjectAccess(
    "engagement:completion:estimate",
    async (
      _event,
      payload: ProjectScopedPayload,
    ): Promise<IpcResponse<CompletionEstimate>> => {
      const projectId = parseProjectId(payload);
      if (!projectId) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const svc = getServices();
      if (!svc) {
        return engagementNotReady<CompletionEstimate>();
      }

      try {
        return {
          ok: true,
          data: svc.completion.estimate(projectId),
        };
      } catch (error) {
        deps.logger.error("engagement_completion_estimate_failed", {
          projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("INTERNAL_ERROR", "Failed to estimate completion");
      }
    },
  );
}
