import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export interface VersionHistoryItem {
  actor: "user" | "auto" | "ai";
  createdAtLabel: string;
  parentSnapshotId: string | null;
  reason:
    | "manual-save"
    | "autosave"
    | "ai-accept"
    | "ai-partial-accept"
    | "status-change"
    | "pre-write"
    | "pre-rollback"
    | "rollback";
  versionId: string;
  wordCount: number;
}

interface VersionHistorySurfaceProps {
  errorMessage: string | null;
  items: VersionHistoryItem[];
  loading: boolean;
  pendingRollbackVersionId: string | null;
  rollbackingVersionId: string | null;
  onCancelRollback: () => void;
  onConfirmRollback: (versionId: string) => void;
  onRequestRollback: (versionId: string) => void;
}

export function VersionHistorySurface(props: VersionHistorySurfaceProps) {
  const { t } = useTranslation();

  return <section className="panel-surface" aria-label={t("panel.history.title")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("panel.history.title")}</h2>
        <p className="panel-subtitle">{t("panel.history.subtitle")}</p>
      </div>
    </header>

    {props.loading ? <p className="panel-meta" role="status">{t("panel.history.loading")}</p> : null}
    {props.loading === false && props.errorMessage ? <p className="panel-error" role="alert">{props.errorMessage}</p> : null}
    {props.loading === false && props.errorMessage === null && props.items.length === 0
      ? <p className="panel-meta">{t("panel.history.empty")}</p>
      : null}

    {props.loading || props.errorMessage || props.items.length === 0 ? null : <div className="history-list">
      {props.items.map((item) => {
        const pending = props.pendingRollbackVersionId === item.versionId;
        const rollingBack = props.rollbackingVersionId === item.versionId;
        return <article key={item.versionId} className="history-item">
          <div className="history-item__header">
            <div className="history-item__summary">
              <strong>{item.createdAtLabel}</strong>
              <span className="panel-meta">
                {t(`panel.history.actor.${item.actor}`)}
                {" · "}
                {t(`panel.history.reason.${item.reason}`)}
              </span>
            </div>
            <span className="history-item__word-count">
              {t("status.wordCount", { count: item.wordCount })}
            </span>
          </div>
          <p className="panel-meta">{t("panel.history.snapshotId", { id: item.versionId })}</p>
          {item.parentSnapshotId
            ? <p className="panel-meta">{t("panel.history.parentSnapshot", { id: item.parentSnapshotId })}</p>
            : null}
          <div className="history-item__actions">
            {pending ? <>
              <p className="panel-meta">{t("panel.history.confirmation")}</p>
              <div className="history-item__confirm">
                <Button
                  tone="primary"
                  disabled={props.rollbackingVersionId !== null}
                  onClick={() => props.onConfirmRollback(item.versionId)}
                >
                  {rollingBack ? t("panel.history.restoring") : t("panel.history.confirmRestore")}
                </Button>
                <Button
                  tone="ghost"
                  disabled={props.rollbackingVersionId !== null}
                  onClick={props.onCancelRollback}
                >
                  {t("actions.close")}
                </Button>
              </div>
            </> : <Button
              tone="ghost"
              disabled={props.rollbackingVersionId !== null}
              onClick={() => props.onRequestRollback(item.versionId)}
            >
              {t("panel.history.restore")}
            </Button>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
