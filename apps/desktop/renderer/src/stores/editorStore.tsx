import React from "react";
import { create } from "zustand";
import type { Editor } from "@tiptap/react";

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
  editor: Editor | null;
  lastSavedOrQueuedJson: string | null;
  autosaveStatus: AutosaveStatus;
  autosaveError: IpcError | null;
  /** Whether compare mode is active (showing DiffView instead of Editor) */
  compareMode: boolean;
  /** The version ID being compared against current */
  compareVersionId: string | null;
};

export type EditorActions = {
  bootstrapForProject: (projectId: string) => Promise<void>;
  openCurrentDocumentForProject: (projectId: string) => Promise<void>;
  openDocument: (args: {
    projectId: string;
    documentId: string;
  }) => Promise<void>;
  setEditorInstance: (editor: Editor | null) => void;
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
  /** Enable or disable compare mode with a specific version */
  setCompareMode: (enabled: boolean, versionId?: string | null) => void;
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
    editor: null,
    lastSavedOrQueuedJson: null,
    autosaveStatus: "idle",
    autosaveError: null,
    compareMode: false,
    compareVersionId: null,

    setAutosaveStatus: (status) => set({ autosaveStatus: status }),
    clearAutosaveError: () => set({ autosaveError: null }),
    setEditorInstance: (editor) => set({ editor }),
    setCompareMode: (enabled, versionId) =>
      set({
        compareMode: enabled,
        compareVersionId: enabled ? (versionId ?? null) : null,
      }),

    bootstrapForProject: async (projectId) => {
      set({ bootstrapStatus: "loading" });

      let documentId: string | null = null;

      const currentRes = await deps.invoke("file:document:getcurrent", {
        projectId,
      });
      if (currentRes.ok) {
        documentId = currentRes.data.documentId;
      } else if (currentRes.error.code === "NOT_FOUND") {
        const listRes = await deps.invoke("file:document:list", { projectId });
        if (!listRes.ok) {
          set({ bootstrapStatus: "error" });
          return;
        }

        documentId = listRes.data.items[0]?.documentId ?? null;
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

        const setRes = await deps.invoke("file:document:setcurrent", {
          projectId,
          documentId,
        });
        if (!setRes.ok) {
          set({ bootstrapStatus: "error" });
          return;
        }
      } else {
        set({ bootstrapStatus: "error" });
        return;
      }

      if (!documentId) {
        set({ bootstrapStatus: "ready", projectId, documentId: null });
        return;
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
        lastSavedOrQueuedJson: readRes.data.contentJson,
        autosaveStatus: "idle",
        autosaveError: null,
      });
    },

    openDocument: async ({ projectId, documentId }) => {
      set({
        bootstrapStatus: "loading",
        projectId,
        autosaveError: null,
      });

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
        lastSavedOrQueuedJson: readRes.data.contentJson,
        autosaveStatus: "idle",
        autosaveError: null,
      });
    },

    openCurrentDocumentForProject: async (projectId) => {
      set({ bootstrapStatus: "loading", projectId, autosaveError: null });

      const currentRes = await deps.invoke("file:document:getcurrent", {
        projectId,
      });
      if (currentRes.ok) {
        await get().openDocument({
          projectId,
          documentId: currentRes.data.documentId,
        });
        return;
      }

      if (currentRes.error.code === "NOT_FOUND") {
        set({
          bootstrapStatus: "ready",
          projectId,
          documentId: null,
          documentContentJson: null,
          lastSavedOrQueuedJson: null,
          autosaveStatus: "idle",
          autosaveError: null,
        });
        return;
      }

      set({ bootstrapStatus: "error" });
    },

    save: async ({ projectId, documentId, contentJson, actor, reason }) => {
      const isCurrent =
        get().projectId === projectId && get().documentId === documentId;
      if (isCurrent) {
        set({ autosaveStatus: "saving", lastSavedOrQueuedJson: contentJson });
      }

      const res = await deps.invoke("file:document:write", {
        projectId,
        documentId,
        contentJson,
        actor,
        reason,
      });
      if (!res.ok) {
        const stillCurrent =
          get().projectId === projectId && get().documentId === documentId;
        if (stillCurrent) {
          set({ autosaveStatus: "error", autosaveError: res.error });
        }
        return;
      }

      const stillCurrent =
        get().projectId === projectId && get().documentId === documentId;
      if (stillCurrent) {
        set({
          autosaveStatus: "saved",
          autosaveError: null,
        });
      }
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
