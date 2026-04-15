import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageSquareText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import type { SelectionViewportAnchor } from "@/editor/bridge";

interface EditorSelectionToolbarProps {
  anchor: SelectionViewportAnchor | null;
  busy: boolean;
  selectionKey: string | null;
  onChangeTone: () => void;
  onFixGrammar: () => void;
  onPolish: () => void;
  onSubmitInstruction: (instruction: string) => void;
  visible: boolean;
  defaultPromptOpen?: boolean;
}

export function EditorSelectionToolbar(props: EditorSelectionToolbarProps) {
  const { t } = useTranslation();
  const [customInstruction, setCustomInstruction] = useState("");
  const [promptOpen, setPromptOpen] = useState(props.defaultPromptOpen ?? false);

  useEffect(() => {
    setPromptOpen(props.defaultPromptOpen ?? false);
  }, [props.defaultPromptOpen]);

  useEffect(() => {
    if (props.visible === false || props.selectionKey === null) {
      setPromptOpen(false);
      setCustomInstruction("");
      return;
    }

    setPromptOpen(props.defaultPromptOpen ?? false);
    setCustomInstruction("");
  }, [
    props.defaultPromptOpen,
    props.selectionKey,
    props.visible,
  ]);

  if (props.visible === false || props.anchor === null) {
    return null;
  }

  const preferBelowAnchor = props.anchor.top < 96;
  const style = {
    left: `${props.anchor.left}px`,
    top: `${preferBelowAnchor ? props.anchor.bottom + 12 : props.anchor.top}px`,
    transform: preferBelowAnchor
      ? "translateX(-50%)"
      : "translate(-50%, calc(-100% - var(--space-3)))",
  };

  return (
    <div
      className="editor-selection-toolbar"
      data-testid="editor-selection-toolbar"
      onMouseDownCapture={(event) => event.preventDefault()}
      style={style}
    >
      {promptOpen
        ? <form
            className="editor-selection-toolbar__prompt-row"
            onSubmit={(event) => {
              event.preventDefault();
              const nextInstruction = customInstruction.trim();
              if (nextInstruction.length === 0 || props.busy) {
                return;
              }

              props.onSubmitInstruction(nextInstruction);
            }}
          >
            <div className="editor-selection-toolbar__prompt-input-shell">
              <Bot className="editor-selection-toolbar__prompt-icon" size={14} />
              <Input
                autoFocus
                className="editor-selection-toolbar__prompt-input"
                data-testid="editor-selection-toolbar-prompt-input"
                disabled={props.busy}
                onChange={(event) => setCustomInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setPromptOpen(false);
                    setCustomInstruction("");
                  }
                }}
                placeholder={t("editorToolbar.promptPlaceholder")}
                value={customInstruction}
              />
              <Button
                aria-label={t("editorToolbar.submit")}
                className="editor-selection-toolbar__prompt-submit"
                data-testid="editor-selection-toolbar-prompt-submit"
                disabled={props.busy || customInstruction.trim().length === 0}
                tone="ghost"
                type="submit"
              >
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        : <>
            <div className="editor-selection-toolbar__row editor-selection-toolbar__row--primary">
              <Button
                className="editor-selection-toolbar__primary-action"
                disabled={props.busy}
                onClick={() => setPromptOpen(true)}
                tone="ghost"
              >
                <Bot size={14} />
                <span>{t("editorToolbar.askAiEdit")}</span>
              </Button>
              <Button
                className="editor-selection-toolbar__secondary-action"
                data-testid="editor-selection-toolbar-comment"
                disabled
                tone="ghost"
              >
                <MessageSquareText size={14} />
                <span>{t("editorToolbar.comment")}</span>
              </Button>
            </div>

            <div className="editor-selection-toolbar__quick-actions">
              <span className="editor-selection-toolbar__label">
                {t("editorToolbar.quickActions")}
              </span>
              <div className="editor-selection-toolbar__actions">
                <Button
                  className="editor-selection-toolbar__action"
                  data-testid="editor-selection-toolbar-polish"
                  disabled={props.busy}
                  onClick={props.onPolish}
                  tone="ghost"
                >
                  <Sparkles size={14} />
                  <span>{t("editorToolbar.polish")}</span>
                </Button>
                <Button
                  className="editor-selection-toolbar__action"
                  data-testid="editor-selection-toolbar-grammar"
                  disabled={props.busy}
                  onClick={props.onFixGrammar}
                  tone="ghost"
                >
                  <CheckCircle2 size={14} />
                  <span>{t("editorToolbar.fixGrammar")}</span>
                </Button>
                <Button
                  className="editor-selection-toolbar__action"
                  data-testid="editor-selection-toolbar-tone"
                  disabled={props.busy}
                  onClick={props.onChangeTone}
                  tone="ghost"
                >
                  <Wand2 size={14} />
                  <span>{t("editorToolbar.changeTone")}</span>
                </Button>
              </div>
            </div>
          </>}
    </div>
  );
}
