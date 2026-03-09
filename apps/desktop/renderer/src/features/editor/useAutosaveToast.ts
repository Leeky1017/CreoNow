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
  const {
    autosaveStatus,
    documentId,
    showToast,
    retryLastAutosave,
  } = args;
  const prevStatusRef = React.useRef<AutosaveStatus>(args.autosaveStatus);
  const toastedDocRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = autosaveStatus;

    if (autosaveStatus === "error" && prev !== "error") {
      // Dedup: don't re-toast the same document
      if (documentId && documentId === toastedDocRef.current) {
        return;
      }
      toastedDocRef.current = documentId;
      showToast({
        title: t("workbench.autosave.toast.error.title"),
        description: t("workbench.autosave.toast.error.description"),
        variant: "error",
        action: {
          label: t("workbench.autosave.toast.error.retry"),
          onClick: () => {
            void retryLastAutosave();
          },
        },
      });
    }

    if (autosaveStatus === "saved" && prev === "saving") {
      // If we previously had a toast for this doc and it just recovered, notify
      if (toastedDocRef.current === documentId && documentId) {
        toastedDocRef.current = null;
        showToast({
          title: t("workbench.autosave.toast.retrySuccess.title"),
          variant: "success",
        });
      }
    }
  }, [autosaveStatus, documentId, showToast, retryLastAutosave, t]);

  // Reset dedup tracking when document changes
  React.useEffect(() => {
    toastedDocRef.current = null;
  }, [documentId]);
}

/**
 * Hook to handle flush-save failure toast (warning on document switch).
 */
export function useFlushErrorToast(args: {
  flushError: { documentId: string } | null;
  showToast: (toast: Omit<ToastState, "open">) => void;
}): void {
  const { t } = useTranslation();
  const { flushError, showToast } = args;

  React.useEffect(() => {
    if (flushError) {
      showToast({
        title: t("workbench.autosave.toast.flushError.title"),
        description: t("workbench.autosave.toast.flushError.description"),
        variant: "warning",
      });
    }
  }, [flushError, showToast, t]);
}
