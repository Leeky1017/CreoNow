import React from "react";

import type { IpcChannelSpec } from "@shared/types/ipc-generated";
import { invoke } from "../../lib/ipcClient";
import { Button, Heading, Text } from "../../components/primitives";

type JudgeModelState =
  IpcChannelSpec["judge:model:getstate"]["response"]["state"];

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
      const res = await invoke("judge:model:getstate", {});
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
      className="p-3 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-raised)]"
    >
      <Heading level="h4" className="mb-1.5 font-bold">
        Judge model
      </Heading>
      <Text size="small" color="muted" as="div" className="mb-2.5">
        Status:{" "}
        <Text data-testid="judge-status" size="small" color="default" as="span">
          {state ? formatState(state) : "loading"}
        </Text>
      </Text>

      <div className="flex items-center gap-2">
        <Button
          data-testid="judge-ensure"
          variant="secondary"
          size="sm"
          onClick={() => void ensure()}
          disabled={ensureBusy}
          loading={ensureBusy}
          className="bg-[var(--color-bg-selected)]"
        >
          Ensure
        </Button>

        {errorText ? (
          <Text data-testid="judge-error" size="small" color="muted">
            {errorText}
          </Text>
        ) : null}
      </div>
    </section>
  );
}
