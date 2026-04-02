import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import type { SelectionRef } from "@/editor/schema";
import type { AiPreview, WorkbenchSkillId } from "@/features/workbench/runtime";

const MAX_REFERENCE_LENGTH = 120;
const SKILL_OPTIONS: WorkbenchSkillId[] = ["builtin:polish", "builtin:rewrite", "builtin:continue"];

interface AiPreviewSurfaceProps {
  activeSkill: WorkbenchSkillId;
  busy: boolean;
  errorMessage: string | null;
  generateDisabled: boolean;
  instruction: string;
  instructionHint: string;
  model: string;
  onAccept: () => void;
  onClearReference: () => void;
  onGenerate: () => void;
  onInstructionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onReject: () => void;
  onSkillChange: (skillId: WorkbenchSkillId) => void;
  preview: AiPreview | null;
  reference: SelectionRef | null;
}

function truncateReference(text: string): string {
  if (text.length <= MAX_REFERENCE_LENGTH) {
    return text;
  }

  return text.slice(0, MAX_REFERENCE_LENGTH).trimEnd() + "...";
}

function toSkillKey(skillId: WorkbenchSkillId): "polish" | "rewrite" | "continue" {
  if (skillId === "builtin:continue") {
    return "continue";
  }
  if (skillId === "builtin:rewrite") {
    return "rewrite";
  }
  return "polish";
}

export function AiPreviewSurface(props: AiPreviewSurfaceProps) {
  const { t } = useTranslation();
  const skillKey = toSkillKey(props.activeSkill);
  const reference = props.activeSkill !== "builtin:continue" ? props.reference : null;
  const insertionPreview = props.preview?.changeType === "insert";
  const previewOriginalHeading = insertionPreview ? t("panel.ai.previewInsertionTarget") : t("panel.ai.previewOriginal");
  const previewOriginalBody = insertionPreview ? t("panel.ai.previewInsertionBody") : props.preview?.originalText ?? "";
  const previewOriginalBodyClassName = insertionPreview ? "preview-body preview-body--anchor" : "preview-body preview-body--original";
  const previewSuggestionHeading = insertionPreview ? t("panel.ai.previewInsertionSuggestion") : t("panel.ai.previewSuggestion");

  return <section className="ai-preview-surface" aria-label={t("panel.ai.title")}>
    <header className="panel-section">
      <div>
        <h2 className="panel-title">{t("panel.ai.title")}</h2>
        <p className="panel-subtitle">{t("panel.ai.subtitle")}</p>
      </div>
    </header>

    <div className="panel-section skill-launcher">
      <div className="panel-row">
        <span className="field-label">{t("panel.ai.skillLauncher")}</span>
        <span className="panel-meta">{t(`panel.ai.skillHints.${skillKey}`)}</span>
      </div>
      <div className="skill-launcher__options" role="group" aria-label={t("panel.ai.skillLauncher")}>
        {SKILL_OPTIONS.map((skillId) => {
          const optionKey = toSkillKey(skillId);
          const active = props.activeSkill === skillId;
          return <Button
            key={skillId}
            tone={active ? "secondary" : "ghost"}
            className={active ? "skill-launcher__button skill-launcher__button--active" : "skill-launcher__button"}
            aria-pressed={active}
            onClick={() => props.onSkillChange(skillId)}
          >
            {t(`panel.ai.skills.${optionKey}`)}
          </Button>;
        })}
      </div>
    </div>

    {reference ? <div className="panel-section">
      <div className="reference-card" role="note" aria-label={t("panel.ai.referenceSource")}>
        <div className="reference-card__content">
          <div className="panel-row">
            <span className="field-label">{t("panel.ai.referenceSource")}</span>
            <span className="panel-meta">{t("panel.ai.selectionLength", { count: reference.text.length })}</span>
          </div>
          <p className="reference-card__text">{truncateReference(reference.text)}</p>
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
      <div className="panel-row">
        <label className="field-label" htmlFor="ai-instruction">{t("panel.ai.instruction")}</label>
        <span className="panel-meta">{t(`panel.ai.instructionRequirement.${skillKey}`)}</span>
      </div>
      <Textarea
        id="ai-instruction"
        rows={4}
        value={props.instruction}
        placeholder={t(`panel.ai.instructionPlaceholder.${skillKey}`)}
        onChange={(event) => props.onInstructionChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
            return;
          }

          event.preventDefault();
          if (props.busy || props.generateDisabled) {
            return;
          }

          props.onGenerate();
        }}
      />
      <p className="panel-meta">{props.instructionHint}</p>
      <Button tone="primary" disabled={props.busy || props.generateDisabled} onClick={props.onGenerate}>
        {props.busy ? t("panel.ai.generating") : t("panel.ai.generate")}
      </Button>
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
            <h3 className="preview-heading">{previewSuggestionHeading}</h3>
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
