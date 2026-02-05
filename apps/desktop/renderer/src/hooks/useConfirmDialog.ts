import { useCallback, useEffect, useRef, useState } from "react";

import type { SystemDialogProps } from "../components/features/AiDialogs/types";

type ConfirmDialogOptions = Pick<
  SystemDialogProps,
  "title" | "description" | "primaryLabel" | "secondaryLabel"
>;

type ConfirmDialogState = ConfirmDialogOptions & {
  open: boolean;
};

export type UseConfirmDialogReturn = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  dialogProps: Pick<
    SystemDialogProps,
    | "open"
    | "onOpenChange"
    | "type"
    | "title"
    | "description"
    | "primaryLabel"
    | "secondaryLabel"
    | "onPrimaryAction"
    | "onSecondaryAction"
    | "simulateDelay"
  >;
};

/**
 * useConfirmDialog provides a single, promise-based confirmation flow.
 *
 * Why: destructive actions must avoid `window.confirm` while remaining fully
 * testable and deterministic in React (SystemDialog renders as a real surface).
 *
 * Concurrency strategy: when `confirm()` is called while a previous confirmation
 * is still open, the previous confirmation is canceled (resolved to `false`)
 * and replaced by the new one.
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<ConfirmDialogState>({ open: false });

  const resolvePending = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(confirmed);
  }, []);

  useEffect(() => {
    return () => {
      resolvePending(false);
    };
  }, [resolvePending]);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      resolvePending(false);

      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialog({ open: true, ...options });
      });
    },
    [resolvePending],
  );

  const handlePrimaryAction = useCallback(() => {
    resolvePending(true);
    setDialog((prev) => ({ ...prev, open: false }));
  }, [resolvePending]);

  const handleSecondaryAction = useCallback(() => {
    resolvePending(false);
    setDialog((prev) => ({ ...prev, open: false }));
  }, [resolvePending]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resolvePending(false);
      }
      setDialog((prev) => ({ ...prev, open }));
    },
    [resolvePending],
  );

  return {
    confirm,
    dialogProps: {
      open: dialog.open,
      onOpenChange: handleOpenChange,
      type: "delete",
      title: dialog.title,
      description: dialog.description,
      primaryLabel: dialog.primaryLabel,
      secondaryLabel: dialog.secondaryLabel,
      onPrimaryAction: handlePrimaryAction,
      onSecondaryAction: handleSecondaryAction,
      simulateDelay: 0,
    },
  };
}
