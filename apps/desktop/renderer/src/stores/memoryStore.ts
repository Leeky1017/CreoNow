import React from "react";
import { create } from "zustand";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
  IpcResponse,
  IpcResponseData,
} from "../../../../../packages/shared/types/ipc-generated";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export type MemoryItem = IpcResponseData<"memory:entry:list">["items"][number];
export type MemorySettings = IpcResponseData<"memory:settings:get">;
export type MemoryInjectionPreview =
  IpcResponseData<"memory:injection:preview">;

export type MemoryState = {
  projectId: string | null;
  documentId: string | null;
  items: MemoryItem[];
  settings: MemorySettings | null;
  preview: MemoryInjectionPreview | null;
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  lastError: IpcError | null;
};

export type MemoryActions = {
  bootstrapForContext: (
    projectId: string | null,
    documentId: string | null,
  ) => Promise<void>;
  /** @deprecated Use bootstrapForContext instead */
  bootstrapForProject: (projectId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  create: (args: {
    type: MemoryItem["type"];
    scope: MemoryItem["scope"];
    content: string;
    documentId?: string;
  }) => Promise<IpcResponse<IpcResponseData<"memory:entry:create">>>;
  remove: (args: {
    memoryId: string;
  }) => Promise<IpcResponse<IpcResponseData<"memory:entry:delete">>>;
  updateSettings: (args: {
    patch: Partial<MemorySettings>;
  }) => Promise<IpcResponse<MemorySettings>>;
  previewInjection: (args: { queryText?: string }) => Promise<void>;
  clearPreview: () => void;
  clearError: () => void;
};

export type MemoryStore = MemoryState & MemoryActions;

export type UseMemoryStore = ReturnType<typeof createMemoryStore>;

const MemoryStoreContext = React.createContext<UseMemoryStore | null>(null);

/**
 * Create a zustand store for memory CRUD/settings/preview.
 *
 * Why: memory is user-controlled state that must be testable through typed IPC
 * and must support deterministic injection preview behavior.
 */
export function createMemoryStore(deps: { invoke: IpcInvoke }) {
  async function loadSettings(): Promise<
    IpcInvokeResult<"memory:settings:get">
  > {
    return await deps.invoke("memory:settings:get", {});
  }

  async function loadMemories(
    projectId: string | null,
    documentId: string | null,
  ): Promise<IpcInvokeResult<"memory:entry:list">> {
    const payload: IpcRequest<"memory:entry:list"> = {};
    if (projectId) {
      payload.projectId = projectId;
    }
    if (documentId) {
      payload.documentId = documentId;
    }
    return await deps.invoke("memory:entry:list", payload);
  }

  return create<MemoryStore>((set, get) => ({
    projectId: null,
    documentId: null,
    items: [],
    settings: null,
    preview: null,
    bootstrapStatus: "idle",
    lastError: null,

    clearError: () => set({ lastError: null }),
    clearPreview: () => set({ preview: null }),

    bootstrapForContext: async (projectId, documentId) => {
      const state = get();
      if (
        state.bootstrapStatus === "loading" &&
        state.projectId === projectId &&
        state.documentId === documentId
      ) {
        return;
      }

      set({
        bootstrapStatus: "loading",
        lastError: null,
        projectId,
        documentId,
        preview: null,
      });

      const settingsRes = await loadSettings();
      if (!settingsRes.ok) {
        set({ bootstrapStatus: "error", lastError: settingsRes.error });
        return;
      }

      const listRes = await loadMemories(projectId, documentId);
      if (!listRes.ok) {
        set({
          bootstrapStatus: "error",
          lastError: listRes.error,
          settings: settingsRes.data,
        });
        return;
      }

      set({
        bootstrapStatus: "ready",
        lastError: null,
        projectId,
        documentId,
        settings: settingsRes.data,
        items: listRes.data.items,
      });
    },

    bootstrapForProject: async (projectId) => {
      // Backward compatible wrapper
      await get().bootstrapForContext(projectId, null);
    },

    refresh: async () => {
      const state = get();
      const listRes = await loadMemories(state.projectId, state.documentId);
      if (!listRes.ok) {
        set({ lastError: listRes.error });
        return;
      }

      set({ items: listRes.data.items, lastError: null });
    },

    create: async ({ type, scope, content, documentId }) => {
      const state = get();
      if (scope === "project" && !state.projectId) {
        const error = {
          code: "INVALID_ARGUMENT",
          message: "projectId is required for project scope",
        } as const;
        set({ lastError: error });
        return { ok: false, error };
      }
      if (scope === "document") {
        if (!state.projectId) {
          const error = {
            code: "INVALID_ARGUMENT",
            message: "projectId is required for document scope",
          } as const;
          set({ lastError: error });
          return { ok: false, error };
        }
        const effectiveDocumentId = documentId ?? state.documentId;
        if (!effectiveDocumentId) {
          const error = {
            code: "INVALID_ARGUMENT",
            message: "documentId is required for document scope",
          } as const;
          set({ lastError: error });
          return { ok: false, error };
        }
      }

      const base = { type, scope, content };
      let payload: IpcRequest<"memory:entry:create">;
      if (scope === "global") {
        payload = base;
      } else if (scope === "project") {
        payload = { ...base, projectId: state.projectId! };
      } else {
        // scope === "document"
        const effectiveDocumentId = documentId ?? state.documentId!;
        payload = {
          ...base,
          projectId: state.projectId!,
          documentId: effectiveDocumentId,
        };
      }

      const res = await deps.invoke("memory:entry:create", payload);
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    remove: async ({ memoryId }) => {
      const res = await deps.invoke("memory:entry:delete", { memoryId });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    updateSettings: async ({ patch }) => {
      const res = await deps.invoke("memory:settings:update", { patch });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      set({ settings: res.data, lastError: null });
      return res;
    },

    previewInjection: async ({ queryText }) => {
      const state = get();
      const payload: IpcRequest<"memory:injection:preview"> = {};
      if (state.projectId) {
        payload.projectId = state.projectId;
      }
      if (state.documentId) {
        payload.documentId = state.documentId;
      }
      if (queryText) {
        payload.queryText = queryText;
      }
      const res = await deps.invoke("memory:injection:preview", payload);
      if (!res.ok) {
        set({ lastError: res.error });
        return;
      }
      set({ preview: res.data, lastError: null });
    },
  }));
}

/**
 * Provide a memory store instance for the Workbench UI.
 */
export function MemoryStoreProvider(props: {
  store: UseMemoryStore;
  children: React.ReactNode;
}): JSX.Element {
  return React.createElement(
    MemoryStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected memory store.
 */
export function useMemoryStore<T>(selector: (state: MemoryStore) => T): T {
  const store = React.useContext(MemoryStoreContext);
  if (!store) {
    throw new Error("MemoryStoreProvider is missing");
  }
  return store(selector);
}
