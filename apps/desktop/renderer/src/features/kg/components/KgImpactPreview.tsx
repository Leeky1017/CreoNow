import { useTranslation } from "react-i18next";
import type { IpcResponseData } from "@shared/types/ipc-generated";

import { ConfirmDialog } from "@/components/composites/ConfirmDialog";
import { cn } from "@/lib/cn";

import "./KgImpactPreview.css";

export type KgImpactPreviewPayload = IpcResponseData<"knowledge:impact:preview">;

interface KgImpactPreviewProps {
  open: boolean;
  /**
   * Loaded impact preview payload. When `null`, the dialog shows a loading
   * hint instead. When the fetch itself fails the parent should pass an
   * `errorMessage` to render the recoverable error copy.
   */
  preview: KgImpactPreviewPayload | null;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function KgImpactPreview({
  open,
  preview,
  errorMessage,
  onConfirm,
  onCancel,
  className,
}: KgImpactPreviewProps) {
  const { t } = useTranslation();
  const entityName = preview?.entity.name ?? "";

  return (
    <ConfirmDialog
      open={open}
      title={t("kg.impact.title", { name: entityName })}
      description={t("kg.impact.subtitle")}
      confirmLabel={t("kg.impact.confirm")}
      cancelLabel={t("kg.impact.cancel")}
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmDisabled={preview == null || Boolean(errorMessage)}
      typedConfirmValue={
        preview?.requiresTypedConfirmation ? entityName : undefined
      }
      typedConfirmPrompt={
        preview?.requiresTypedConfirmation
          ? t("kg.impact.typed.prompt", { name: entityName })
          : undefined
      }
      typedConfirmPlaceholder={
        preview?.requiresTypedConfirmation
          ? t("kg.impact.typed.placeholder")
          : undefined
      }
      typedConfirmMismatch={t("kg.impact.typed.mismatch")}
      className={cn("cn-kg-impact", className)}
    >
      {errorMessage && (
        <p className="cn-kg-impact__error" role="alert">
          {errorMessage}
        </p>
      )}
      {!errorMessage && preview == null && (
        <p className="cn-kg-impact__loading">{t("kg.impact.loading")}</p>
      )}
      {!errorMessage && preview != null && (
        <ImpactBody preview={preview} />
      )}
    </ConfirmDialog>
  );
}

function ImpactBody({ preview }: { preview: KgImpactPreviewPayload }) {
  const { t } = useTranslation();
  const severityClass = "cn-kg-impact__severity--" + preview.severity;

  return (
    <div className="cn-kg-impact__body">
      <div className={cn("cn-kg-impact__severity", severityClass)}>
        <span className="cn-kg-impact__severity-dot" aria-hidden />
        <span className="cn-kg-impact__severity-label">
          {t("kg.impact.severity." + preview.severity)}
        </span>
        <span className="cn-kg-impact__severity-summary">
          {t("kg.impact.summary", {
            relations: preview.totalRelationCount,
            foreshadows: preview.unresolvedForeshadowCount,
          })}
        </span>
      </div>

      <section className="cn-kg-impact__section">
        <h4 className="cn-kg-impact__section-title">
          {t("kg.impact.relations.title")}
        </h4>
        {preview.totalRelationCount === 0 ? (
          <p className="cn-kg-impact__empty">
            {t("kg.impact.relations.empty")}
          </p>
        ) : (
          <ul className="cn-kg-impact__list">
            {[...preview.incomingRelations, ...preview.outgoingRelations].map(
              (relation) => (
                <li key={relation.id} className="cn-kg-impact__item">
                  <span className="cn-kg-impact__item-direction">
                    {relation.direction === "incoming"
                      ? t("kg.impact.relations.incoming")
                      : t("kg.impact.relations.outgoing")}
                  </span>
                  <span className="cn-kg-impact__item-name">
                    {relation.otherEntityName ||
                      t("kg.impact.relations.unknown")}
                  </span>
                  <span className="cn-kg-impact__item-type">
                    {relation.relationType}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="cn-kg-impact__section">
        <h4 className="cn-kg-impact__section-title">
          {t("kg.impact.foreshadows.title")}
        </h4>
        {preview.affectedForeshadows.length === 0 ? (
          <p className="cn-kg-impact__empty">
            {t("kg.impact.foreshadows.empty")}
          </p>
        ) : (
          <ul className="cn-kg-impact__list">
            {preview.affectedForeshadows.map((foreshadow) => (
              <li key={foreshadow.id} className="cn-kg-impact__item">
                <span className="cn-kg-impact__item-name">
                  {foreshadow.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
