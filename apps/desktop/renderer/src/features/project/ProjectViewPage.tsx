import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  FileText,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
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
type CharacterListItem = IpcResponseData<"settings:character:list">["items"][number];

interface ProjectViewDocument {
  id: string;
  title: string;
  wordCount: number;
}

interface ProjectViewCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "draft" | "unknown";
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
type CharacterViewMode = "grid" | "list";

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
  characters: CharacterListItem[],
): ProjectViewData {
  const docs: ProjectViewDocument[] = documents.map((d) => ({
    id: d.documentId,
    title: d.title,
    wordCount: 0,
  }));
  const charList: ProjectViewCharacter[] = characters.map((entry) => {
    const role = entry.attributes.role?.trim() ?? "";
    const statusText = entry.attributes.status?.trim().toLocaleLowerCase();
    const status: ProjectViewCharacter["status"] = statusText === "active"
      ? "active"
      : statusText === "draft"
        ? "draft"
        : "unknown";
    return {
      id: entry.id,
      name: entry.name,
      role,
      description: entry.description?.trim() ?? "",
      status,
    };
  });
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
    characterCount: charList.length,
    locationCount: 0,
    documents: docs,
    characters: charList,
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
  const [characterView, setCharacterView] = useState<CharacterViewMode>("grid");
  const [characterQuery, setCharacterQuery] = useState("");

  const loadProject = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const [listResult, docsResult, charactersResult] = await Promise.all([
        api.project.list({ includeArchived: false }),
        api.file.listDocuments({ projectId }),
        api.character.list({ projectId }),
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
      if (!charactersResult.ok) {
        setErrorMsg(getHumanErrorMessage(charactersResult.error, t));
        setState("error");
        return;
      }

      const found = listResult.data.items.find((p) => p.projectId === projectId);
      if (!found) {
        setErrorMsg(t("errors.notFound"));
        setState("error");
        return;
      }

      setProject(toProjectViewData(found, docsResult.data.items, charactersResult.data.items));
      setState("ready");
    } catch (err) {
      setErrorMsg(getHumanErrorMessage(err as Error, t));
      setState("error");
    }
  }, [api, projectId, t]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    setCharacterQuery("");
    setCharacterView("grid");
  }, [projectId]);

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

  const normalizedCharacterQuery = characterQuery.trim().toLocaleLowerCase();
  const filteredCharacters = project.characters.filter((char) => {
    if (normalizedCharacterQuery.length === 0) {
      return true;
    }
    const searchableText = [char.name, char.role, char.description]
      .join(" ")
      .toLocaleLowerCase();
    return searchableText.includes(normalizedCharacterQuery);
  });
  const activeCharacterCount = project.characters.filter((char) => char.status === "active").length;
  const draftCharacterCount = project.characters.filter((char) => char.status === "draft").length;
  const unknownCharacterCount = project.characters.length - activeCharacterCount - draftCharacterCount;

  const renderCharacterStatus = (status: ProjectViewCharacter["status"]): string => {
    if (status === "active") {
      return t("project.view.characterStatus.active");
    }
    if (status === "draft") {
      return t("project.view.characterStatus.draft");
    }
    return t("project.view.characterStatus.unknown");
  };

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
        <div className="cn-project-view__char-toolbar">
          <label className="cn-project-view__char-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={characterQuery}
              onChange={(event) => setCharacterQuery(event.target.value)}
              placeholder={t("project.view.characterSearchPlaceholder")}
              aria-label={t("project.view.characterSearchLabel")}
              data-testid="project-view-character-search"
            />
          </label>
          <div
            className="cn-project-view__char-view-toggle"
            role="group"
            aria-label={t("project.view.characterViewMode")}
          >
            <button
              type="button"
              data-testid="project-view-char-grid-btn"
              className={`cn-project-view__char-view-btn${characterView === "grid" ? " is-active" : ""}`}
              onClick={() => setCharacterView("grid")}
              aria-pressed={characterView === "grid"}
            >
              <LayoutGrid size={14} />
              <span>{t("project.view.viewMode.grid")}</span>
            </button>
            <button
              type="button"
              data-testid="project-view-char-list-btn"
              className={`cn-project-view__char-view-btn${characterView === "list" ? " is-active" : ""}`}
              onClick={() => setCharacterView("list")}
              aria-pressed={characterView === "list"}
            >
              <List size={14} />
              <span>{t("project.view.viewMode.list")}</span>
            </button>
          </div>
        </div>

        <div className="cn-project-view__char-meta" data-testid="project-view-characters-meta">
          <span>
            {t("project.view.charactersActive", { count: activeCharacterCount })}
          </span>
          <span>
            {t("project.view.charactersDraft", { count: draftCharacterCount })}
          </span>
          {unknownCharacterCount > 0 ? <span>{t("project.view.charactersOther", { count: unknownCharacterCount })}</span> : null}
        </div>

        {project.characters.length === 0
          ? (
            <div className="cn-project-view__char-empty" data-testid="project-view-characters-empty">
              <p className="cn-project-view__char-empty-title">{t("project.view.charactersEmptyTitle")}</p>
              <p className="cn-project-view__char-empty-desc">{t("project.view.charactersEmptyDesc")}</p>
              <Button
                tone="secondary"
                data-testid="project-view-add-character-empty-btn"
                onClick={() => onAddCharacter?.(project.id)}
              >
                <Plus size={12} />
                {t("project.view.addCharacter")}
              </Button>
            </div>
          )
          : filteredCharacters.length === 0
            ? (
              <div className="cn-project-view__char-empty" data-testid="project-view-characters-no-match">
                <p className="cn-project-view__char-empty-title">{t("project.view.charactersNoMatchTitle")}</p>
                <p className="cn-project-view__char-empty-desc">{t("project.view.charactersNoMatchDesc")}</p>
              </div>
            )
            : characterView === "grid"
              ? (
                <div className="cn-project-view__char-grid" data-testid="project-view-characters-grid">
                  {filteredCharacters.map((char) => (
                    <div key={char.id} className="cn-project-view__char-card" data-testid={`project-view-char-${char.id}`}>
                      <div className="cn-project-view__char-card-header">
                        <div className="cn-project-view__char-avatar">
                          {char.name.charAt(0)}
                        </div>
                        <span className={`cn-project-view__char-status${char.status === "active" ? " is-active" : ""}${char.status === "unknown" ? " is-unknown" : ""}`}>
                          {renderCharacterStatus(char.status)}
                        </span>
                      </div>
                      <span className="cn-project-view__char-name">{char.name}</span>
                      <span className="cn-project-view__char-role">{char.role || t("project.view.characterRoleUnknown")}</span>
                      <p className="cn-project-view__char-desc">{char.description || t("project.view.characterDescriptionEmpty")}</p>
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="cn-project-view__char-list" data-testid="project-view-characters-list">
                  {filteredCharacters.map((char) => (
                    <div key={char.id} className="cn-project-view__char-row" data-testid={`project-view-char-row-${char.id}`}>
                      <div className="cn-project-view__char-row-identity">
                        <div className="cn-project-view__char-avatar">
                          {char.name.charAt(0)}
                        </div>
                        <div className="cn-project-view__char-row-text">
                          <span className="cn-project-view__char-name">{char.name}</span>
                          <span className="cn-project-view__char-role">{char.role || t("project.view.characterRoleUnknown")}</span>
                        </div>
                      </div>
                      <span className={`cn-project-view__char-status${char.status === "active" ? " is-active" : ""}${char.status === "unknown" ? " is-unknown" : ""}`}>
                        {renderCharacterStatus(char.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
      </section>
    </div>
  );
}
