import { RotateCcw, ShieldCheck, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import type { VersionSnapshotListItem } from "@/features/workbench/runtime";

type VersionActionMode = "restore" | "rollback";

interface VersionHistorySurfaceProps {
  activeDocumentId: string | null;
  busyAction: {
    mode: VersionActionMode;
    versionId: string;
  } | null;
  errorMessage?: string | null;
  items: VersionSnapshotListItem[];
  loading?: boolean;
  onRestore: (versionId: string) => void;
  onRollback: (versionId: string) => void;
}

function getActorIcon(actor: VersionSnapshotListItem["actor"]) {
  if (actor === "ai") {
    return Sparkles;
  }
  if (actor === "auto") {
    return ShieldCheck;
  }
  return User;
}

function getActorKey(actor: VersionSnapshotListItem["actor"]): string {
  return `sidebar.versionHistory.actor.${actor}`;
}

function getReasonKey(reason: VersionSnapshotListItem["reason"]): string {
  return `sidebar.versionHistory.reason.${reason}`;
}

function formatSnapshotTimestamp(createdAt: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(createdAt);
}

export function VersionHistorySurface(props: VersionHistorySurfaceProps) {
  const { t } = useTranslation();

  return <section className="sidebar-surface" aria-label={t("sidebar.versionHistory.title")}>
    <div className="panel-section">
      <div>
        <h1 className="screen-title">{t("sidebar.versionHistory.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.versionHistory.subtitle")}</p>
      </div>
    </div>

    {props.loading ? <p className="panel-meta" role="status">{t("sidebar.versionHistory.loading")}</p> : null}
    {props.loading === false && props.errorMessage ? <p className="panel-error" role="alert">{props.errorMessage}</p> : null}
    {props.loading === false && props.errorMessage === null && props.items.length === 0 ? <p className="panel-meta">{t("sidebar.versionHistory.state")}</p> : null}

    {props.loading || props.errorMessage || props.items.length === 0 ? null : <div className="version-history-list">
      {props.items.map((item) => {
        const ActorIcon = getActorIcon(item.actor);
        const isCurrent = props.activeDocumentId !== null && item.versionId === props.items[0]?.versionId;
        const restoreBusy = props.busyAction?.mode === "restore" && props.busyAction.versionId === item.versionId;
        const rollbackBusy = props.busyAction?.mode === "rollback" && props.busyAction.versionId === item.versionId;

        return <article
          key={item.versionId}
          className={isCurrent ? "version-history-item version-history-item--current" : "version-history-item"}
        >
          <header className="version-history-item__header">
            <div className="version-history-item__meta">
              <span className="version-history-badge">
                <ActorIcon size={14} />
                {t(getActorKey(item.actor))}
              </span>
              <span className="version-history-badge version-history-badge--muted">
                {t(getReasonKey(item.reason))}
              </span>
              {isCurrent ? <span className="version-history-badge version-history-badge--accent">
                {t("sidebar.versionHistory.current")}
              </span> : null}
            </div>
            <time className="panel-meta" dateTime={new Date(item.createdAt).toISOString()}>
              {formatSnapshotTimestamp(item.createdAt)}
            </time>
          </header>

          <dl className="details-grid details-grid--compact">
            <div className="details-row">
              <dt>{t("sidebar.versionHistory.wordCount")}</dt>
              <dd>{t("status.wordCount", { count: item.wordCount })}</dd>
            </div>
            <div className="details-row">
              <dt>{t("sidebar.versionHistory.snapshotId")}</dt>
              <dd className="version-history-item__id">{item.versionId}</dd>
            </div>
          </dl>

          <div className="version-history-item__actions">
            <Button
              tone="ghost"
              className="version-history-item__action"
              disabled={restoreBusy || rollbackBusy}
              onClick={() => props.onRestore(item.versionId)}
            >
              {restoreBusy ? t("sidebar.versionHistory.restoring") : t("sidebar.versionHistory.actions.restore")}
            </Button>
            <Button
              tone="ghost"
              className="version-history-item__action version-history-item__action--danger"
              disabled={restoreBusy || rollbackBusy}
              onClick={() => props.onRollback(item.versionId)}
            >
              <RotateCcw size={14} />
              {rollbackBusy ? t("sidebar.versionHistory.rollingBack") : t("sidebar.versionHistory.actions.rollback")}
            </Button>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
