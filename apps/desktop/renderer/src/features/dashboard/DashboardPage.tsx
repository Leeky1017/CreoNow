import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, PenLine, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/primitives/Button";
import { EmptyState } from "@/components/composites/EmptyState";
import { SearchBar } from "@/components/composites/SearchBar";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

import type { Project } from "./mockData";
import { mockProjects } from "./mockData";

import "./DashboardPage.css";

type FilterType = "all" | "recent" | "novels" | "shorts";

interface DashboardPageProps {
  projects?: Project[];
}

export function DashboardPage({ projects = mockProjects }: DashboardPageProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = projects.filter((p) => {
    if (search && !p.title.includes(search)) {
      return false;
    }
    if (filter === "novels") return p.type === "novel";
    if (filter === "shorts") return p.type === "short-collection";
    return true;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("dashboard.filter.all") },
    { key: "recent", label: t("dashboard.filter.recent") },
    { key: "novels", label: t("dashboard.filter.novels") },
    { key: "shorts", label: t("dashboard.filter.shorts") },
  ];

  return (
    <div className="cn-dashboard">
      <header className="cn-dashboard__header">
        <div className="cn-dashboard__brand">
          <span className="cn-dashboard__brand-icon">
            <PenLine size={20} />
          </span>
          <h1 className="cn-dashboard__title">{t("dashboard.title")}</h1>
        </div>
        <Button tone="primary">
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
          {filters.map((f) => (
            <Button
              key={f.key}
              tone="ghost"
              className={cn(
                "cn-dashboard__filter-chip",
                filter === f.key && "cn-dashboard__filter-chip--active",
              )}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="cn-dashboard__list">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={t("dashboard.empty.title")}
          description={t("dashboard.empty.description")}
          action={
            <Button tone="primary">
              <Plus size={14} />
              {t("dashboard.newProject")}
            </Button>
          }
        />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation();

  const statParts: string[] = [];
  if (project.chapterCount != null) {
    statParts.push(t("dashboard.stats.chapters", { count: project.chapterCount }));
  }
  if (project.storyCount != null) {
    statParts.push(t("dashboard.stats.stories", { count: project.storyCount }));
  }
  statParts.push(t("dashboard.stats.words", { count: project.wordCount }));

  return (
    <Button tone="ghost" className="cn-dashboard__card">
      <div className="cn-dashboard__card-icon">
        <FileText size={18} />
      </div>
      <div className="cn-dashboard__card-content">
        <div className="cn-dashboard__card-header">
          <span className="cn-dashboard__card-type">{t(`project.type.${project.type}`)}</span>
          <span className="cn-dashboard__card-meta-dot" />
          <h2 className="cn-dashboard__card-title">{project.title}</h2>
        </div>
        <p className="cn-dashboard__card-meta">
          {statParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="cn-dashboard__card-meta-dot" />}
              {part}
            </span>
          ))}
          <span className="cn-dashboard__card-meta-dot" />
          <span>{formatRelativeTime(project.updatedAt)}</span>
        </p>
      </div>
    </Button>
  );
}
