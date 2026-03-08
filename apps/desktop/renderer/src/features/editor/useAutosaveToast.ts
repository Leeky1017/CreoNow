import React from "react";
import { useTranslation } from "react-i18next";
import type { AutosaveStatus } from "../../stores/editorStore";
import type { ToastState } from "../../components/primitives/Toast";

/**
 * Hook that watches autosave status and triggers Toast notifications.
 *
 * Why: autosave failures must be visible to users so they can act on them.
 * Dedup logic prevents toast spam for repeated failures on the same document.
 */
export function useAutosaveToast(args: {
  autosaveStatus: AutosaveStatus;
  documentId: string | null;
  showToast: (toast: Omit<ToastState, "open">) => void;
  retryLastAutosave: () => Promise<void>;
}): void {
  const { t } = useTranslation();
  const prevStatusRef = React.useRef<AutosaveStatus>(args.autosaveStatus);
  const toastedDocRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = args.autosaveStatus;

    if (args.autosaveStatus === "error" && prev !== "error") {
      // Dedup: don't re-toast the same document
      if (args.documentId && args.documentId === toastedDocRef.current) {
        return;
      }
      toastedDocRef.current = args.documentId;
      args.showToast({
        title: t("workbench.autosave.toast.error.title"),
        description: t("workbench.autosave.toast.error.description"),
        variant: "error",
        action: {
          label: t("workbench.autosave.toast.error.retry"),
          onClick: () => {
            void args.retryLastAutosave();
          },
        },
      });
    }

    if (args.autosaveStatus === "saved" && prev === "saving") {
      // If we previously had a toast for this doc and it just recovered, notify
      if (toastedDocRef.current === args.documentId && args.documentId) {
        toastedDocRef.current = null;
        args.showToast({
          title: t("workbench.autosave.toast.retrySuccess.title"),
          variant: "success",
        });
      }
    }
  }, [args.autosaveStatus, args.documentId, args.showToast, args.retryLastAutosave, t]);

  // Reset dedup tracking when document changes
  React.useEffect(() => {
    toastedDocRef.current = null;
  }, [args.documentId]);
}

/**
 * Hook to handle flush-save failure toast (warning on document switch).
 */
export function useFlushErrorToast(args: {
  flushError: { documentId: string } | null;
  showToast: (toast: Omit<ToastState, "open">) => void;
}): void {
  const { t } = useTranslation();

  React.useEffect(() => {
    if (args.flushError) {
      args.showToast({
        title: t("workbench.autosave.toast.flushError.title"),
        description: t("workbench.autosave.toast.flushError.description"),
        variant: "warning",
      });
    }
  }, [args.flushError, args.showToast, t]);
}
