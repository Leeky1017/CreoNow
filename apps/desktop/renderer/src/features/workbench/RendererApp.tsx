import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { IpcResponseData } from "@shared/types/ipc-generated";

import { DashboardPage, type Project as DashboardProject } from "@/features/dashboard/DashboardPage";
import { WorkbenchApp } from "@/features/workbench/WorkbenchApp";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { getPreloadApi } from "@/lib/preloadApi";

type AppView = "loading" | "dashboard" | "workbench" | "error";

type ProjectListItem = IpcResponseData<"project:project:list">["items"][number];
type ProjectStatsItem = {
  projectId: string;
  wordCount?: number;
  progressPercent?: number;
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

function toStatsMap(items: ProjectStatsItem[]): Map<string, ProjectStatsItem> {
  return new Map(items.map((item) => [item.projectId, item]));
}


function readPerProjectStats(data: unknown): ProjectStatsItem[] {
  if (!data || typeof data !== "object" || !("perProject" in data)) {
    return [];
  }

  const perProject = (data as { perProject?: unknown }).perProject;
  if (!Array.isArray(perProject)) {
    return [];
  }

  return perProject.filter((item): item is ProjectStatsItem => {
    return (
      item !== null
      && typeof item === "object"
      && typeof (item as { projectId?: unknown }).projectId === "string"
    );
  });
}

export function RendererApp() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const [view, setView] = useState<AppView>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setDashboardLoading(true);
    const [listResult, statsResult] = await Promise.all([
      api.project.list({ includeArchived: false }),
      api.project.stats?.({}),
    ]);
    if (!listResult.ok) {
      setErrorMessage(getHumanErrorMessage(listResult.error, t));
      setDashboardLoading(false);
      return;
    }
    if (statsResult && !statsResult.ok) {
      setErrorMessage(getHumanErrorMessage(statsResult.error, t));
      setDashboardLoading(false);
      return;
    }

    const statsByProjectId = toStatsMap(readPerProjectStats(statsResult?.data));
    setProjects(
      listResult.data.items.map((item) => {
        const stats = statsByProjectId.get(item.projectId);
        return {
          ...toDashboardProject(item),
          wordCount: stats?.wordCount,
          progressPercent: stats?.progressPercent,
        };
      }),
    );
    setDashboardLoading(false);
  }, [api.project, t]);

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

  const handleOpenProject = useCallback(async (projectId: string) => {
    const traceId = `dashboard-${Date.now().toString(36)}`;
    const switchResult = await api.project.switchProject({
      projectId,
      fromProjectId: currentProjectId ?? "dashboard",
      operatorId: "renderer-dashboard",
      traceId,
    });

    if (!switchResult.ok) {
      setErrorMessage(getHumanErrorMessage(switchResult.error, t));
      return;
    }

    setCurrentProjectId(projectId);
    setErrorMessage(null);
    setView("workbench");
  }, [api.project, currentProjectId, t]);

  const handleCreateProject = useCallback(async () => {
    const createResult = await api.project.create({ name: t("project.defaultName"), type: "novel" });
    if (!createResult.ok) {
      setErrorMessage(getHumanErrorMessage(createResult.error, t));
      return;
    }

    await handleOpenProject(createResult.data.projectId);
  }, [api.project, handleOpenProject, t]);

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
      {errorMessage ? <p data-testid="dashboard-error">{errorMessage}</p> : null}
      <DashboardPage
        projects={projects}
        loading={dashboardLoading}
        onOpenProject={(projectId) => {
          void handleOpenProject(projectId);
        }}
        onCreateProject={() => {
          void handleCreateProject();
        }}
      />
    </>
  );
}
