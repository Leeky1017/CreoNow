import { useTranslation } from "react-i18next";
import {
  BookOpen,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Settings,
  Type,
  Users,
} from "lucide-react";

import { Button } from "@/components/primitives/Button";
import { SectionHeader } from "@/components/composites/SectionHeader";
import { StatPill } from "@/components/composites/StatPill";

import type { ProjectData } from "./mockData";
import { mockProject } from "./mockData";

import "./ProjectViewPage.css";

interface ProjectViewPageProps {
  project?: ProjectData;
}

export function ProjectViewPage({ project = mockProject }: ProjectViewPageProps) {
  const { t } = useTranslation();

  return (
    <div className="cn-project-view">
      {/* ── Header ──────────────────────── */}
      <header className="cn-project-view__header">
        <div className="cn-project-view__header-row">
          <div className="cn-project-view__title-group">
            <span className="cn-project-view__icon">
              <BookOpen size={20} />
            </span>
            <h1 className="cn-project-view__title">{project.title}</h1>
          </div>
          <div className="cn-project-view__actions">
            <Button tone="ghost">
              <Pencil size={14} />
              {t("project.view.edit")}
            </Button>
            <Button tone="ghost">
              <Settings size={14} />
              {t("project.view.settings")}
            </Button>
          </div>
        </div>
        <p className="cn-project-view__subtitle">
          {project.type} · {t("project.view.draft", { count: project.draftNumber })} · {t("project.view.createdAt", { date: project.createdAt })}
        </p>
      </header>

      {/* ── Stats ───────────────────────── */}
      <div className="cn-project-view__stats">
        <StatPill
          icon={<Type size={12} />}
          label={t("project.view.stats.words", { count: project.totalWords })}
        />
        <StatPill
          icon={<BookOpen size={12} />}
          label={t("project.view.stats.chapters", { count: project.chapterCount })}
        />
        <StatPill
          icon={<Users size={12} />}
          label={t("project.view.stats.characters", { count: project.characterCount })}
        />
        <StatPill
          icon={<MapPin size={12} />}
          label={t("project.view.stats.locations", { count: project.locationCount })}
        />
      </div>

      {/* ── Documents ───────────────────── */}
      <section className="cn-project-view__section">
        <SectionHeader label={t("project.view.documents")} />
        <div className="cn-project-view__doc-list">
          {project.documents.map((doc) => (
            <div key={doc.id} className="cn-project-view__doc-item">
              <div className="cn-project-view__doc-title-group">
                <span className="cn-project-view__doc-icon">
                  <FileText size={14} />
                </span>
                <h3 className="cn-project-view__doc-title">{doc.title}</h3>
              </div>
              <span className="cn-project-view__doc-words">
                {t("project.view.stats.words", { count: doc.wordCount })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Characters ──────────────────── */}
      <section className="cn-project-view__section">
        <SectionHeader
          label={t("project.view.characters")}
          action={
            <Button tone="ghost" className="cn-settings__verify">
              <Plus size={12} />
              {t("project.view.addCharacter")}
            </Button>
          }
        />
        <div className="cn-project-view__char-grid">
          {project.characters.map((char) => (
            <div key={char.id} className="cn-project-view__char-card">
              <div className="cn-project-view__char-avatar">
                {char.name.charAt(0)}
              </div>
              <span className="cn-project-view__char-name">{char.name}</span>
              <span className="cn-project-view__char-role">{char.role}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
