import { useCallback, useEffect, useState } from "react";
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

import type { IpcResponseData } from "@shared/types/ipc-generated";

import { Button } from "@/components/primitives/Button";
import { SectionHeader } from "@/components/composites/SectionHeader";
import { StatPill } from "@/components/composites/StatPill";

import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { getPreloadApi, type PreloadApi } from "@/lib/preloadApi";
import { getHumanErrorMessage } from "@/lib/errorMessages";

import "./ProjectViewPage.css";

type ProjectListItem = IpcResponseData<"project:project:list">["items"][number];
type DocumentListItem = IpcResponseData<"file:document:list">["items"][number];

interface ProjectViewDocument {
  id: string;
  title: string;
  wordCount: number;
}

interface ProjectViewCharacter {
  id: string;
  name: string;
  role: string;
}

interface ProjectViewData {
  id: string;
  title: string;
  type: string;
  draftNumber: number;
  createdAt: string;
  totalWords: number;
  chapterCount: number;
  characterCount: number;
  locationCount: number;
  documents: ProjectViewDocument[];
  characters: ProjectViewCharacter[];
}

type LoadingState = "loading" | "ready" | "error";

interface ProjectViewPageProps {
  projectId: string;
  api?: PreloadApi;
  onEditProject?: (projectId: string) => void;
  onOpenSettings?: (projectId: string) => void;
  onOpenDocument?: (documentId: string) => void;
  onAddCharacter?: (projectId: string) => void;
}

function toProjectViewData(
  project: ProjectListItem,
  documents: DocumentListItem[],
): ProjectViewData {
  const docs: ProjectViewDocument[] = documents.map((d) => ({
    id: d.documentId,
    title: d.title,
    wordCount: 0,
  }));
  const totalWords = 0;

  return {
    id: project.projectId,
    title: project.name,
    type: project.type ?? "novel",
    draftNumber: 1,
    createdAt: typeof project.updatedAt === "number"
      ? new Date(project.updatedAt).toISOString()
      : String(project.updatedAt),
    totalWords,
    chapterCount: docs.length,
    characterCount: 0,
    locationCount: 0,
    documents: docs,
    characters: [],
  };
}

export function ProjectViewPage({
  projectId,
  api: apiProp,
  onEditProject,
  onOpenSettings,
  onOpenDocument,
  onAddCharacter,
}: ProjectViewPageProps) {
  const { t } = useTranslation();
  const api = apiProp ?? getPreloadApi();
  const [state, setState] = useState<LoadingState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectViewData | null>(null);

  const loadProject = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const [listResult, docsResult] = await Promise.all([
        api.project.list({ includeArchived: false }),
        api.file.listDocuments({ projectId }),
      ]);

      if (!listResult.ok) {
        setErrorMsg(getHumanErrorMessage(listResult.error, t));
        setState("error");
        return;
      }
      if (!docsResult.ok) {
        setErrorMsg(getHumanErrorMessage(docsResult.error, t));
        setState("error");
        return;
      }

      const found = listResult.data.items.find((p) => p.projectId === projectId);
      if (!found) {
        setErrorMsg(t("errors.notFound"));
        setState("error");
        return;
      }

      setProject(toProjectViewData(found, docsResult.data.items));
      setState("ready");
    } catch (err) {
      setErrorMsg(getHumanErrorMessage(err as Error, t));
      setState("error");
    }
  }, [api, projectId, t]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  if (state === "loading") {
    return (
      <div className="cn-project-view" data-testid="project-view-loading">
        <div className="cn-project-view__skeleton cn-project-view__skeleton--header" />
        <div className="cn-project-view__skeleton cn-project-view__skeleton--stats" />
        <div className="cn-project-view__skeleton cn-project-view__skeleton--list" />
      </div>
    );
  }

  if (state === "error" || !project) {
    return (
      <div className="cn-project-view" data-testid="project-view-error">
        <p>{errorMsg ?? t("errors.generic")}</p>
        <Button tone="secondary" onClick={() => { void loadProject(); }}>
          {t("actions.retry")}
        </Button>
      </div>
    );
  }

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
            <Button
              tone="ghost"
              data-testid="project-view-edit-btn"
              onClick={() => onEditProject?.(project.id)}
            >
              <Pencil size={14} />
              {t("project.view.edit")}
            </Button>
            <Button
              tone="ghost"
              data-testid="project-view-settings-btn"
              onClick={() => onOpenSettings?.(project.id)}
            >
              <Settings size={14} />
              {t("project.view.settings")}
            </Button>
          </div>
        </div>
        <p className="cn-project-view__subtitle">
          {t(`project.type.${project.type}`)} · {t("project.view.draft", { count: project.draftNumber })} · {t("project.view.createdAt", { date: formatRelativeTime(project.createdAt) })}
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
            <div
              key={doc.id}
              className="cn-project-view__doc-item"
              tabIndex={0}
              data-testid={`project-view-doc-${doc.id}`}
              onClick={() => onOpenDocument?.(doc.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenDocument?.(doc.id);
                }
              }}
            >
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
            <Button
              tone="ghost"
              className="cn-project-view__add-btn"
              data-testid="project-view-add-character-btn"
              onClick={() => onAddCharacter?.(project.id)}
            >
              <Plus size={12} />
              {t("project.view.addCharacter")}
            </Button>
          }
        />
        <div className="cn-project-view__char-grid">
          {project.characters.map((char) => (
            <div key={char.id} className="cn-project-view__char-card" tabIndex={0}>
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
