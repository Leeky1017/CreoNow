import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

import "./ConfirmDialog.css";

export type ConfirmTone = "neutral" | "danger";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmTone;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * When provided, user must type this value into the unlock input for the
   * confirm button to enable. Implements INV-1 typed-confirmation for
   * destructive KG operations on critical nodes (Issue #195).
   *
   * Comparison is Unicode-normalized: both expected and typed values are
   * NFC-normalized and stripped of zero-width joiners / BOM before the
   * equality check. This prevents CJK NFC/NFD variants and zero-width
   * attack vectors from silently matching (or silently failing).
   */
  typedConfirmValue?: string;
  typedConfirmPrompt?: ReactNode;
  typedConfirmPlaceholder?: string;
  typedConfirmMismatch?: ReactNode;
  typedConfirmInputLabel?: string;
  className?: string;
}

/**
 * Normalize a typed-confirm candidate. Kept exported for unit tests so the
 * CJK NFC/NFD and zero-width behaviour stays pinned.
 *
 * - `.normalize("NFC")` collapses decomposed CJK characters (e.g. 林 + a
 *   combining mark) down to the canonical form that matches what users see
 *   in the dialog title.
 * - The regex strips U+200B .. U+200D (zero-width space / joiners) and
 *   U+FEFF (BOM) which would otherwise let attackers paste a visually
 *   identical name that fails the equality check.
 */
export function normalizeTypedConfirmValue(value: string): string {
  return value.normalize("NFC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  tone = "neutral",
  confirmDisabled,
  onConfirm,
  onCancel,
  typedConfirmValue,
  typedConfirmPrompt,
  typedConfirmPlaceholder,
  typedConfirmMismatch,
  typedConfirmInputLabel,
  className,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const inputId = useId();
  const descriptionId = useId();

  // Reset typed entry whenever the dialog re-opens; avoids a stale match
  // leaking across two destructive confirmations.
  useEffect(() => {
    if (!open) setTypedValue("");
  }, [open]);

  const typedConfirmed =
    typedConfirmValue == null
      ? true
      : normalizeTypedConfirmValue(typedValue) ===
        normalizeTypedConfirmValue(typedConfirmValue);
  const showMismatch =
    typedConfirmValue != null && typedValue.length > 0 && !typedConfirmed;
  const disabled = Boolean(confirmDisabled) || !typedConfirmed;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="cn-confirm-dialog__overlay" />
        <AlertDialog.Content
          className={cn("cn-confirm-dialog", className)}
          aria-describedby={description ? descriptionId : undefined}
          onEscapeKeyDown={(event) => {
            // Radix already closes on Escape; preventDefault is only here to
            // document intent — destructive dialogs must not close on Esc if
            // typed-confirm is half-filled. For now we keep default behaviour.
            void event;
          }}
        >
          <AlertDialog.Title className="cn-confirm-dialog__title">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description
              id={descriptionId}
              className="cn-confirm-dialog__description"
            >
              {description}
            </AlertDialog.Description>
          )}
          {children && <div className="cn-confirm-dialog__body">{children}</div>}
          {typedConfirmValue != null && (
            <div className="cn-confirm-dialog__typed">
              {typedConfirmPrompt && (
                <label
                  htmlFor={inputId}
                  className="cn-confirm-dialog__typed-label"
                >
                  {typedConfirmPrompt}
                </label>
              )}
              <input
                id={inputId}
                type="text"
                value={typedValue}
                onChange={(event) => setTypedValue(event.target.value)}
                placeholder={typedConfirmPlaceholder}
                className="cn-confirm-dialog__typed-input"
                autoComplete="off"
                spellCheck={false}
                aria-label={
                  typedConfirmInputLabel ??
                  (typeof typedConfirmPrompt === "string"
                    ? typedConfirmPrompt
                    : undefined)
                }
                aria-invalid={showMismatch || undefined}
              />
              {showMismatch && typedConfirmMismatch && (
                <p className="cn-confirm-dialog__typed-hint" role="alert">
                  {typedConfirmMismatch}
                </p>
              )}
            </div>
          )}
          <div className="cn-confirm-dialog__actions">
            <AlertDialog.Cancel asChild>
              <Button tone="ghost" onClick={onCancel}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                tone={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={disabled}
                aria-disabled={disabled}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
