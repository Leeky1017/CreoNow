import React from "react";

import type { IpcChannelSpec, IpcError } from "@shared/types/ipc-generated";
import { invoke } from "../lib/ipcClient";

type JudgeModelState = IpcChannelSpec["judge:model:ensure"]["response"]["state"];

type JudgeEnsureSuccess = {
  ok: true;
  state: JudgeModelState;
};

type JudgeEnsureFailure = {
  ok: false;
  error: IpcError;
};

export type JudgeEnsureResult = JudgeEnsureSuccess | JudgeEnsureFailure;

type UseJudgeEnsureResult = {
  busy: boolean;
  downloading: boolean;
  error: IpcError | null;
  ensure: () => Promise<JudgeEnsureResult | null>;
  clearError: () => void;
};

/**
 * Shared judge:model:ensure state machine for renderer callsites.
 */
export function useJudgeEnsure(): UseJudgeEnsureResult {
  const inFlightRef = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<IpcError | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const ensure = React.useCallback(async () => {
    if (inFlightRef.current) {
      return null;
    }

    inFlightRef.current = true;
    setBusy(true);
    setDownloading(true);
    setError(null);

    try {
      const res = await invoke("judge:model:ensure", {});
      if (res.ok) {
        return { ok: true, state: res.data.state } satisfies JudgeEnsureSuccess;
      }

      setError(res.error);
      return { ok: false, error: res.error } satisfies JudgeEnsureFailure;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
      setDownloading(false);
    }
  }, []);

  return {
    busy,
    downloading,
    error,
    ensure,
    clearError,
  };
}
