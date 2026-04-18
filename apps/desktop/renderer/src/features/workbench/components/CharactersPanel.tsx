import { Plus, Search, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type CharactersPanelStatus = "loading" | "ready" | "error";
export type CharacterPanelEntryStatus = "active" | "draft" | "unknown";

export interface CharacterPanelEntry {
  description: string;
  id: string;
  name: string;
  role: string;
  status: CharacterPanelEntryStatus;
}

interface CharactersPanelProps {
  deletingEntryId?: string | null;
  entries: CharacterPanelEntry[];
  errorMessage: string | null;
  onConflictQuickTool?: () => void;
  onCreateEntry: () => void;
  onDeleteEntry?: (entry: CharacterPanelEntry) => void;
  onExportQuickTool?: () => void;
  onKnowledgeGraphQuickTool?: () => void;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  onSearchQuickTool?: () => void;
  query: string;
  status: CharactersPanelStatus;
}

function statusLabel(
  status: CharacterPanelEntryStatus,
  t: (key: string) => string,
): string {
  if (status === "active") {
    return t("sidebar.characters.status.active");
  }
  if (status === "draft") {
    return t("sidebar.characters.status.draft");
  }
  return t("sidebar.characters.status.unknown");
}

export function CharactersPanel(props: CharactersPanelProps) {
  const { t } = useTranslation();
  const normalizedQuery = props.query.trim().toLocaleLowerCase();
  const filteredEntries = props.entries.filter((entry) => {
    if (normalizedQuery.length === 0) {
      return true;
    }
    const searchable = [entry.name, entry.role, entry.description]
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
  const activeCount = props.entries.filter((entry) => entry.status === "active").length;
  const draftCount = props.entries.filter((entry) => entry.status === "draft").length;
  const unknownCount = props.entries.length - activeCount - draftCount;

  return (
    <div className="characters-panel" data-testid="characters-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.characters.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.characters.subtitle")}</p>
      </div>

      <div className="characters-panel__toolbar">
        <label className="characters-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t("sidebar.characters.searchPlaceholder")}
            aria-label={t("sidebar.characters.searchLabel")}
            data-testid="characters-search"
          />
        </label>
        <Button tone="ghost" onClick={props.onCreateEntry} data-testid="characters-create-btn">
          <Plus size={14} />
          {t("sidebar.characters.create")}
        </Button>
      </div>

      <div className="sidebar-quick-tools">
        <button type="button" className="sidebar-quick-tools__item" onClick={props.onSearchQuickTool}>
          {t("sidebar.quickTools.search")}
        </button>
        <button type="button" className="sidebar-quick-tools__item" onClick={props.onKnowledgeGraphQuickTool}>
          {t("sidebar.quickTools.tree")}
        </button>
        <button type="button" className="sidebar-quick-tools__item" onClick={props.onConflictQuickTool}>
          {t("sidebar.quickTools.conflict")}
        </button>
        <button type="button" className="sidebar-quick-tools__item" onClick={props.onExportQuickTool}>
          {t("sidebar.quickTools.export")}
        </button>
      </div>

      {props.status === "ready" ? (
        <div className="characters-panel__meta" data-testid="characters-meta">
          <span>{t("sidebar.characters.meta.active", { count: activeCount })}</span>
          <span>{t("sidebar.characters.meta.draft", { count: draftCount })}</span>
          {unknownCount > 0 ? <span>{t("sidebar.characters.meta.unknown", { count: unknownCount })}</span> : null}
        </div>
      ) : null}

      {props.status === "loading" ? (
        <div className="characters-panel__state" data-testid="characters-loading">
          {t("sidebar.characters.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="characters-panel__state characters-panel__state--error" data-testid="characters-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.entries.length === 0 ? (
        <div className="characters-panel__state" data-testid="characters-empty">
          <p>{t("sidebar.characters.empty.title")}</p>
          <p>{t("sidebar.characters.empty.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.entries.length > 0 && filteredEntries.length === 0 ? (
        <div className="characters-panel__state" data-testid="characters-no-match">
          <p>{t("sidebar.characters.noMatch.title")}</p>
          <p>{t("sidebar.characters.noMatch.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && filteredEntries.length > 0 ? (
        <div className="characters-panel__entry-list" data-testid="characters-entry-list">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="characters-entry-card" data-testid={`characters-entry-${entry.id}`}>
              <div className="characters-entry-card__header">
                <div className="characters-entry-card__identity">
                  <div className="characters-entry-card__avatar" aria-hidden="true">
                    {entry.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="characters-entry-card__title">{entry.name}</h3>
                    <p className="characters-entry-card__role">
                      {entry.role.length > 0
                        ? entry.role
                        : t("project.view.characterRoleUnknown")}
                    </p>
                  </div>
                </div>
                <div className="characters-entry-card__actions">
                  <span className={`characters-entry-card__status${entry.status === "active" ? " is-active" : ""}`}>
                    {statusLabel(entry.status, t)}
                  </span>
                  {props.onDeleteEntry ? (
                    <Button
                      tone="ghost"
                      onClick={() => props.onDeleteEntry?.(entry)}
                      disabled={props.deletingEntryId === entry.id}
                      data-testid={`characters-entry-delete-${entry.id}`}
                      aria-label={t("sidebar.characters.deleteAria", { name: entry.name })}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {props.deletingEntryId === entry.id
                        ? t("sidebar.characters.deleting")
                        : t("sidebar.characters.delete")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="characters-entry-card__desc">
                {entry.description.length > 0
                  ? entry.description
                  : t("project.view.characterDescriptionEmpty")}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {props.status === "ready" && props.entries.length === 0 ? (
        <div className="characters-panel__state characters-panel__state--hint">
          <Users size={18} aria-hidden="true" />
          <p>{t("sidebar.characters.state")}</p>
        </div>
      ) : null}
    </div>
  );
}
