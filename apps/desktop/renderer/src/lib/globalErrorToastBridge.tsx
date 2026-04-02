import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAppToast } from "@/lib/appToast";
import { GLOBAL_ERROR_TOAST_EVENT, type GlobalErrorEntry } from "@/lib/globalErrorBridge";

export function GlobalErrorToastBridge() {
  const { t } = useTranslation();
  const { showToast } = useAppToast();

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const detail = (event as CustomEvent<GlobalErrorEntry | undefined>).detail;
      if (detail === undefined) {
        return;
      }

      showToast({
        title: t("globalError.toast.title"),
        description: t("globalError.toast.description"),
        variant: "error",
      });
    };

    window.addEventListener(GLOBAL_ERROR_TOAST_EVENT, handleToastEvent);
    return () => {
      window.removeEventListener(GLOBAL_ERROR_TOAST_EVENT, handleToastEvent);
    };
  }, [showToast, t]);

  return null;
}
