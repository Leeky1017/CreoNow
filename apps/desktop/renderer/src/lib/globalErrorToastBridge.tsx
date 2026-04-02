import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAppToast } from "@/lib/appToast";
import {
  consumePendingGlobalErrorToasts,
  GLOBAL_ERROR_TOAST_EVENT,
  registerGlobalErrorToastConsumer,
  type GlobalErrorEntry,
} from "@/lib/globalErrorBridge";

export function GlobalErrorToastBridge() {
  const { t } = useTranslation();
  const { showToast } = useAppToast();

  useEffect(() => {
    const showGlobalErrorToast = (_entry: GlobalErrorEntry) => {
      showToast({
        title: t("globalError.toast.title"),
        description: t("globalError.toast.description"),
        variant: "error",
      });
    };

    const handleToastEvent = (event: Event) => {
      const detail = (event as CustomEvent<GlobalErrorEntry | undefined>).detail;
      if (detail === undefined) {
        return;
      }

      showGlobalErrorToast(detail);
    };

    window.addEventListener(GLOBAL_ERROR_TOAST_EVENT, handleToastEvent);
    const unregisterConsumer = registerGlobalErrorToastConsumer();
    consumePendingGlobalErrorToasts().forEach(showGlobalErrorToast);

    return () => {
      unregisterConsumer();
      window.removeEventListener(GLOBAL_ERROR_TOAST_EVENT, handleToastEvent);
    };
  }, [showToast, t]);

  return null;
}