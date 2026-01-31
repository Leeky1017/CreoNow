import React from "react";
import { create } from "zustand";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../../packages/shared/types/ipc-generated";
import { assembleContext, type AssembledContext, type TrimEvidenceItem } from "../lib/ai/contextAssembler";
import { redactText, type RedactionEvidenceItem } from "../lib/redaction/redact";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export type ContextStatus = "idle" | "loading" | "ready" | "error";

export type ContextState = {
  viewerOpen: boolean;
  status: ContextStatus;
  assembled: AssembledContext | null;
  lastError: IpcError | null;
};

export type ContextActions = {
  toggleViewer: (args: {
    projectId: string | null;
    immediateInput: string;
  }) => Promise<void>;
  refresh: (args: {
    projectId: string | null;
    immediateInput: string;
  }) => Promise<AssembledContext>;
  clearError: () => void;
};

export type ContextStore = ContextState & ContextActions;

export type UseContextStore = ReturnType<typeof createContextStore>;

const ContextStoreContext = React.createContext<UseContextStore | null>(null);

const DEFAULT_MAX_INPUT_TOKENS = 4000;

/**
 * Create a zustand store for context engineering state.
 *
 * Why: the renderer needs deterministic context assembly + evidence for UI/E2E,
 * while `.creonow` IO remains in the main process behind typed IPC.
 */
export function createContextStore(deps: { invoke: IpcInvoke }) {
  /**
   * Load `.creonow/<scope>` file contents via IPC.
   *
   * Why: renderer cannot touch Node FS APIs; main must enforce path safety and
   * redact sensitive content before it reaches the UI or prompt injection.
   */
  async function loadCreonowScope(args: {
    projectId: string;
    scope: "rules" | "settings";
  }): Promise<{
    sources: Array<{ sourceRef: string; text: string }>;
    redactionEvidence: RedactionEvidenceItem[];
    readErrors: TrimEvidenceItem[];
  }> {
    const listChannel =
      args.scope === "rules"
        ? ("context:creonow:rules:list" as const)
        : ("context:creonow:settings:list" as const);

    const readChannel =
      args.scope === "rules"
        ? ("context:creonow:rules:read" as const)
        : ("context:creonow:settings:read" as const);

    const listRes = await deps.invoke(listChannel, { projectId: args.projectId });
    if (!listRes.ok) {
      return {
        sources: [],
        redactionEvidence: [],
        readErrors: [
          {
            layer: args.scope,
            sourceRef: `.creonow/${args.scope}`,
            action: "dropped",
            reason: "read_error",
            beforeChars: 0,
            afterChars: 0,
          },
        ],
      };
    }

    const sources: Array<{ sourceRef: string; text: string }> = [];
    const redactionEvidence: RedactionEvidenceItem[] = [];
    const readErrors: TrimEvidenceItem[] = [];

    for (const item of listRes.data.items) {
      const readRes = await deps.invoke(readChannel, {
        projectId: args.projectId,
        path: item.path,
      });

      if (!readRes.ok) {
        readErrors.push({
          layer: args.scope,
          sourceRef: item.path,
          action: "dropped",
          reason: "read_error",
          beforeChars: 0,
          afterChars: 0,
        });
        continue;
      }

      sources.push({ sourceRef: readRes.data.path, text: readRes.data.content });
      redactionEvidence.push(...readRes.data.redactionEvidence);
    }

    return { sources, redactionEvidence, readErrors };
  }

  return create<ContextStore>((set, get) => ({
    viewerOpen: false,
    status: "idle",
    assembled: null,
    lastError: null,

    clearError: () => set({ lastError: null }),

    toggleViewer: async ({ projectId, immediateInput }) => {
      const next = !get().viewerOpen;
      set({ viewerOpen: next });
      if (next) {
        await get().refresh({ projectId, immediateInput });
      }
    },

    refresh: async ({ projectId, immediateInput }) => {
      const state = get();
      if (state.status === "loading") {
        return state.assembled ?? assembleContext({
          rules: [],
          settings: [],
          retrieved: [],
          immediate: [],
          maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
          redactionEvidence: [],
        });
      }

      set({ status: "loading", lastError: null });

      const immediateRedacted = redactText({
        text: immediateInput,
        sourceRef: "immediate:ai_panel_input",
      });

      if (!projectId) {
        const assembled = assembleContext({
          rules: [],
          settings: [],
          retrieved: [],
          immediate: [
            {
              sourceRef: "immediate:ai_panel_input",
              text: immediateRedacted.redactedText,
            },
          ],
          maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
          redactionEvidence: immediateRedacted.evidence,
        });

        set({ status: "ready", assembled, lastError: null });
        return assembled;
      }

      const rules = await loadCreonowScope({ projectId, scope: "rules" });
      const settings = await loadCreonowScope({ projectId, scope: "settings" });

      const assembled = assembleContext({
        rules: rules.sources,
        settings: settings.sources,
        retrieved: [],
        immediate: [
          {
            sourceRef: "immediate:ai_panel_input",
            text: immediateRedacted.redactedText,
          },
        ],
        maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
        redactionEvidence: [
          ...rules.redactionEvidence,
          ...settings.redactionEvidence,
          ...immediateRedacted.evidence,
        ],
      });

      const mergedEvidence: TrimEvidenceItem[] = [
        ...rules.readErrors,
        ...settings.readErrors,
        ...assembled.trimEvidence,
      ];

      const merged = { ...assembled, trimEvidence: mergedEvidence };

      set({ status: "ready", assembled: merged, lastError: null });
      return merged;
    },
  }));
}

/**
 * Provide a context store instance for the Workbench UI.
 */
export function ContextStoreProvider(props: {
  store: UseContextStore;
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    ContextStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected context store.
 */
export function useContextStore<T>(selector: (state: ContextStore) => T): T {
  const store = React.useContext(ContextStoreContext);
  if (!store) {
    throw new Error("ContextStoreProvider is missing");
  }
  return store(selector);
}
