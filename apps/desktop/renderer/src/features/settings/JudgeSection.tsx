import React from "react";

import type { IpcChannelSpec } from "../../../../../../packages/shared/types/ipc-generated";
import { invoke } from "../../lib/ipcClient";

type JudgeModelState =
  IpcChannelSpec["judge:model:getState"]["response"]["state"];

/**
 * Render judge state into a stable, human-readable label.
 */
function formatState(state: JudgeModelState): string {
  if (state.status === "error") {
    return `error (${state.error.code})`;
  }
  return state.status;
}

/**
 * JudgeSection is the Settings surface for model readiness.
 *
 * Why: P0 requires a stable, E2E-testable status + ensure entry without silent failure.
 */
export function JudgeSection(): JSX.Element {
  const [state, setState] = React.useState<JudgeModelState | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [ensureBusy, setEnsureBusy] = React.useState(false);

  React.useEffect(() => {
    let canceled = false;
    void (async () => {
      const res = await invoke("judge:model:getState", {});
      if (canceled) {
        return;
      }
      if (res.ok) {
        setState(res.data.state);
        setErrorText(null);
        return;
      }
      setErrorText(`${res.error.code}: ${res.error.message}`);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  async function ensure(): Promise<void> {
    if (ensureBusy) {
      return;
    }
    setEnsureBusy(true);
    setErrorText(null);
    setState({ status: "downloading" });

    try {
      const res = await invoke("judge:model:ensure", {});
      if (res.ok) {
        setState(res.data.state);
        return;
      }
      setErrorText(`${res.error.code}: ${res.error.message}`);
      setState({
        status: "error",
        error: { code: res.error.code, message: res.error.message },
      });
    } finally {
      setEnsureBusy(false);
    }
  }

  return (
    <section
      data-testid="settings-judge-section"
      style={{
        padding: 12,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-raised)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        Judge model
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--color-fg-muted)",
          marginBottom: 10,
        }}
      >
        Status:{" "}
        <span
          data-testid="judge-status"
          style={{ color: "var(--color-fg-default)" }}
        >
          {state ? formatState(state) : "loading"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          data-testid="judge-ensure"
          type="button"
          onClick={() => void ensure()}
          disabled={ensureBusy}
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-selected)",
            color: "var(--color-fg-default)",
            cursor: ensureBusy ? "not-allowed" : "pointer",
            fontSize: 13,
            opacity: ensureBusy ? 0.7 : 1,
          }}
        >
          Ensure
        </button>

        {errorText ? (
          <div
            data-testid="judge-error"
            style={{ fontSize: 12, color: "var(--color-fg-muted)" }}
          >
            {errorText}
          </div>
        ) : null}
      </div>
    </section>
  );
}
