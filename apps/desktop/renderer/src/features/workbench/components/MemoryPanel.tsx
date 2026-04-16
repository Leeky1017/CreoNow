import { Brain, Clock3, Database, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type MemoryPanelStatus = "loading" | "ready" | "error";

export interface MemoryPanelEntry {
  category: string;
  createdAt: number;
  id: string;
  key: string;
  source: string;
  updatedAt: number;
  value: string;
}

interface MemoryPanelProps {
  entries: MemoryPanelEntry[];
  errorMessage: string | null;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  query: string;
  status: MemoryPanelStatus;
}

function toTestIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function categoryLabel(category: string, t: (key: string) => string): string {
  const normalized = category.trim().toLocaleLowerCase();
  if (normalized === "style-rule" || normalized === "style") {
    return t("sidebar.memory.category.style");
  }
  if (normalized === "structure") {
    return t("sidebar.memory.category.structure");
  }
  if (normalized === "character") {
    return t("sidebar.memory.category.character");
  }
  if (normalized === "pacing") {
    return t("sidebar.memory.category.pacing");
  }
  if (normalized === "vocabulary") {
    return t("sidebar.memory.category.vocabulary");
  }
  if (normalized === "preference") {
    return t("sidebar.memory.category.preference");
  }
  if (normalized === "character-setting") {
    return t("sidebar.memory.category.characterSetting");
  }
  if (normalized === "location-setting") {
    return t("sidebar.memory.category.locationSetting");
  }
  if (normalized === "reference") {
    return t("sidebar.memory.category.reference");
  }
  if (normalized === "episodic") {
    return t("sidebar.memory.category.episodic");
  }
  if (normalized.length === 0) {
    return t("sidebar.memory.category.misc");
  }
  return category;
}

function sourceLabel(source: string, t: (key: string) => string): string {
  const normalized = source.trim().toLocaleLowerCase();
  if (normalized === "user") {
    return t("sidebar.memory.source.user");
  }
  if (normalized === "system") {
    return t("sidebar.memory.source.system");
  }
  if (normalized.length === 0) {
    return t("sidebar.memory.source.unknown");
  }
  return source;
}

export function MemoryPanel(props: MemoryPanelProps) {
  const { t, i18n } = useTranslation();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const normalizedQuery = props.query.trim().toLocaleLowerCase();
  const filteredEntries = useMemo(
    () =>
      props.entries.filter((entry) => {
        if (normalizedQuery.length === 0) {
          return true;
        }
        const text = [entry.key, entry.value, entry.category, entry.source]
          .join(" ")
          .toLocaleLowerCase();
        return text.includes(normalizedQuery);
      }),
    [normalizedQuery, props.entries],
  );
  const timestampFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage ?? undefined, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
      }),
    [i18n.resolvedLanguage],
  );

  useEffect(() => {
    if (filteredEntries.length === 0) {
      setSelectedEntryId(null);
      return;
    }
    if (
      selectedEntryId === null
      || filteredEntries.some((entry) => entry.id === selectedEntryId) === false
    ) {
      setSelectedEntryId(filteredEntries[0]?.id ?? null);
    }
  }, [filteredEntries, selectedEntryId]);

  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null;
  const categoryCount = new Set(
    filteredEntries
      .map((entry) => entry.category.trim().toLocaleLowerCase())
      .filter((category) => category.length > 0),
  ).size;

  return (
    <div className="memory-panel" data-testid="memory-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.memory.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.memory.subtitle")}</p>
      </div>

      <div className="memory-panel__toolbar">
        <label className="memory-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t("sidebar.memory.searchPlaceholder")}
            aria-label={t("sidebar.memory.searchLabel")}
            data-testid="memory-search"
          />
        </label>
        <Button tone="ghost" onClick={props.onRetry} data-testid="memory-reload">
          <RotateCcw size={14} />
          {t("actions.retry")}
        </Button>
      </div>

      {props.status === "ready" ? (
        <div className="memory-panel__meta" data-testid="memory-meta">
          <span>{t("sidebar.memory.meta.total", { count: filteredEntries.length })}</span>
          <span>{t("sidebar.memory.meta.categories", { count: categoryCount })}</span>
          <span>{t("sidebar.memory.meta.selected", { count: selectedEntry === null ? 0 : 1 })}</span>
        </div>
      ) : null}

      {props.status === "loading" ? (
        <div className="memory-panel__state" data-testid="memory-loading">
          {t("sidebar.memory.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="memory-panel__state memory-panel__state--error" data-testid="memory-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.entries.length === 0 ? (
        <div className="memory-panel__state" data-testid="memory-empty">
          <p>{t("sidebar.memory.empty.title")}</p>
          <p>{t("sidebar.memory.empty.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.entries.length > 0 && filteredEntries.length === 0 ? (
        <div className="memory-panel__state" data-testid="memory-no-match">
          <p>{t("sidebar.memory.noMatch.title")}</p>
          <p>{t("sidebar.memory.noMatch.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && filteredEntries.length > 0 ? (
        <div className="memory-panel__layout">
          <section className="memory-panel__list" data-testid="memory-entry-list">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={selectedEntryId === entry.id ? "memory-entry-card is-active" : "memory-entry-card"}
                onClick={() => setSelectedEntryId(entry.id)}
                aria-pressed={selectedEntryId === entry.id}
                data-testid={`memory-entry-${toTestIdSuffix(entry.id)}`}
              >
                <div className="memory-entry-card__header">
                  <span className="memory-entry-card__category">{categoryLabel(entry.category, t)}</span>
                  <span className="memory-entry-card__date">{timestampFormatter.format(entry.updatedAt)}</span>
                </div>
                <p className="memory-entry-card__title">{entry.key}</p>
                <p className="memory-entry-card__snippet">
                  {entry.value.trim().length > 0 ? entry.value : t("sidebar.memory.detail.emptySnippet")}
                </p>
              </button>
            ))}
          </section>

          <section className="memory-panel__detail" data-testid="memory-detail">
            {selectedEntry ? (
              <>
                <div className="memory-panel__detail-label">
                  <Brain size={14} aria-hidden="true" />
                  <span>{t("sidebar.memory.detail.title")}</span>
                </div>
                <h3 className="memory-panel__detail-title">{selectedEntry.key}</h3>
                <p className="memory-panel__detail-content">
                  {selectedEntry.value.trim().length > 0
                    ? selectedEntry.value
                    : t("sidebar.memory.detail.emptySnippet")}
                </p>
                <div className="memory-panel__detail-meta">
                  <p>
                    <Database size={14} aria-hidden="true" />
                    <span>
                      {t("sidebar.memory.detail.category")}: {categoryLabel(selectedEntry.category, t)}
                    </span>
                  </p>
                  <p>
                    <Clock3 size={14} aria-hidden="true" />
                    <span>
                      {t("sidebar.memory.detail.updatedAt")}: {timestampFormatter.format(selectedEntry.updatedAt)}
                    </span>
                  </p>
                  <p>
                    <Clock3 size={14} aria-hidden="true" />
                    <span>
                      {t("sidebar.memory.detail.createdAt")}: {timestampFormatter.format(selectedEntry.createdAt)}
                    </span>
                  </p>
                  <p>
                    <Database size={14} aria-hidden="true" />
                    <span>
                      {t("sidebar.memory.detail.source")}: {sourceLabel(selectedEntry.source, t)}
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <div className="memory-panel__detail-empty">
                <Brain size={16} aria-hidden="true" />
                <p>{t("sidebar.memory.detail.selectHint")}</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
