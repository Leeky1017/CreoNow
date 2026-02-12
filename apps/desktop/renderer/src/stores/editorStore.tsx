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
export type DocumentStatus = IpcRequest<"file:document:updatestatus">["status"];

export type EditorState = {
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  projectId: string | null;
  documentId: string | null;
  documentStatus: DocumentStatus | null;
  documentContentJson: string | null;
  editor: Editor | null;
  lastSavedOrQueuedJson: string | null;
  documentCharacterCount: number;
  capacityWarning: string | null;
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
  flushPendingAutosave: () => Promise<void>;
  setAutosaveStatus: (status: AutosaveStatus) => void;
  setDocumentCharacterCount: (count: number) => void;
  setCapacityWarning: (warning: string | null) => void;
  clearAutosaveError: () => void;
  downgradeFinalStatusForEdit: (args: {
    projectId: string;
    documentId: string;
  }) => Promise<boolean>;
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
  type SaveRequest = {
    projectId: string;
    documentId: string;
    contentJson: string;
    actor: "user" | "auto";
    reason: "manual-save" | "autosave";
  };

  type SaveQueueEntry = {
    request: SaveRequest;
    resolve: () => void;
  };

  const saveQueue: SaveQueueEntry[] = [];
  let processingQueue = false;

  return create<EditorStore>((set, get) => ({
    bootstrapStatus: "idle",
    projectId: null,
    documentId: null,
    documentStatus: null,
    documentContentJson: null,
    editor: null,
    lastSavedOrQueuedJson: null,
    documentCharacterCount: 0,
    capacityWarning: null,
    autosaveStatus: "idle",
    autosaveError: null,
    compareMode: false,
    compareVersionId: null,

    setAutosaveStatus: (status) => set({ autosaveStatus: status }),
    setDocumentCharacterCount: (count) =>
      set({ documentCharacterCount: count }),
    setCapacityWarning: (warning) => set({ capacityWarning: warning }),
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
        set({
          bootstrapStatus: "ready",
          projectId,
          documentId: null,
          documentStatus: null,
        });
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
        documentStatus: readRes.data.status,
        documentContentJson: readRes.data.contentJson,
        lastSavedOrQueuedJson: readRes.data.contentJson,
        documentCharacterCount: 0,
        capacityWarning: null,
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
        documentStatus: readRes.data.status,
        documentContentJson: readRes.data.contentJson,
        lastSavedOrQueuedJson: readRes.data.contentJson,
        documentCharacterCount: 0,
        capacityWarning: null,
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
          documentStatus: null,
          documentContentJson: null,
          lastSavedOrQueuedJson: null,
          documentCharacterCount: 0,
          capacityWarning: null,
          autosaveStatus: "idle",
          autosaveError: null,
        });
        return;
      }

      set({ bootstrapStatus: "error" });
    },

    save: async ({ projectId, documentId, contentJson, actor, reason }) => {
      await new Promise<void>((resolve) => {
        const entry: SaveQueueEntry = {
          request: { projectId, documentId, contentJson, actor, reason },
          resolve,
        };

        if (reason === "manual-save") {
          const firstAutosaveIndex = saveQueue.findIndex(
            (queued) =>
              queued.request.projectId === projectId &&
              queued.request.documentId === documentId &&
              queued.request.reason === "autosave",
          );
          if (firstAutosaveIndex >= 0) {
            saveQueue.splice(firstAutosaveIndex, 0, entry);
          } else {
            saveQueue.push(entry);
          }
        } else {
          saveQueue.push(entry);
        }

        if (processingQueue) {
          return;
        }

        const processQueue = async () => {
          processingQueue = true;
          while (saveQueue.length > 0) {
            const current = saveQueue.shift();
            if (!current) {
              break;
            }

            const isCurrent =
              get().projectId === current.request.projectId &&
              get().documentId === current.request.documentId;
            if (isCurrent) {
              set({
                autosaveStatus: "saving",
                lastSavedOrQueuedJson: current.request.contentJson,
              });
            }

            try {
              const res = await deps.invoke("file:document:save", {
                projectId: current.request.projectId,
                documentId: current.request.documentId,
                contentJson: current.request.contentJson,
                actor: current.request.actor,
                reason: current.request.reason,
              });

              if (!res.ok) {
                const stillCurrent =
                  get().projectId === current.request.projectId &&
                  get().documentId === current.request.documentId;
                if (stillCurrent) {
                  set({ autosaveStatus: "error", autosaveError: res.error });
                }
                current.resolve();
                continue;
              }

              const stillCurrent =
                get().projectId === current.request.projectId &&
                get().documentId === current.request.documentId;
              if (stillCurrent) {
                set({
                  autosaveStatus: "saved",
                  autosaveError: null,
                });
              }
            } catch (error) {
              const stillCurrent =
                get().projectId === current.request.projectId &&
                get().documentId === current.request.documentId;
              if (stillCurrent) {
                set({
                  autosaveStatus: "error",
                  autosaveError: {
                    code: "INTERNAL_ERROR",
                    message:
                      error instanceof Error
                        ? error.message
                        : "file:document:save threw unexpectedly",
                  },
                });
              }
            }

            current.resolve();
          }
          processingQueue = false;
        };

        void processQueue();
      });
    },

    downgradeFinalStatusForEdit: async ({ projectId, documentId }) => {
      const res = await deps.invoke("file:document:updatestatus", {
        projectId,
        documentId,
        status: "draft",
      });
      if (!res.ok) {
        set({ autosaveStatus: "error", autosaveError: res.error });
        return false;
      }

      set({ documentStatus: "draft", autosaveError: null });
      return true;
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

    flushPendingAutosave: async () => {
      const state = get();
      if (
        !state.projectId ||
        !state.documentId ||
        !state.lastSavedOrQueuedJson ||
        state.lastSavedOrQueuedJson.length === 0
      ) {
        return;
      }

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
