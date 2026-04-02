import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import type { SelectionRef } from "@/editor/schema";
import type { AiLauncherSkill, AiPreview } from "@/features/workbench/runtime";

const MAX_REFERENCE_LENGTH = 120;

interface AiPreviewSurfaceProps {
  busy: boolean;
  canContinue: boolean;
  canPolish: boolean;
  canRewrite: boolean;
  errorMessage: string | null;
  instruction: string;
  model: string;
  onAccept: () => void;
  onClearReference: () => void;
  onInstructionChange: (value: string) => void;
  onLaunchSkill: (skill: AiLauncherSkill) => void;
  onModelChange: (value: string) => void;
  onReject: () => void;
  preview: AiPreview | null;
  reference: SelectionRef | null;
}

function truncateReference(text: string): string {
  if (text.length <= MAX_REFERENCE_LENGTH) {
    return text;
  }

  return text.slice(0, MAX_REFERENCE_LENGTH).trimEnd() + "...";
}

export function AiPreviewSurface(props: AiPreviewSurfaceProps) {
  const { t } = useTranslation();
  const selectionHint = props.reference
    ? t("panel.ai.selectionLength", { count: props.reference.text.length })
    : t("editor.selectionHint");
  const previewOriginalHeading = props.preview?.skill === "continue"
    ? t("panel.ai.previewInsertion")
    : t("panel.ai.previewOriginal");
  const previewOriginalBody = props.preview?.skill === "continue"
    ? t("panel.ai.previewInsertionHint")
    : props.preview?.originalText ?? "";
  const previewOriginalBodyClassName = props.preview?.skill === "continue"
    ? "preview-body preview-body--insertion"
    : "preview-body preview-body--original";

  return <section className="ai-preview-surface" aria-label={t("panel.ai.title")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("panel.ai.title")}</h2>
        <p className="panel-subtitle">{t("panel.ai.subtitle")}</p>
      </div>
    </header>

    {props.reference ? <div className="panel-section">
      <div className="reference-card" role="note" aria-label={t("panel.ai.referenceSource")}>
        <div className="reference-card__content">
          <div className="panel-row">
            <span className="field-label">{t("panel.ai.referenceSource")}</span>
            <span className="panel-meta">{selectionHint}</span>
          </div>
          <p className="reference-card__text">{truncateReference(props.reference.text)}</p>
        </div>
        <Button tone="ghost" className="reference-card__dismiss" aria-label={t("panel.ai.clearSelection")} onClick={props.onClearReference}>
          ×
        </Button>
      </div>
    </div> : null}

    <div className="panel-section">
      <label className="field-label" htmlFor="ai-model">{t("panel.ai.model")}</label>
      <Input
        id="ai-model"
        value={props.model}
        onChange={(event) => props.onModelChange(event.target.value)}
      />
    </div>

    <div className="panel-section">
      <label className="field-label" htmlFor="ai-instruction">{t("panel.ai.instruction")}</label>
      <Textarea
        id="ai-instruction"
        rows={4}
        value={props.instruction}
        placeholder={t("panel.ai.instructionPlaceholder")}
        onChange={(event) => props.onInstructionChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
            return;
          }

          event.preventDefault();
          if (props.busy) {
            return;
          }

          if (props.canRewrite) {
            props.onLaunchSkill("rewrite");
            return;
          }

          if (props.canPolish) {
            props.onLaunchSkill("polish");
          }
        }}
      />
      <p className="panel-meta">{t("panel.ai.instructionHint")}</p>
    </div>

    <div className="panel-section preview-stack">
      <div className="panel-row">
        <span className="field-label">{t("panel.ai.launcher")}</span>
        <span className="panel-meta">{selectionHint}</span>
      </div>
      <div className="panel-actions">
        <Button
          tone="primary"
          disabled={props.busy || props.canPolish === false}
          onClick={() => props.onLaunchSkill("polish")}
        >
          {props.busy ? t("panel.ai.generating") : t("panel.ai.polish")}
        </Button>
        <Button
          tone="ghost"
          disabled={props.busy || props.canRewrite === false}
          onClick={() => props.onLaunchSkill("rewrite")}
        >
          {t("panel.ai.rewrite")}
        </Button>
        <Button
          tone="ghost"
          disabled={props.busy || props.canContinue === false}
          onClick={() => props.onLaunchSkill("continue")}
        >
          {t("panel.ai.continue")}
        </Button>
      </div>
    </div>

    {props.errorMessage ? <p className="panel-error" role="alert">{props.errorMessage}</p> : null}

    {props.preview ? (
      <div className="panel-section preview-stack">
        <p className="panel-meta">{t("panel.ai.ready")}</p>
        <div className="preview-grid">
          <article className="preview-column preview-column--original">
            <h3 className="preview-heading">{previewOriginalHeading}</h3>
            <p className={previewOriginalBodyClassName}>{previewOriginalBody}</p>
          </article>
          <article className="preview-column preview-column--suggestion">
            <h3 className="preview-heading">{t("panel.ai.previewSuggestion")}</h3>
            <p className="preview-body preview-body--suggestion">{props.preview.suggestedText}</p>
          </article>
        </div>
        <div className="panel-actions">
          <Button tone="primary" onClick={props.onAccept}>{t("panel.ai.accept")}</Button>
          <Button tone="ghost" onClick={props.onReject}>{t("panel.ai.reject")}</Button>
        </div>
      </div>
    ) : (
      <p className="panel-meta">{t("panel.ai.noPreview")}</p>
    )}
  </section>;
}
