import * as Dialog from "@radix-ui/react-dialog";
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
   */
  typedConfirmValue?: string;
  typedConfirmPrompt?: ReactNode;
  typedConfirmPlaceholder?: string;
  typedConfirmMismatch?: ReactNode;
  className?: string;
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
  className,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const inputId = useId();

  // Reset typed entry whenever the dialog re-opens; avoids a stale match
  // leaking across two destructive confirmations.
  useEffect(() => {
    if (!open) setTypedValue("");
  }, [open]);

  const typedConfirmed =
    typedConfirmValue == null ? true : typedValue.trim() === typedConfirmValue.trim();
  const showMismatch =
    typedConfirmValue != null && typedValue.length > 0 && !typedConfirmed;
  const disabled = Boolean(confirmDisabled) || !typedConfirmed;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="cn-confirm-dialog__overlay" />
        <Dialog.Content
          className={cn("cn-confirm-dialog", className)}
          aria-describedby={undefined}
        >
          <Dialog.Title className="cn-confirm-dialog__title">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="cn-confirm-dialog__description">
              {description}
            </Dialog.Description>
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
              />
              {showMismatch && typedConfirmMismatch && (
                <p className="cn-confirm-dialog__typed-hint" role="alert">
                  {typedConfirmMismatch}
                </p>
              )}
            </div>
          )}
          <div className="cn-confirm-dialog__actions">
            <Button tone="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              tone={tone === "danger" ? "danger" : "primary"}
              onClick={onConfirm}
              disabled={disabled}
              aria-disabled={disabled}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
