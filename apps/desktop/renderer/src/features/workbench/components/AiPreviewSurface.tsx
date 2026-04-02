import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import type { SelectionRef } from "@/editor/schema";
import type { AiPreview, SkillId } from "@/features/workbench/runtime";

const MAX_REFERENCE_LENGTH = 120;

interface AiPreviewSurfaceProps {
  activeSkill: SkillId;
  busy: boolean;
  errorMessage: string | null;
  instruction: string;
  model: string;
  onAccept: () => void;
  onClearReference: () => void;
  onGenerate: () => void;
  onInstructionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onReject: () => void;
  onSkillChange: (skill: SkillId) => void;
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

  // continue 不需要选区；polish / rewrite 依赖选区
  const needsSelection = props.activeSkill !== "continue";
  const selectionHint = props.reference
    ? t("panel.ai.selectionLength", { count: props.reference.text.length })
    : needsSelection
      ? t("editor.selectionHint")
      : t("panel.ai.continueHint");

  // 生成按钮可用性：continue 不需选区；polish / rewrite 需选区；rewrite 还需指令
  const generateDisabled = props.busy
    || (needsSelection && props.reference === null)
    || (props.activeSkill === "rewrite" && !props.instruction.trim());

  // 仅改写需要指令输入框
  const showInstruction = props.activeSkill === "rewrite";

  return <section className="ai-preview-surface" aria-label={t("panel.ai.title")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("panel.ai.title")}</h2>
        <p className="panel-subtitle">{t("panel.ai.subtitle")}</p>
      </div>
    </header>

    {/* 技能选择器：三入口 */}
    <div className="panel-section">
      <fieldset className="skill-selector" aria-label={t("panel.ai.skillLabel")}>
        <legend className="field-label">{t("panel.ai.skillLabel")}</legend>
        <div className="skill-selector__buttons" role="group">
          <Button
            tone={props.activeSkill === "polish" ? "primary" : "ghost"}
            aria-pressed={props.activeSkill === "polish"}
            disabled={props.busy}
            onClick={() => props.onSkillChange("polish")}
          >
            {t("panel.ai.skillPolish")}
          </Button>
          <Button
            tone={props.activeSkill === "rewrite" ? "primary" : "ghost"}
            aria-pressed={props.activeSkill === "rewrite"}
            disabled={props.busy}
            onClick={() => props.onSkillChange("rewrite")}
          >
            {t("panel.ai.skillRewrite")}
          </Button>
          <Button
            tone={props.activeSkill === "continue" ? "primary" : "ghost"}
            aria-pressed={props.activeSkill === "continue"}
            disabled={props.busy}
            onClick={() => props.onSkillChange("continue")}
          >
            {t("panel.ai.skillContinue")}
          </Button>
        </div>
      </fieldset>
    </div>

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

    {showInstruction ? <div className="panel-section">
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
          if (generateDisabled) {
            return;
          }

          props.onGenerate();
        }}
      />
      <p className="panel-meta">{selectionHint}</p>
    </div> : <p className="panel-meta">{selectionHint}</p>}

    <div className="panel-section">
      <Button tone="primary" disabled={generateDisabled} onClick={props.onGenerate}>
        {props.busy ? t("panel.ai.generating") : t("panel.ai.generate")}
      </Button>
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