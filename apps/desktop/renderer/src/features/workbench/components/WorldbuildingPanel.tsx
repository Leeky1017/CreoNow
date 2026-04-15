import { Globe, Grid3X3, History, Map, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type WorldbuildingTab = "encyclopedia" | "map" | "timeline";
export type WorldbuildingPanelStatus = "loading" | "ready" | "error";
export type WorldbuildingEntryStatus = "detailed" | "draft" | "unknown";

export interface WorldbuildingEntry {
  description: string;
  id: string;
  name: string;
  status: WorldbuildingEntryStatus;
  typeLabel: string;
  updatedAt: number;
}

interface WorldbuildingPanelProps {
  entries: WorldbuildingEntry[];
  errorMessage: string | null;
  onCreateEntry: () => void;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  onTabChange: (tab: WorldbuildingTab) => void;
  query: string;
  status: WorldbuildingPanelStatus;
  tab: WorldbuildingTab;
}

const WORLD_TABS: Array<{ icon: typeof Grid3X3; id: WorldbuildingTab; labelKey: string }> = [
  { id: "encyclopedia", icon: Grid3X3, labelKey: "sidebar.worldbuilding.tab.encyclopedia" },
  { id: "map", icon: Map, labelKey: "sidebar.worldbuilding.tab.map" },
  { id: "timeline", icon: History, labelKey: "sidebar.worldbuilding.tab.timeline" },
];

function statusLabel(status: WorldbuildingEntryStatus, t: (key: string) => string): string {
  if (status === "detailed") {
    return t("sidebar.worldbuilding.status.detailed");
  }
  if (status === "draft") {
    return t("sidebar.worldbuilding.status.draft");
  }
  return t("sidebar.worldbuilding.status.unknown");
}

function sortByUpdatedAtDesc(entries: WorldbuildingEntry[]): WorldbuildingEntry[] {
  return [...entries].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function WorldbuildingPanel(props: WorldbuildingPanelProps) {
  const { t } = useTranslation();
  const normalizedQuery = props.query.trim().toLocaleLowerCase();
  const filteredEntries = props.entries.filter((entry) => {
    if (normalizedQuery.length === 0) {
      return true;
    }
    const text = [entry.name, entry.typeLabel, entry.description].join(" ").toLocaleLowerCase();
    return text.includes(normalizedQuery);
  });
  const detailedCount = props.entries.filter((entry) => entry.status === "detailed").length;
  const draftCount = props.entries.filter((entry) => entry.status === "draft").length;
  const unknownCount = props.entries.length - detailedCount - draftCount;
  const timelineEntries = sortByUpdatedAtDesc(props.entries).slice(0, 6);

  return (
    <div className="worldbuilding-panel" data-testid="worldbuilding-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.worldbuilding.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.worldbuilding.subtitle")}</p>
      </div>

      <div className="worldbuilding-panel__toolbar">
        <label className="worldbuilding-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t("sidebar.worldbuilding.searchPlaceholder")}
            aria-label={t("sidebar.worldbuilding.searchLabel")}
            data-testid="worldbuilding-search"
          />
        </label>
        <Button tone="ghost" onClick={props.onCreateEntry} data-testid="worldbuilding-create-btn">
          <Plus size={14} />
          {t("sidebar.worldbuilding.create")}
        </Button>
      </div>

      <div className="worldbuilding-panel__tabs" role="tablist" aria-label={t("sidebar.worldbuilding.tabsLabel")}>
        {WORLD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={props.tab === tab.id}
            className={`worldbuilding-panel__tab${props.tab === tab.id ? " is-active" : ""}`}
            onClick={() => props.onTabChange(tab.id)}
            data-testid={`worldbuilding-tab-${tab.id}`}
          >
            <tab.icon size={14} />
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="worldbuilding-panel__meta" data-testid="worldbuilding-meta">
        <span>{t("sidebar.worldbuilding.meta.detailed", { count: detailedCount })}</span>
        <span>{t("sidebar.worldbuilding.meta.draft", { count: draftCount })}</span>
        {unknownCount > 0 ? <span>{t("sidebar.worldbuilding.meta.unknown", { count: unknownCount })}</span> : null}
      </div>

      {props.status === "loading" ? (
        <div className="worldbuilding-panel__state" data-testid="worldbuilding-loading">
          {t("sidebar.worldbuilding.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="worldbuilding-panel__state worldbuilding-panel__state--error" data-testid="worldbuilding-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.tab === "encyclopedia" ? (
        props.entries.length === 0 ? (
          <div className="worldbuilding-panel__state" data-testid="worldbuilding-empty">
            <p>{t("sidebar.worldbuilding.empty.title")}</p>
            <p>{t("sidebar.worldbuilding.empty.desc")}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="worldbuilding-panel__state" data-testid="worldbuilding-no-match">
            <p>{t("sidebar.worldbuilding.noMatch.title")}</p>
            <p>{t("sidebar.worldbuilding.noMatch.desc")}</p>
          </div>
        ) : (
          <div className="worldbuilding-panel__entry-list" data-testid="worldbuilding-entry-list">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="worldbuilding-entry-card" data-testid={`worldbuilding-entry-${entry.id}`}>
                <div className="worldbuilding-entry-card__header">
                  <div>
                    <h3 className="worldbuilding-entry-card__title">{entry.name}</h3>
                    <p className="worldbuilding-entry-card__type">{entry.typeLabel}</p>
                  </div>
                  <span className={`worldbuilding-entry-card__status${entry.status === "detailed" ? " is-detailed" : ""}`}>
                    {statusLabel(entry.status, t)}
                  </span>
                </div>
                <p className="worldbuilding-entry-card__desc">
                  {entry.description.length > 0 ? entry.description : t("sidebar.worldbuilding.entryDescriptionEmpty")}
                </p>
              </article>
            ))}
          </div>
        )
      ) : null}

      {props.status === "ready" && props.tab === "map" ? (
        <div className="worldbuilding-panel__state worldbuilding-panel__state--map" data-testid="worldbuilding-map">
          <Globe size={18} aria-hidden="true" />
          <p>{t("sidebar.worldbuilding.mapState")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.tab === "timeline" ? (
        timelineEntries.length === 0 ? (
          <div className="worldbuilding-panel__state" data-testid="worldbuilding-timeline-empty">
            <p>{t("sidebar.worldbuilding.timelineEmpty")}</p>
          </div>
        ) : (
          <div className="worldbuilding-panel__timeline" data-testid="worldbuilding-timeline">
            {timelineEntries.map((entry) => (
              <div key={entry.id} className="worldbuilding-panel__timeline-item" data-testid={`worldbuilding-timeline-${entry.id}`}>
                <p className="worldbuilding-panel__timeline-name">{entry.name}</p>
                <p className="worldbuilding-panel__timeline-meta">
                  {entry.typeLabel} · {statusLabel(entry.status, t)}
                </p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
