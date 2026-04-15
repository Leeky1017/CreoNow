import { RotateCcw, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type SearchStrategy = "fts" | "semantic" | "hybrid";
export type SearchPanelStatus = "loading" | "ready" | "error";

export interface SearchPanelResult {
  documentId: string;
  id: string;
  score: number;
  snippet: string;
  strategy?: SearchStrategy;
  title?: string;
  updatedAt: number;
}

interface SearchPanelProps {
  effectiveStrategy?: SearchStrategy;
  errorMessage: string | null;
  notice?: string | null;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  onStrategyChange: (strategy: SearchStrategy) => void;
  query: string;
  results: SearchPanelResult[];
  status: SearchPanelStatus;
  strategy: SearchStrategy;
}

const SEARCH_STRATEGIES: SearchStrategy[] = ["fts", "semantic", "hybrid"];

function toTestIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function strategyLabel(strategy: SearchStrategy, t: (key: string) => string): string {
  return t(`sidebar.search.strategy.${strategy}`);
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) {
    return "0.000";
  }
  return score.toFixed(3);
}

export function SearchPanel(props: SearchPanelProps) {
  const { t, i18n } = useTranslation();
  const normalizedQuery = props.query.trim();
  const activeStrategy = props.effectiveStrategy ?? props.strategy;
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

  return (
    <div className="search-panel" data-testid="search-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.search.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.search.subtitle")}</p>
      </div>

      <div className="search-panel__toolbar">
        <label className="search-panel__query">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t("sidebar.search.query.placeholder")}
            aria-label={t("sidebar.search.query.label")}
            data-testid="search-query-input"
          />
        </label>
        <Button tone="ghost" onClick={props.onRetry} data-testid="search-retry">
          <RotateCcw size={14} aria-hidden="true" />
          {t("actions.retry")}
        </Button>
      </div>

      <div className="search-panel__strategy" role="group" aria-label={t("sidebar.search.strategy.label")}>
        {SEARCH_STRATEGIES.map((item) => (
          <button
            key={item}
            type="button"
            className={item === props.strategy ? "search-panel__strategy-button is-active" : "search-panel__strategy-button"}
            onClick={() => props.onStrategyChange(item)}
            aria-pressed={item === props.strategy}
            data-testid={`search-strategy-${item}`}
          >
            {strategyLabel(item, t)}
          </button>
        ))}
      </div>

      {props.status === "ready" ? (
        <div className="search-panel__meta" data-testid="search-meta">
          <span>{t("sidebar.search.meta.total", { count: props.results.length })}</span>
          <span>{t("sidebar.search.meta.strategy", { strategy: strategyLabel(activeStrategy, t) })}</span>
          {activeStrategy !== props.strategy ? (
            <span>{t("sidebar.search.meta.fallback", { strategy: strategyLabel(props.strategy, t) })}</span>
          ) : null}
        </div>
      ) : null}
      {props.status === "ready" && props.notice?.trim() ? (
        <div className="search-panel__meta" data-testid="search-notice">
          <span>{props.notice}</span>
        </div>
      ) : null}

      {props.status === "loading" ? (
        <div className="search-panel__state" data-testid="search-loading">
          {t("sidebar.search.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div
          className="search-panel__state search-panel__state--error"
          data-testid="search-error"
          role="alert"
        >
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.results.length === 0 && normalizedQuery.length === 0 ? (
        <div className="search-panel__state" data-testid="search-empty">
          <p>{t("sidebar.search.empty.title")}</p>
          <p>{t("sidebar.search.empty.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && normalizedQuery.length > 0 && props.results.length === 0 ? (
        <div className="search-panel__state" data-testid="search-no-match">
          <p>{t("sidebar.search.noMatch.title")}</p>
          <p>{t("sidebar.search.noMatch.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.results.length > 0 ? (
        <section className="search-panel__results" data-testid="search-result-list">
          {props.results.map((result) => {
            const scoreValue = formatScore(result.score);
            const scoreKey = toTestIdSuffix(result.id);
            const resolvedTitle = result.title?.trim().length
              ? result.title
              : t("sidebar.search.result.untitled");
            const resolvedSnippet = result.snippet.trim().length
              ? result.snippet
              : t("sidebar.search.result.emptySnippet");
            return (
              <article
                key={result.id}
                className="search-result-card"
                data-testid={`search-result-${toTestIdSuffix(result.id)}`}
              >
                <header className="search-result-card__header">
                  <h3 className="search-result-card__title">{resolvedTitle}</h3>
                  <span
                    className="search-result-card__score"
                    data-testid={`search-score-${scoreKey}`}
                    data-score={scoreValue}
                  >
                    {t("sidebar.search.result.score", { score: scoreValue })}
                  </span>
                </header>
                <p className="search-result-card__snippet">{resolvedSnippet}</p>
                <footer className="search-result-card__meta">
                  <span>{t("sidebar.search.result.documentId", { documentId: result.documentId })}</span>
                  <span>{t("sidebar.search.result.strategy", { strategy: strategyLabel(result.strategy ?? activeStrategy, t) })}</span>
                  <span>
                    {t("sidebar.search.result.updatedAt", {
                      timestamp: timestampFormatter.format(result.updatedAt),
                    })}
                  </span>
                </footer>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
