import { Download, Globe, Link2, Send, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type ExportFormat = "docx" | "markdown" | "pdf" | "txt";
export type ExportPublishMode = "export" | "publish";

interface ExportPublishModalProps {
  errorMessage: string | null;
  exporting: boolean;
  isOpen: boolean;
  mode: ExportPublishMode;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  onModeChange: (mode: ExportPublishMode) => void;
  resultPath: string | null;
}

const EXPORT_OPTIONS: Array<{ format: ExportFormat; labelKey: string; metaKey: string }> = [
  { format: "pdf", labelKey: "export.modal.format.pdf", metaKey: "export.modal.formatMeta.pdf" },
  { format: "docx", labelKey: "export.modal.format.docx", metaKey: "export.modal.formatMeta.docx" },
  { format: "markdown", labelKey: "export.modal.format.markdown", metaKey: "export.modal.formatMeta.markdown" },
  { format: "txt", labelKey: "export.modal.format.txt", metaKey: "export.modal.formatMeta.txt" },
];

export function ExportPublishModal(props: ExportPublishModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (props.isOpen === false) {
    return null;
  }

  const publishLink = "https://preview.creonow.local/current-project";

  return (
    <div className="export-modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("export.modal.title")}
        onClick={(event) => event.stopPropagation()}
        data-testid="export-modal"
      >
        <header className="export-modal__header">
          <div className="export-modal__title-wrap">
            <h2 className="export-modal__title">{t("export.modal.title")}</h2>
            <p className="export-modal__subtitle">{t("export.modal.subtitle")}</p>
          </div>
          <Button tone="ghost" onClick={props.onClose} aria-label={t("actions.close")} data-testid="export-modal-close">
            <X size={14} />
          </Button>
        </header>

        <div className="export-modal__mode-switch" role="tablist" aria-label={t("export.modal.modeLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={props.mode === "export"}
            className={props.mode === "export" ? "export-modal__mode-tab is-active" : "export-modal__mode-tab"}
            onClick={() => props.onModeChange("export")}
            data-testid="export-mode-export"
          >
            <Download size={14} />
            {t("export.modal.mode.export")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.mode === "publish"}
            className={props.mode === "publish" ? "export-modal__mode-tab is-active" : "export-modal__mode-tab"}
            onClick={() => props.onModeChange("publish")}
            data-testid="export-mode-publish"
          >
            <Globe size={14} />
            {t("export.modal.mode.publish")}
          </button>
        </div>

        {props.mode === "export" ? (
          <section className="export-modal__content" data-testid="export-mode-panel">
            <div className="export-modal__grid">
              {EXPORT_OPTIONS.map((option) => (
                <button
                  key={option.format}
                  type="button"
                  className="export-format-card"
                  onClick={() => props.onExport(option.format)}
                  disabled={props.exporting}
                  data-testid={`export-format-${option.format}`}
                >
                  <p className="export-format-card__title">{t(option.labelKey)}</p>
                  <p className="export-format-card__meta">{t(option.metaKey)}</p>
                </button>
              ))}
            </div>
            {props.exporting ? (
              <p className="export-modal__status" data-testid="export-modal-exporting">
                {t("export.modal.exporting")}
              </p>
            ) : null}
            {props.resultPath ? (
              <p className="export-modal__status export-modal__status--success" data-testid="export-modal-success">
                {t("export.modal.success", { path: props.resultPath })}
              </p>
            ) : null}
            {props.errorMessage ? (
              <p className="export-modal__status export-modal__status--error" data-testid="export-modal-error">
                {props.errorMessage}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="export-modal__content" data-testid="publish-mode-panel">
            <div className="publish-card">
              <p className="publish-card__title">{t("export.modal.publish.preview")}</p>
              <p className="publish-card__link">{publishLink}</p>
              <div className="publish-card__actions">
                <Button
                  tone="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(publishLink);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    } catch {
                      setCopied(false);
                    }
                  }}
                  data-testid="publish-copy-link"
                >
                  <Link2 size={14} />
                  {copied ? t("export.modal.publish.copied") : t("export.modal.publish.copyLink")}
                </Button>
                <Button tone="primary" data-testid="publish-send">
                  <Send size={14} />
                  {t("export.modal.publish.send")}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
