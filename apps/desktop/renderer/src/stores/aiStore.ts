import React from "react";
import { create } from "zustand";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../../packages/shared/types/ipc-generated";
import type { AiStreamEvent } from "../../../../../packages/shared/types/ai";

export type AiStatus =
  | "idle"
  | "running"
  | "streaming"
  | "canceled"
  | "timeout"
  | "error";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export type AiState = {
  status: AiStatus;
  stream: boolean;
  input: string;
  outputText: string;
  activeRunId: string | null;
  lastError: IpcError | null;
};

export type AiActions = {
  setStream: (enabled: boolean) => void;
  setInput: (input: string) => void;
  clearError: () => void;
  run: () => Promise<void>;
  cancel: () => Promise<void>;
  onStreamEvent: (event: AiStreamEvent) => void;
};

export type AiStore = AiState & AiActions;

export type UseAiStore = ReturnType<typeof createAiStore>;

const AiStoreContext = React.createContext<UseAiStore | null>(null);

/**
 * Derive an AI status from an IPC error.
 *
 * Why: renderer must map stable error codes into a stable state machine.
 */
function statusFromError(error: IpcError): AiStatus {
  if (error.code === "TIMEOUT") {
    return "timeout";
  }
  if (error.code === "CANCELED") {
    return "canceled";
  }
  return "error";
}

/**
 * Create a zustand store for AI runtime state.
 *
 * Why: UI must support stream/cancel/timeout/upstream-error with deterministic
 * state transitions for Windows E2E.
 */
export function createAiStore(deps: { invoke: IpcInvoke }) {
  return create<AiStore>((set, get) => ({
    status: "idle",
    stream: true,
    input: "",
    outputText: "",
    activeRunId: null,
    lastError: null,

    setStream: (enabled) => set({ stream: enabled }),

    setInput: (input) => set({ input }),

    clearError: () => set({ lastError: null }),

    run: async () => {
      const state = get();
      if (state.status === "running" || state.status === "streaming") {
        return;
      }

      set({
        status: "running",
        outputText: "",
        lastError: null,
        activeRunId: null,
      });

      const res = await deps.invoke("ai:skill:run", {
        skillId: "builtin.e2e",
        input: state.input,
        stream: state.stream,
        context: {},
      });

      if (!res.ok) {
        set({
          status: statusFromError(res.error),
          lastError: res.error,
          activeRunId: null,
        });
        return;
      }

      if (typeof res.data.outputText === "string") {
        set({
          status: "idle",
          outputText: res.data.outputText,
          activeRunId: null,
        });
        return;
      }

      set({
        status: "running",
        activeRunId: res.data.runId,
      });
    },

    cancel: async () => {
      const state = get();
      if (
        (state.status !== "running" && state.status !== "streaming") ||
        !state.activeRunId
      ) {
        return;
      }

      const runId = state.activeRunId;
      set({ status: "canceled", activeRunId: null, lastError: null });

      const res = await deps.invoke("ai:skill:cancel", {
        runId,
      });
      if (!res.ok) {
        set({ status: statusFromError(res.error), lastError: res.error });
      }
    },

    onStreamEvent: (event) => {
      const state = get();
      if (!state.activeRunId || event.runId !== state.activeRunId) {
        return;
      }

      if (event.type === "run_started") {
        set({ status: "running" });
        return;
      }

      if (event.type === "delta") {
        set((prev) => ({
          status: "streaming",
          outputText: `${prev.outputText}${event.delta}`,
        }));
        return;
      }

      if (event.type === "run_completed") {
        set({ status: "idle", activeRunId: null });
        return;
      }

      if (event.type === "run_canceled") {
        set({ status: "canceled", activeRunId: null });
        return;
      }

      if (event.type === "run_failed") {
        set({
          status: statusFromError(event.error),
          lastError: event.error,
          activeRunId: null,
        });
      }
    },
  }));
}

/**
 * Provide an AI store instance for the Workbench UI.
 */
export function AiStoreProvider(props: {
  store: UseAiStore;
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    AiStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected AI store.
 */
export function useAiStore<T>(selector: (state: AiStore) => T): T {
  const store = React.useContext(AiStoreContext);
  if (!store) {
    throw new Error("AiStoreProvider is missing");
  }
  return store(selector);
}
