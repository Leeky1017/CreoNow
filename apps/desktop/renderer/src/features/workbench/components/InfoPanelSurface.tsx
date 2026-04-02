import { useTranslation } from "react-i18next";

interface InfoPanelSurfaceProps {
  documentTitle: string | null;
  errorMessage?: string | null;
  loading?: boolean;
  projectName: string | null;
  statusLabel: string | null;
  updatedAt: string | null;
  wordCount: number;
}

export function InfoPanelSurface(props: InfoPanelSurfaceProps) {
  const { t } = useTranslation();

  return <section className="panel-surface" aria-label={t("tabs.info")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("tabs.info")}</h2>
        <p className="panel-subtitle">{t("panel.info.subtitle")}</p>
      </div>
    </header>

    {props.loading ? <p className="panel-meta" role="status">{t("panel.info.loading")}</p> : null}
    {props.loading === false && props.errorMessage ? <p className="panel-error" role="alert">{props.errorMessage}</p> : null}
    {props.loading === false && props.errorMessage === null && props.documentTitle === null ? <p className="panel-meta">{t("panel.info.empty")}</p> : null}

    {props.loading || props.errorMessage || props.documentTitle === null ? null : <dl className="details-grid">
      <div className="details-row">
        <dt>{t("panel.info.project")}</dt>
        <dd>{props.projectName ?? t("project.defaultName")}</dd>
      </div>
      <div className="details-row">
        <dt>{t("panel.info.document")}</dt>
        <dd>{props.documentTitle}</dd>
      </div>
      <div className="details-row">
        <dt>{t("panel.info.wordCount")}</dt>
        <dd>{t("status.wordCount", { count: props.wordCount })}</dd>
      </div>
      <div className="details-row">
        <dt>{t("panel.info.updatedAt")}</dt>
        <dd>{props.updatedAt ?? "—"}</dd>
      </div>
      <div className="details-row">
        <dt>{t("panel.info.status")}</dt>
        <dd>{props.statusLabel ?? "—"}</dd>
      </div>
    </dl>}
  </section>;
}