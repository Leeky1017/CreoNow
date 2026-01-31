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

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type EditorState = {
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  projectId: string | null;
  documentId: string | null;
  documentContentJson: string | null;
  lastSavedOrQueuedJson: string | null;
  autosaveStatus: AutosaveStatus;
  autosaveError: IpcError | null;
};

export type EditorActions = {
  bootstrapForProject: (projectId: string) => Promise<void>;
  save: (args: {
    projectId: string;
    documentId: string;
    contentJson: string;
    actor: "user" | "auto";
    reason: "manual-save" | "autosave";
  }) => Promise<void>;
  retryLastAutosave: () => Promise<void>;
  setAutosaveStatus: (status: AutosaveStatus) => void;
  clearAutosaveError: () => void;
};

export type EditorStore = EditorState & EditorActions;

export type UseEditorStore = ReturnType<typeof createEditorStore>;

const EditorStoreContext = React.createContext<UseEditorStore | null>(null);

/**
 * Create a zustand store for editor/document state.
 *
 * Why: editor state and autosave status must be shared between the editor pane
 * and StatusBar, and must be driven through typed IPC.
 */
export function createEditorStore(deps: { invoke: IpcInvoke }) {
  return create<EditorStore>((set, get) => ({
    bootstrapStatus: "idle",
    projectId: null,
    documentId: null,
    documentContentJson: null,
    lastSavedOrQueuedJson: null,
    autosaveStatus: "idle",
    autosaveError: null,

    setAutosaveStatus: (status) => set({ autosaveStatus: status }),
    clearAutosaveError: () => set({ autosaveError: null }),

    bootstrapForProject: async (projectId) => {
      set({ bootstrapStatus: "loading" });

      const listRes = await deps.invoke("file:document:list", { projectId });
      if (!listRes.ok) {
        set({ bootstrapStatus: "error" });
        return;
      }

      let documentId = listRes.data.items[0]?.documentId ?? null;
      if (!documentId) {
        const created = await deps.invoke("file:document:create", {
          projectId,
        });
        if (!created.ok) {
          set({ bootstrapStatus: "error" });
          return;
        }
        documentId = created.data.documentId;
      }

      const readRes = await deps.invoke("file:document:read", {
        projectId,
        documentId,
      });
      if (!readRes.ok) {
        set({ bootstrapStatus: "error" });
        return;
      }

      set({
        bootstrapStatus: "ready",
        projectId,
        documentId,
        documentContentJson: readRes.data.contentJson,
      });
    },

    save: async ({ projectId, documentId, contentJson, actor, reason }) => {
      set({ autosaveStatus: "saving", lastSavedOrQueuedJson: contentJson });

      const res = await deps.invoke("file:document:write", {
        projectId,
        documentId,
        contentJson,
        actor,
        reason,
      });
      if (!res.ok) {
        set({ autosaveStatus: "error", autosaveError: res.error });
        return;
      }

      set({
        autosaveStatus: "saved",
        autosaveError: null,
      });
    },

    retryLastAutosave: async () => {
      const state = get();
      if (
        !state.projectId ||
        !state.documentId ||
        !state.lastSavedOrQueuedJson ||
        state.lastSavedOrQueuedJson.length === 0
      ) {
        return;
      }

      set({ autosaveError: null });
      await state.save({
        projectId: state.projectId,
        documentId: state.documentId,
        contentJson: state.lastSavedOrQueuedJson,
        actor: "auto",
        reason: "autosave",
      });
    },
  }));
}

/**
 * Provide an editor store instance for the Workbench UI.
 */
export function EditorStoreProvider(props: {
  store: UseEditorStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <EditorStoreContext.Provider value={props.store}>
      {props.children}
    </EditorStoreContext.Provider>
  );
}

/**
 * Read values from the injected editor store.
 */
export function useEditorStore<T>(selector: (state: EditorStore) => T): T {
  const store = React.useContext(EditorStoreContext);
  if (!store) {
    throw new Error("EditorStoreProvider is missing");
  }
  return store(selector);
}
