import React from "react";
import { create } from "zustand";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
  IpcResponseData,
} from "../../../../../packages/shared/types/ipc-generated";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export type SearchItem =
  IpcResponseData<"search:fulltext:query">["items"][number];

export type SearchStatus = "idle" | "loading" | "ready" | "error";

export type SearchState = {
  query: string;
  items: SearchItem[];
  status: SearchStatus;
  lastError: IpcError | null;
};

export type SearchActions = {
  setQuery: (query: string) => void;
  runFulltext: (args: { projectId: string; limit?: number }) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
};

export type SearchStore = SearchState & SearchActions;

export type UseSearchStore = ReturnType<typeof createSearchStore>;

const SearchStoreContext = React.createContext<UseSearchStore | null>(null);

/**
 * Create a zustand store for search state.
 *
 * Why: search results must be driven through typed IPC with a stable, testable
 * state machine and recoverable error handling.
 */
export function createSearchStore(deps: { invoke: IpcInvoke }) {
  return create<SearchStore>((set, get) => ({
    query: "",
    items: [],
    status: "idle",
    lastError: null,

    setQuery: (query) => set({ query }),

    clearResults: () => set({ items: [], status: "idle" }),

    clearError: () => set({ lastError: null }),

    runFulltext: async ({ projectId, limit }) => {
      const query = get().query;
      if (query.trim().length === 0) {
        set({ items: [], status: "idle", lastError: null });
        return;
      }

      set({ status: "loading", lastError: null });
      const res = await deps.invoke("search:fulltext:query", {
        projectId,
        query,
        limit,
      });
      if (!res.ok) {
        set({ status: "error", lastError: res.error, items: [] });
        return;
      }

      set({ status: "ready", items: res.data.items, lastError: null });
    },
  }));
}

/**
 * Provide a search store instance for the Workbench UI.
 */
export function SearchStoreProvider(props: {
  store: UseSearchStore;
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    SearchStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected search store.
 */
export function useSearchStore<T>(selector: (state: SearchStore) => T): T {
  const store = React.useContext(SearchStoreContext);
  if (!store) {
    throw new Error("SearchStoreProvider is missing");
  }
  return store(selector);
}
