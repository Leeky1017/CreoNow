import React from "react";
import { create } from "zustand";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../../packages/shared/types/ipc-generated";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

/**
 * Version list item from the backend.
 */
export type VersionListItem = {
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentHash: string;
  wordCount: number;
  createdAt: number;
};

/**
 * Full version content from version:snapshot:read.
 */
export type VersionContent = {
  documentId: string;
  projectId: string;
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  wordCount: number;
  createdAt: number;
};

export type VersionStoreState = {
  /** Current document ID for version list */
  documentId: string | null;
  /** List fetch status */
  listStatus: "idle" | "loading" | "ready" | "error";
  /** Version list items */
  items: VersionListItem[];
  /** Last error */
  lastError: IpcError | null;
  /** Compare mode state */
  compareVersionId: string | null;
  compareStatus: "idle" | "loading" | "ready" | "error";
  compareVersionContent: VersionContent | null;
  /** Preview mode status */
  previewStatus: "idle" | "loading" | "ready" | "error";
  /** Version ID currently in preview mode */
  previewVersionId: string | null;
  /** Timestamp text shown in preview banner */
  previewTimestamp: string | null;
  /** Historical content shown in preview mode */
  previewContentJson: string | null;
  /** Preview error details */
  previewError: IpcError | null;
};

export type VersionStoreActions = {
  /**
   * Fetch version list for a document.
   */
  fetchList: (documentId: string) => Promise<void>;
  /**
   * Read a specific version's content for comparison.
   */
  readVersion: (
    documentId: string,
    versionId: string,
  ) => Promise<VersionContent | null>;
  /**
   * Start compare mode with a specific version.
   */
  startCompare: (documentId: string, versionId: string) => Promise<void>;
  /**
   * Exit compare mode.
   */
  exitCompare: () => void;
  /**
   * Start read-only preview mode for a historical version.
   */
  startPreview: (
    documentId: string,
    args: { versionId: string; timestamp: string },
  ) => Promise<void>;
  /**
   * Exit read-only preview mode and return to current document.
   */
  exitPreview: () => void;
  /**
   * Restore a specific version.
   */
  restoreVersion: (
    documentId: string,
    versionId: string,
  ) => Promise<{ ok: boolean; error?: IpcError }>;
  /**
   * Clear all state.
   */
  reset: () => void;
};

export type VersionStore = VersionStoreState & VersionStoreActions;

export type UseVersionStore = ReturnType<typeof createVersionStore>;

const VersionStoreContext = React.createContext<UseVersionStore | null>(null);

const initialState: VersionStoreState = {
  documentId: null,
  listStatus: "idle",
  items: [],
  lastError: null,
  compareVersionId: null,
  compareStatus: "idle",
  compareVersionContent: null,
  previewStatus: "idle",
  previewVersionId: null,
  previewTimestamp: null,
  previewContentJson: null,
  previewError: null,
};

/**
 * Create a zustand store for version history state.
 *
 * Why: version list and compare state must be shared between Sidebar
 * (VersionHistoryPanel) and AppShell (DiffViewPanel).
 */
export function createVersionStore(deps: { invoke: IpcInvoke }) {
  return create<VersionStore>((set, get) => ({
    ...initialState,

    fetchList: async (documentId) => {
      set({ documentId, listStatus: "loading", lastError: null });

      const res = await deps.invoke("version:snapshot:list", { documentId });
      if (!res.ok) {
        set({ listStatus: "error", lastError: res.error });
        return;
      }

      set({
        listStatus: "ready",
        items: res.data.items,
      });
    },

    readVersion: async (documentId, versionId) => {
      const res = await deps.invoke("version:snapshot:read", {
        documentId,
        versionId,
      });
      if (!res.ok) {
        set({ lastError: res.error });
        return null;
      }
      return res.data;
    },

    startCompare: async (documentId, versionId) => {
      set({
        compareVersionId: versionId,
        compareStatus: "loading",
        compareVersionContent: null,
        lastError: null,
      });

      const res = await deps.invoke("version:snapshot:read", {
        documentId,
        versionId,
      });
      if (!res.ok) {
        set({ compareStatus: "error", lastError: res.error });
        return;
      }

      set({
        compareStatus: "ready",
        compareVersionContent: res.data,
      });
    },

    exitCompare: () => {
      set({
        compareVersionId: null,
        compareStatus: "idle",
        compareVersionContent: null,
      });
    },

    startPreview: async (documentId, args) => {
      set({
        previewStatus: "loading",
        previewVersionId: args.versionId,
        previewTimestamp: args.timestamp,
        previewContentJson: null,
        previewError: null,
      });

      const res = await deps.invoke("version:snapshot:read", {
        documentId,
        versionId: args.versionId,
      });
      if (!res.ok) {
        set({
          previewStatus: "error",
          previewContentJson: null,
          previewError: res.error,
        });
        return;
      }

      set({
        previewStatus: "ready",
        previewVersionId: res.data.versionId,
        previewContentJson: res.data.contentJson,
        previewError: null,
      });
    },

    exitPreview: () => {
      set({
        previewStatus: "idle",
        previewVersionId: null,
        previewTimestamp: null,
        previewContentJson: null,
        previewError: null,
      });
    },

    restoreVersion: async (documentId, versionId) => {
      const res = await deps.invoke("version:snapshot:rollback", {
        documentId,
        versionId,
      });
      if (!res.ok) {
        set({ lastError: res.error });
        return { ok: false, error: res.error };
      }

      // Refresh version list after restore
      await get().fetchList(documentId);
      return { ok: true };
    },

    reset: () => {
      set(initialState);
    },
  }));
}

/**
 * Provide a version store instance.
 */
export function VersionStoreProvider(props: {
  store: UseVersionStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <VersionStoreContext.Provider value={props.store}>
      {props.children}
    </VersionStoreContext.Provider>
  );
}

/**
 * Read values from the injected version store.
 */
export function useVersionStore<T>(selector: (state: VersionStore) => T): T {
  const store = React.useContext(VersionStoreContext);
  if (!store) {
    throw new Error("VersionStoreProvider is missing");
  }
  return store(selector);
}
