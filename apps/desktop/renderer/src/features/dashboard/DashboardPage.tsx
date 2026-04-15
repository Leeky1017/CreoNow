import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, PenLine, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/primitives/Button";
import { EmptyState } from "@/components/composites/EmptyState";
import { SearchBar } from "@/components/composites/SearchBar";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

import type { Project, ProjectStage } from "./mockData";

import "./DashboardPage.css";

export type { Project };

type FilterType = "all" | "recent" | "novels" | "shorts";

const RECENT_LIMIT = 5;

const STAGE_LABEL_KEY: Record<ProjectStage, string> = {
  outline: "dashboard.stage.outline",
  draft: "dashboard.stage.draft",
  revision: "dashboard.stage.revision",
  final: "dashboard.stage.final",
};

interface DashboardPageProps {
  projects?: Project[];
  loading?: boolean;
  error?: string | null;
  onCreateProject?: () => void;
  onOpenProject?: (projectId: string) => void;
  onRetryError?: () => void;
}

function normalizeUpdatedAt(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardPage({
  projects = [],
  loading = false,
  error = null,
  onCreateProject,
  onOpenProject,
  onRetryError,
}: DashboardPageProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const normalizedSearch = search.trim().toLocaleLowerCase();

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => normalizeUpdatedAt(b.updatedAt) - normalizeUpdatedAt(a.updatedAt)),
    [projects],
  );

  const recentProjectIds = useMemo(
    () => new Set(sortedProjects.slice(0, RECENT_LIMIT).map((project) => project.id)),
    [sortedProjects],
  );

  const hasProjects = sortedProjects.length > 0;

  const filtered = sortedProjects.filter((project) => {
    if (
      normalizedSearch.length > 0 &&
      !project.title.toLocaleLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }
    if (filter === "novels") {
      return project.type === "novel";
    }
    if (filter === "shorts") {
      return project.type === "short-collection";
    }
    if (filter === "recent") {
      return recentProjectIds.has(project.id);
    }
    return true;
  });
  const showSearchNoMatch = normalizedSearch.length > 0 && filtered.length === 0;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("dashboard.filter.all") },
    { key: "recent", label: t("dashboard.filter.recent") },
    { key: "novels", label: t("dashboard.filter.novels") },
    { key: "shorts", label: t("dashboard.filter.shorts") },
  ];

  return (
    <div className="cn-dashboard" data-testid="dashboard-page">
      <header className="cn-dashboard__header">
        <div className="cn-dashboard__brand">
          <span className="cn-dashboard__brand-icon">
            <PenLine size={20} />
          </span>
          <h1 className="cn-dashboard__title">{t("dashboard.title")}</h1>
        </div>
        <Button
          tone="primary"
          onClick={onCreateProject}
          disabled={loading}
          data-testid="dashboard-create-project-btn"
        >
          <Plus size={14} />
          {t("dashboard.newProject")}
        </Button>
      </header>

      <div className="cn-dashboard__filters">
        <SearchBar
          className="cn-dashboard__search"
          value={search}
          onChange={setSearch}
          placeholder={t("dashboard.search.placeholder")}
        />
        <div className="cn-dashboard__filter-group">
          {filters.map((item) => (
            <Button
              key={item.key}
              tone="ghost"
              className={cn("cn-dashboard__filter-chip", filter === item.key && "cn-dashboard__filter-chip--active")}
              onClick={() => setFilter(item.key)}
              data-testid={`dashboard-filter-${item.key}`}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="cn-dashboard__error" data-testid="dashboard-error-banner" role="alert">
          <p className="cn-dashboard__error-text">{error}</p>
          <Button
            tone="secondary"
            onClick={onRetryError ?? onCreateProject}
            disabled={loading}
            data-testid="dashboard-error-retry-btn"
          >
            {t("actions.retry")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="cn-dashboard__list" data-testid="dashboard-loading">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="cn-dashboard__skeleton-card">
              <div className="cn-dashboard__skeleton cn-dashboard__skeleton--icon" />
              <div className="cn-dashboard__skeleton-content">
                <div className="cn-dashboard__skeleton cn-dashboard__skeleton--title" />
                <div className="cn-dashboard__skeleton cn-dashboard__skeleton--meta" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="cn-dashboard__list" data-testid="dashboard-project-list">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      ) : hasProjects ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={t("dashboard.search.noMatch")}
        />
      ) : showSearchNoMatch ? (
        <p data-testid="dashboard-search-no-match">{t("dashboard.search.noMatch")}</p>
      ) : (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={t("dashboard.empty.title")}
          description={t("dashboard.empty.description")}
          action={
            <Button tone="primary" onClick={onCreateProject} data-testid="dashboard-empty-create-btn">
              <Plus size={14} />
              {t("dashboard.newProject")}
            </Button>
          }
        />
      )}
    </div>
  );
}

function ProjectCard(props: {
  project: Project;
  onOpenProject?: (projectId: string) => void;
}) {
  const { t } = useTranslation();

  const statParts: string[] = [];
  if (props.project.chapterCount != null) {
    statParts.push(t("dashboard.stats.chapters", { count: props.project.chapterCount }));
  }
  if (props.project.storyCount != null) {
    statParts.push(t("dashboard.stats.stories", { count: props.project.storyCount }));
  }
  if (props.project.wordCount != null) {
    statParts.push(t("dashboard.stats.words", { count: props.project.wordCount }));
  }
  if (props.project.progressPercent != null) {
    statParts.push(t("dashboard.stats.progress", { percent: props.project.progressPercent }));
  }

  const stageKey = props.project.stage ? STAGE_LABEL_KEY[props.project.stage] : null;

  return (
    <Button
      tone="ghost"
      className="cn-dashboard__card"
      onClick={() => props.onOpenProject?.(props.project.id)}
      data-testid={`dashboard-project-card-${props.project.id}`}
    >
      <div className="cn-dashboard__card-icon">
        <FileText size={18} />
      </div>
      <div className="cn-dashboard__card-content">
        <div className="cn-dashboard__card-header">
          <span className="cn-dashboard__card-type">{t(`project.type.${props.project.type}`)}</span>
          <span className="cn-dashboard__card-meta-dot" />
          <h2 className="cn-dashboard__card-title">{props.project.title}</h2>
        </div>
        {stageKey !== null ? <p data-testid={`dashboard-project-stage-${props.project.id}`}>{t(stageKey)}</p> : null}
        <p className="cn-dashboard__card-meta">
          {statParts.map((part, index) => (
            <span key={part}>
              {index > 0 && <span className="cn-dashboard__card-meta-dot" />}
              {part}
            </span>
          ))}
          <span className="cn-dashboard__card-meta-dot" />
          <span>{formatRelativeTime(props.project.updatedAt)}</span>
        </p>
      </div>
    </Button>
  );
}
