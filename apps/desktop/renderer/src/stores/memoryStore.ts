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

export type MemoryItem = IpcResponseData<"memory:list">["items"][number];
export type MemorySettings = IpcResponseData<"memory:settings:get">;
export type MemoryInjectionPreview =
  IpcResponseData<"memory:injection:preview">;

export type MemoryState = {
  projectId: string | null;
  items: MemoryItem[];
  settings: MemorySettings | null;
  preview: MemoryInjectionPreview | null;
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  lastError: IpcError | null;
};

export type MemoryActions = {
  bootstrapForProject: (projectId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  create: (args: {
    type: MemoryItem["type"];
    scope: MemoryItem["scope"];
    content: string;
  }) => Promise<IpcResponse<IpcResponseData<"memory:create">>>;
  remove: (args: {
    memoryId: string;
  }) => Promise<IpcResponse<IpcResponseData<"memory:delete">>>;
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
  async function loadSettings(): Promise<IpcInvokeResult<"memory:settings:get">> {
    return await deps.invoke("memory:settings:get", {});
  }

  async function loadMemories(
    projectId: string | null,
  ): Promise<IpcInvokeResult<"memory:list">> {
    return await deps.invoke("memory:list", projectId ? { projectId } : {});
  }

  return create<MemoryStore>((set, get) => ({
    projectId: null,
    items: [],
    settings: null,
    preview: null,
    bootstrapStatus: "idle",
    lastError: null,

    clearError: () => set({ lastError: null }),
    clearPreview: () => set({ preview: null }),

    bootstrapForProject: async (projectId) => {
      const state = get();
      if (state.bootstrapStatus === "loading" && state.projectId === projectId) {
        return;
      }

      set({
        bootstrapStatus: "loading",
        lastError: null,
        projectId,
        preview: null,
      });

      const settingsRes = await loadSettings();
      if (!settingsRes.ok) {
        set({ bootstrapStatus: "error", lastError: settingsRes.error });
        return;
      }

      const listRes = await loadMemories(projectId);
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
        settings: settingsRes.data,
        items: listRes.data.items,
      });
    },

    refresh: async () => {
      const state = get();
      const listRes = await loadMemories(state.projectId);
      if (!listRes.ok) {
        set({ lastError: listRes.error });
        return;
      }

      set({ items: listRes.data.items, lastError: null });
    },

    create: async ({ type, scope, content }) => {
      const state = get();
      if (scope === "project" && !state.projectId) {
        const error = {
          code: "INVALID_ARGUMENT",
          message: "projectId is required for project scope",
        } as const;
        set({ lastError: error });
        return { ok: false, error };
      }

      const base = { type, scope, content };
      const payload =
        scope === "project" ? { ...base, projectId: state.projectId! } : base;
      const res = await deps.invoke("memory:create", payload);
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    remove: async ({ memoryId }) => {
      const res = await deps.invoke("memory:delete", { memoryId });
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
      const payload = state.projectId
        ? { projectId: state.projectId, queryText }
        : { queryText };
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
