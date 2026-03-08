import React from "react";
import { useTranslation } from "react-i18next";
import type { AutosaveStatus } from "../../stores/editorStore";
import "../../i18n";

/**
 * Spinning icon for "saving" state.
 */
function SavingSpinner(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="inline-block w-3 h-3 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28"
        strokeDashoffset="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Error icon for "error" state.
 */
function ErrorIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="inline-block w-3 h-3"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
      <line
        x1="8"
        y1="4"
        x2="8"
        y2="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * SaveIndicator renders autosave state with a 2-second "saved" confirmation.
 *
 * Why: status text rules are shared by StatusBar and must stay deterministic.
 */
export function SaveIndicator(props: {
  autosaveStatus: AutosaveStatus;
  onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [displayStatus, setDisplayStatus] = React.useState<AutosaveStatus>(
    props.autosaveStatus,
  );

  React.useEffect(() => {
    if (props.autosaveStatus === "saved") {
      setDisplayStatus("saved");
      const timer = window.setTimeout(() => {
        setDisplayStatus((current) => (current === "saved" ? "idle" : current));
      }, 2000);
      return () => window.clearTimeout(timer);
    }

    setDisplayStatus(props.autosaveStatus);
    return;
  }, [props.autosaveStatus]);

  const isError = displayStatus === "error";
  const isSaving = displayStatus === "saving";
  const isSaved = displayStatus === "saved";

  if (displayStatus === "idle") {
    return (
      <span
        data-testid="editor-autosave-status"
        role="status"
        aria-live="polite"
        data-status="idle"
      />
    );
  }

  if (isError) {
    return (
      <span
        data-testid="editor-autosave-status"
        role="status"
        aria-live="polite"
        data-status="error"
      >
        <span
          role="button"
          tabIndex={0}
          aria-label={t("workbench.autosave.a11y.retryLabel")}
          onClick={() => props.onRetry()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              props.onRetry();
            }
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[var(--color-error)] bg-[var(--color-error-subtle)] cursor-pointer"
        >
          <ErrorIcon />
          {t("workbench.autosave.status.error")}
        </span>
      </span>
    );
  }

  return (
    <span
      data-testid="editor-autosave-status"
      role="status"
      aria-live="polite"
      data-status={displayStatus}
      className={
        isSaved
          ? "text-[var(--color-success)]"
          : "text-[var(--color-fg-muted)]"
      }
    >
      {isSaving && (
        <span className="inline-flex items-center gap-1">
          <SavingSpinner />
          {t("workbench.autosave.status.saving")}
        </span>
      )}
      {isSaved && t("workbench.autosave.status.saved")}
    </span>
  );
}
