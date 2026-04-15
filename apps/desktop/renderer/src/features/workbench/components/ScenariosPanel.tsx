import { BookOpen, Film, Hash, PenTool, RotateCcw, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type ScenariosPanelStatus = "loading" | "ready" | "error";

export interface ScenarioTemplate {
  description: string;
  id: string;
  labelKey: string;
  profileKey: string;
}

interface ScenariosPanelProps {
  activeScenarioId: string;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectScenario: (scenarioId: string) => void;
  scenarios: ScenarioTemplate[];
  status: ScenariosPanelStatus;
}

function scenarioIcon(scenarioId: string) {
  const normalized = scenarioId.trim().toLocaleLowerCase();
  if (normalized === "novel") {
    return BookOpen;
  }
  if (normalized === "script") {
    return Film;
  }
  if (normalized === "social" || normalized === "media") {
    return Hash;
  }
  return PenTool;
}

function toTestIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function ScenariosPanel(props: ScenariosPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filtered = useMemo(
    () =>
      props.scenarios.filter((scenario) => {
        if (normalizedQuery.length === 0) {
          return true;
        }
        const text = [
          t(scenario.labelKey),
          scenario.description,
          t(scenario.profileKey),
        ]
          .join(" ")
          .toLocaleLowerCase();
        return text.includes(normalizedQuery);
      }),
    [normalizedQuery, props.scenarios, t],
  );

  return (
    <div className="scenarios-panel" data-testid="scenarios-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.scenarios.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.scenarios.subtitle")}</p>
      </div>

      <div className="scenarios-panel__toolbar">
        <label className="scenarios-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("sidebar.scenarios.searchPlaceholder")}
            aria-label={t("sidebar.scenarios.searchLabel")}
            data-testid="scenarios-search"
          />
        </label>
        <Button tone="ghost" onClick={props.onRetry} data-testid="scenarios-reload">
          <RotateCcw size={14} />
          {t("actions.retry")}
        </Button>
      </div>

      {props.status === "ready" ? (
        <div className="scenarios-panel__meta" data-testid="scenarios-meta">
          <span>{t("sidebar.scenarios.meta.total", { count: props.scenarios.length })}</span>
          <span>{t("sidebar.scenarios.meta.filtered", { count: filtered.length })}</span>
        </div>
      ) : null}

      {props.status === "loading" ? (
        <div className="scenarios-panel__state" data-testid="scenarios-loading">
          {t("sidebar.scenarios.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="scenarios-panel__state scenarios-panel__state--error" data-testid="scenarios-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.scenarios.length === 0 ? (
        <div className="scenarios-panel__state" data-testid="scenarios-empty">
          <p>{t("sidebar.scenarios.empty.title")}</p>
          <p>{t("sidebar.scenarios.empty.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.scenarios.length > 0 && filtered.length === 0 ? (
        <div className="scenarios-panel__state" data-testid="scenarios-no-match">
          <p>{t("sidebar.scenarios.noMatch.title")}</p>
          <p>{t("sidebar.scenarios.noMatch.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && filtered.length > 0 ? (
        <div className="scenarios-panel__grid" data-testid="scenarios-list">
          {filtered.map((scenario) => {
            const Icon = scenarioIcon(scenario.id);
            const isActive = props.activeScenarioId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                className={isActive ? "scenario-card is-active" : "scenario-card"}
                aria-pressed={isActive}
                onClick={() => props.onSelectScenario(scenario.id)}
                data-testid={`scenario-card-${toTestIdSuffix(scenario.id)}`}
              >
                <div className="scenario-card__header">
                  <Icon size={18} aria-hidden="true" />
                  <span className="scenario-card__profile">
                    <Sparkles size={12} aria-hidden="true" />
                    {t(scenario.profileKey)}
                  </span>
                </div>
                <h3 className="scenario-card__title">{t(scenario.labelKey)}</h3>
                <p className="scenario-card__desc">{scenario.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
