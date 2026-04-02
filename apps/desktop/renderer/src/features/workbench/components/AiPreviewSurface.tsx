import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import type { SelectionRef } from "@/editor/schema";
import type { AiPreview } from "@/features/workbench/runtime";

interface AiPreviewSurfaceProps {
  busy: boolean;
  errorMessage: string | null;
  instruction: string;
  model: string;
  onAccept: () => void;
  onGenerate: () => void;
  onInstructionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onReject: () => void;
  preview: AiPreview | null;
  selection: SelectionRef | null;
}

export function AiPreviewSurface(props: AiPreviewSurfaceProps) {
  const { t } = useTranslation();
  const selectionText = props.selection?.text ?? t("editor.emptySelection");
  const selectionHint = props.selection
    ? t("panel.ai.selectionLength", { count: props.selection.text.length })
    : t("editor.selectionHint");

  return <section className="ai-preview-surface" aria-label={t("panel.ai.title")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("panel.ai.title")}</h2>
        <p className="panel-subtitle">{t("panel.ai.subtitle")}</p>
      </div>
    </header>

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
      />
      <Button tone="primary" disabled={props.busy || props.selection === null} onClick={props.onGenerate}>
        {props.busy ? t("panel.ai.generating") : t("panel.ai.generate")}
      </Button>
    </div>

    <div className="panel-section">
      <div className="panel-row">
        <span className="field-label">{t("panel.ai.selection")}</span>
        <span className="panel-meta">{selectionHint}</span>
      </div>
      <div className="preview-card">{selectionText}</div>
    </div>

    {props.errorMessage ? <p className="panel-error" role="alert">{props.errorMessage}</p> : null}

    {props.preview ? (
      <div className="panel-section preview-stack">
        <p className="panel-meta">{t("panel.ai.ready")}</p>
        <div className="preview-grid">
          <article className="preview-column preview-column--original">
            <h3 className="preview-heading">{t("panel.ai.previewOriginal")}</h3>
            <p className="preview-body preview-body--original">{props.preview.originalText}</p>
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
