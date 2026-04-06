import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { IpcResponseData } from "@shared/types/ipc-generated";

import { DashboardPage, type Project as DashboardProject } from "@/features/dashboard/DashboardPage";
import { WorkbenchApp } from "@/features/workbench/WorkbenchApp";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { getPreloadApi } from "@/lib/preloadApi";

type AppView = "loading" | "dashboard" | "workbench" | "error";

type ProjectListItem = IpcResponseData<"project:project:list">["items"][number];

function toDashboardProject(item: ProjectListItem): DashboardProject {
  return {
    id: item.projectId,
    title: item.name,
    type: item.type ?? "novel",
    stage: item.stage,
    updatedAt: item.updatedAt,
  };
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
    const result = await api.project.list({ includeArchived: false });
    if (!result.ok) {
      setErrorMessage(getHumanErrorMessage(result.error, t));
      setDashboardLoading(false);
      return;
    }

    setProjects(result.data.items.map(toDashboardProject));
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
    const switchResult =
      api.project.switchProject && currentProjectId
        ? await api.project.switchProject({
            projectId,
            fromProjectId: currentProjectId,
            operatorId: "renderer-dashboard",
            traceId,
          })
        : await api.project.setCurrent({ projectId });

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
