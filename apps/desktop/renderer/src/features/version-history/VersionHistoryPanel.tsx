import { Clock3, History, RotateCcw, Sparkles, User } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

import type {
  VersionHistoryAction,
  VersionHistorySnapshotDetail,
  VersionHistorySnapshotSummary,
  VersionHistoryStatus,
} from "./types";

interface VersionHistoryPanelProps {
  action: VersionHistoryAction;
  errorMessage: string | null;
  items: VersionHistorySnapshotSummary[];
  onRefresh: () => void;
  onRollback: () => void;
  onRestore: () => void;
  onSelectVersion: (versionId: string) => void;
  previewStatus: VersionHistoryStatus;
  selectedSnapshot: VersionHistorySnapshotDetail | null;
  selectedVersionId: string | null;
  status: VersionHistoryStatus;
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function getActorIcon(actor: VersionHistorySnapshotSummary["actor"]) {
  if (actor === "ai") {
    return Sparkles;
  }
  if (actor === "auto") {
    return Clock3;
  }
  return User;
}

function computeWordDelta(
  item: VersionHistorySnapshotSummary,
  byVersionId: Map<string, VersionHistorySnapshotSummary>,
): number | null {
  if (item.parentSnapshotId === null) {
    return null;
  }

  const parent = byVersionId.get(item.parentSnapshotId);
  if (!parent) {
    return null;
  }

  return item.wordCount - parent.wordCount;
}

export function VersionHistoryPanel(props: VersionHistoryPanelProps) {
  const { t } = useTranslation();
  const byVersionId = useMemo(
    () => new Map(props.items.map((item) => [item.versionId, item])),
    [props.items],
  );
  const previewText = props.selectedSnapshot?.contentText
    ?? props.selectedSnapshot?.contentMd
    ?? "";

  return <section className="version-history-surface" aria-label={t("sidebar.versionHistory.title")}>
    <header className="panel-section">
      <div>
        <h1 className="screen-title">{t("sidebar.versionHistory.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.versionHistory.subtitle")}</p>
      </div>
    </header>

    {props.status === "loading" ? <p className="panel-meta" role="status">{t("versionHistory.loading")}</p> : null}
    {props.status === "error" ? <div className="panel-section">
      <p className="panel-error" role="alert">{props.errorMessage ?? t("errors.generic")}</p>
      <Button tone="ghost" onClick={props.onRefresh}>{t("actions.retry")}</Button>
    </div> : null}
    {props.status === "ready" && props.items.length === 0 ? <p className="panel-meta">{t("versionHistory.empty")}</p> : null}

    {props.status !== "ready" || props.items.length === 0 ? null : <div className="version-history-layout">
      <div className="version-history-timeline" role="list" aria-label={t("versionHistory.timeline")}>
        {props.items.map((item) => {
          const Icon = getActorIcon(item.actor);
          const delta = computeWordDelta(item, byVersionId);
          const deltaLabel = delta === null
            ? t("versionHistory.wordCountTotal", { count: item.wordCount })
            : t("versionHistory.wordCountDelta", {
                count: item.wordCount,
                delta: `${delta > 0 ? "+" : ""}${delta}`,
              });

          return <Button
            key={item.versionId}
            tone="ghost"
            className={item.versionId === props.selectedVersionId
              ? "version-history-item version-history-item--active"
              : "version-history-item"}
            aria-pressed={item.versionId === props.selectedVersionId}
            onClick={() => props.onSelectVersion(item.versionId)}
          >
            <span className="version-history-item__icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="version-history-item__body">
              <span className="version-history-item__heading">
                <span>{t(`versionHistory.reason.${item.reason}`)}</span>
                <span className="version-history-item__timestamp">{formatTimestamp(item.createdAt)}</span>
              </span>
              <span className="version-history-item__meta">
                <span>{t(`versionHistory.actor.${item.actor}`)}</span>
                <span>{deltaLabel}</span>
              </span>
            </span>
          </Button>;
        })}
      </div>

      <article className="version-history-preview">
        <div className="panel-section">
          <div className="version-history-preview__header">
            <div>
              <h2 className="panel-title">{t("versionHistory.previewTitle")}</h2>
              <p className="panel-subtitle">{t("versionHistory.previewSubtitle")}</p>
            </div>
            <History size={16} aria-hidden="true" />
          </div>
        </div>

        {props.previewStatus === "loading" ? <p className="panel-meta" role="status">{t("versionHistory.previewLoading")}</p> : null}
        {props.previewStatus === "error" ? <p className="panel-error" role="alert">{props.errorMessage ?? t("errors.generic")}</p> : null}
        {props.previewStatus !== "loading" && props.selectedSnapshot === null ? <p className="panel-meta">{t("versionHistory.selectHint")}</p> : null}

        {props.selectedSnapshot === null ? null : <>
          <dl className="details-grid">
            <div className="details-row">
              <dt>{t("versionHistory.previewReason")}</dt>
              <dd>{t(`versionHistory.reason.${props.selectedSnapshot.reason}`)}</dd>
            </div>
            <div className="details-row">
              <dt>{t("versionHistory.previewActor")}</dt>
              <dd>{t(`versionHistory.actor.${props.selectedSnapshot.actor}`)}</dd>
            </div>
            <div className="details-row">
              <dt>{t("versionHistory.previewCreatedAt")}</dt>
              <dd>{formatTimestamp(props.selectedSnapshot.createdAt)}</dd>
            </div>
            <div className="details-row">
              <dt>{t("versionHistory.previewWordCount")}</dt>
              <dd>{t("status.wordCount", { count: props.selectedSnapshot.wordCount })}</dd>
            </div>
          </dl>

          <div className="version-history-preview__body">
            <p className="version-history-preview__text">{previewText.length > 0 ? previewText : t("versionHistory.previewEmpty")}</p>
          </div>

          <div className="panel-actions">
            <Button tone="primary" disabled={props.action !== null} onClick={props.onRollback}>
              {props.action === "rollback" ? t("versionHistory.rollingBack") : t("versionHistory.rollback")}
            </Button>
            <Button tone="ghost" disabled={props.action !== null} onClick={props.onRestore}>
              {props.action === "restore" ? t("versionHistory.restoring") : t("versionHistory.restore")}
            </Button>
            <Button tone="ghost" className="version-history-preview__refresh" onClick={props.onRefresh}>
              <RotateCcw size={14} aria-hidden="true" />
              <span>{t("versionHistory.refresh")}</span>
            </Button>
          </div>
        </>}
      </article>
    </div>}
  </section>;
}
