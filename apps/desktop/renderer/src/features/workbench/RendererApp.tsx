import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { IpcResponseData } from "@shared/types/ipc-generated";

import { DashboardPage, type Project as DashboardProject } from "@/features/dashboard/DashboardPage";
import { WelcomeScreen } from "@/features/onboarding/WelcomeScreen";
import { WorkbenchApp } from "@/features/workbench/WorkbenchApp";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { getPreloadApi } from "@/lib/preloadApi";

type AppView = "loading" | "dashboard" | "workbench" | "error";
type DashboardRetryAction =
  | { kind: "load" }
  | { kind: "create" }
  | { kind: "switch"; projectId: string }
  | null;

const PROJECT_SWITCH_PROGRESS_DELAY_MS = 1_000;
const WELCOME_COMPLETED_KEY = "creonow:onboarding:welcome-completed";
const WELCOME_SCENARIOS_KEY = "creonow:onboarding:welcome-scenarios";

type ProjectListItem = IpcResponseData<"project:project:list">["items"][number];
type ProjectStatsItem = {
  projectId: string;
  wordCount?: number;
  progressPercent?: number;
};

type StatsPayloadIssue = {
  field: "payload" | "projectId" | "wordCount" | "progressPercent";
  index?: number;
  reason: string;
};

function toDashboardProject(item: ProjectListItem): DashboardProject {
  return {
    id: item.projectId,
    title: item.name,
    type: item.type ?? "novel",
    stage: item.stage,
    updatedAt: item.updatedAt,
  };
}

export function toStatsMap(items: ProjectStatsItem[]): Map<string, ProjectStatsItem> {
  return new Map(items.map((item) => [item.projectId, item]));
}

function reportStatsPayloadIssues(issues: StatsPayloadIssue[]): void {
  if (issues.length === 0) {
    return;
  }
  console.warn("[RendererApp] project.stats payload validation issues", {
    count: issues.length,
    sample: issues.slice(0, 5),
  });
}

function normalizeOptionalMetric(
  value: unknown,
  field: "wordCount" | "progressPercent",
  index: number,
  issues: StatsPayloadIssue[],
): number | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ field, index, reason: "must be a finite number" });
    return undefined;
  }
  if (field === "progressPercent") {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return Math.max(0, Math.floor(value));
}

export function readPerProjectStats(data: unknown): ProjectStatsItem[] {
  const issues: StatsPayloadIssue[] = [];
  if (!data || typeof data !== "object" || !("perProject" in data)) {
    issues.push({ field: "payload", reason: "missing perProject field" });
    reportStatsPayloadIssues(issues);
    return [];
  }

  const perProject = (data as { perProject?: unknown }).perProject;
  if (!Array.isArray(perProject)) {
    issues.push({ field: "payload", reason: "perProject must be an array" });
    reportStatsPayloadIssues(issues);
    return [];
  }

  const normalized: ProjectStatsItem[] = [];
  perProject.forEach((item, index) => {
    if (item === null || typeof item !== "object") {
      issues.push({ field: "payload", index, reason: "entry must be an object" });
      return;
    }
    const candidate = item as {
      projectId?: unknown;
      wordCount?: unknown;
      progressPercent?: unknown;
    };
    if (typeof candidate.projectId !== "string" || candidate.projectId.trim().length === 0) {
      issues.push({ field: "projectId", index, reason: "projectId must be a non-empty string" });
      return;
    }
    normalized.push({
      projectId: candidate.projectId,
      wordCount: normalizeOptionalMetric(candidate.wordCount, "wordCount", index, issues),
      progressPercent: normalizeOptionalMetric(candidate.progressPercent, "progressPercent", index, issues),
    });
  });

  reportStatsPayloadIssues(issues);
  return normalized;
}

export function mergeDashboardProjects(
  items: ProjectListItem[],
  statsItems: ProjectStatsItem[],
): DashboardProject[] {
  const statsByProjectId = toStatsMap(statsItems);
  return items.map((item) => {
    const stats = statsByProjectId.get(item.projectId);
    return {
      ...toDashboardProject(item),
      wordCount: stats?.wordCount,
      progressPercent: stats?.progressPercent,
    };
  });
}

export function RendererApp() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const [view, setView] = useState<AppView>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);
  const [isProjectCreating, setIsProjectCreating] = useState(false);
  const [showProjectSwitchProgress, setShowProjectSwitchProgress] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<DashboardRetryAction>({ kind: "load" });
  const [showWelcome, setShowWelcome] = useState(false);
  const switchInFlightRef = useRef(false);
  const createInFlightRef = useRef(false);
  const switchProgressTimerRef = useRef<number | null>(null);

  const clearProjectSwitchProgress = useCallback(() => {
    if (switchProgressTimerRef.current !== null) {
      window.clearTimeout(switchProgressTimerRef.current);
      switchProgressTimerRef.current = null;
    }
    setShowProjectSwitchProgress(false);
  }, []);

  const scheduleProjectSwitchProgress = useCallback(() => {
    clearProjectSwitchProgress();
    switchProgressTimerRef.current = window.setTimeout(() => {
      switchProgressTimerRef.current = null;
      setShowProjectSwitchProgress(true);
    }, PROJECT_SWITCH_PROGRESS_DELAY_MS);
  }, [clearProjectSwitchProgress]);

  const loadProjects = useCallback(async () => {
    setDashboardLoading(true);
    setErrorMessage(null);
    setRetryAction(null);
    try {
      const [listResult, statsResult] = await Promise.all([
        api.project.list({ includeArchived: false }),
        api.project.stats({}),
      ]);
      if (!listResult.ok) {
        setErrorMessage(getHumanErrorMessage(listResult.error, t));
        setRetryAction({ kind: "load" });
        return;
      }
      if (!statsResult.ok) {
        setErrorMessage(getHumanErrorMessage(statsResult.error, t));
        setRetryAction({ kind: "load" });
        return;
      }

      setProjects(mergeDashboardProjects(listResult.data.items, readPerProjectStats(statsResult.data)));
      setErrorMessage(null);
      setRetryAction(null);
    } catch (error) {
      console.error("[RendererApp] failed to load dashboard projects", error);
      setErrorMessage(getHumanErrorMessage(error as Error, t));
      setRetryAction({ kind: "load" });
    } finally {
      setDashboardLoading(false);
    }
  }, [api.project, t]);

  useEffect(() => {
    return () => {
      if (switchProgressTimerRef.current !== null) {
        window.clearTimeout(switchProgressTimerRef.current);
        switchProgressTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const bootstrap = async () => {
      const current = await api.project.getCurrent();
      if (disposed) {
        return;
      }

      if (current.ok) {
        setCurrentProjectId(current.data.projectId);
        setView("workbench");
        return;
      }

      setCurrentProjectId(null);
      setView("dashboard");
      await loadProjects();
    };

    void bootstrap().catch((error: unknown) => {
      if (disposed) {
        return;
      }
      setErrorMessage(getHumanErrorMessage(error as Error, t));
      setView("error");
    });

    return () => {
      disposed = true;
    };
  }, [api.project, loadProjects, t]);

  const performProjectSwitch = useCallback(async (projectId: string) => {
    switchInFlightRef.current = true;
    setIsProjectSwitching(true);
    setErrorMessage(null);
    setRetryAction(null);
    scheduleProjectSwitchProgress();
    const traceId = `dashboard-${Date.now().toString(36)}`;
    try {
      const switchResult = await api.project.switchProject({
        projectId,
        fromProjectId: currentProjectId ?? "dashboard",
        operatorId: "renderer-dashboard",
        traceId,
      });

      if (!switchResult.ok) {
        setErrorMessage(getHumanErrorMessage(switchResult.error, t));
        setRetryAction({ kind: "switch", projectId });
        return;
      }

      setCurrentProjectId(projectId);
      setErrorMessage(null);
      setRetryAction(null);
      setView("workbench");
    } finally {
      switchInFlightRef.current = false;
      setIsProjectSwitching(false);
      clearProjectSwitchProgress();
    }
  }, [api.project, clearProjectSwitchProgress, currentProjectId, scheduleProjectSwitchProgress, t]);

  const handleOpenProject = useCallback(async (projectId: string) => {
    if (switchInFlightRef.current || createInFlightRef.current) {
      return;
    }
    await performProjectSwitch(projectId);
  }, [performProjectSwitch]);

  const handleCreateProject = useCallback(async () => {
    if (switchInFlightRef.current || createInFlightRef.current) {
      return;
    }
    createInFlightRef.current = true;
    setIsProjectCreating(true);
    setErrorMessage(null);
    setRetryAction(null);
    try {
      const createResult = await api.project.create({ name: t("project.defaultName"), type: "novel" });
      if (!createResult.ok) {
        setErrorMessage(getHumanErrorMessage(createResult.error, t));
        setRetryAction({ kind: "create" });
        return;
      }

      await performProjectSwitch(createResult.data.projectId);
    } finally {
      createInFlightRef.current = false;
      setIsProjectCreating(false);
    }
  }, [api.project, performProjectSwitch, t]);

  const handleRetryAction = useCallback(async () => {
    if (!retryAction) {
      return;
    }

    if (retryAction.kind === "load") {
      await loadProjects();
      return;
    }

    if (retryAction.kind === "create") {
      await handleCreateProject();
      return;
    }

    await handleOpenProject(retryAction.projectId);
  }, [handleCreateProject, handleOpenProject, loadProjects, retryAction]);

  useEffect(() => {
    if (view !== "dashboard" || dashboardLoading) {
      return;
    }
    if (errorMessage !== null) {
      setShowWelcome(false);
      return;
    }
    const completed = window.localStorage.getItem(WELCOME_COMPLETED_KEY) === "1";
    setShowWelcome(completed === false && projects.length === 0);
  }, [dashboardLoading, errorMessage, projects.length, view]);

  const handleWelcomeComplete = useCallback((selectedScenarios: string[]) => {
    window.localStorage.setItem(WELCOME_COMPLETED_KEY, "1");
    window.localStorage.setItem(WELCOME_SCENARIOS_KEY, JSON.stringify(selectedScenarios));
    setShowWelcome(false);
  }, []);

  const dashboardInteractionsDisabled = isProjectSwitching || isProjectCreating;

  if (view === "workbench") {
    return <WorkbenchApp />;
  }

  if (view === "loading") {
    return <p data-testid="renderer-loading">{t("dashboard.loading")}</p>;
  }

  if (view === "error") {
    return <p data-testid="renderer-error">{errorMessage ?? t("errors.generic")}</p>;
  }

  return (
    <>
      <DashboardPage
        projects={projects}
        loading={dashboardLoading}
        disabled={dashboardInteractionsDisabled}
        progressActive={showProjectSwitchProgress}
        error={errorMessage}
        onOpenProject={(projectId) => {
          if (switchInFlightRef.current || createInFlightRef.current) {
            return;
          }
          void handleOpenProject(projectId);
        }}
        onCreateProject={() => {
          if (switchInFlightRef.current || createInFlightRef.current) {
            return;
          }
          void handleCreateProject();
        }}
        onRetryError={() => {
          if (switchInFlightRef.current || createInFlightRef.current) {
            return;
          }
          void handleRetryAction();
        }}
      />
      {showWelcome ? <WelcomeScreen onComplete={handleWelcomeComplete} /> : null}
    </>
  );
}
