import React from "react";
import type { AutosaveStatus } from "../../stores/editorStore";

function getSaveLabel(status: AutosaveStatus): string {
  if (status === "saving") {
    return "保存中...";
  }
  if (status === "saved") {
    return "已保存";
  }
  if (status === "error") {
    return "保存失败";
  }
  return "";
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
  const label = getSaveLabel(displayStatus);

  return (
    <span
      data-testid="editor-autosave-status"
      data-status={displayStatus}
      onClick={() => {
        if (isError) {
          props.onRetry();
        }
      }}
      className={
        isError
          ? "text-[var(--color-error)] cursor-pointer underline"
          : "text-[var(--color-fg-muted)] cursor-default"
      }
    >
      {label}
    </span>
  );
}
