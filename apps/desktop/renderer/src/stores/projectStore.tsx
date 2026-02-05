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

export type ProjectInfo = IpcResponseData<"project:getCurrent">;
export type ProjectListItem = IpcResponseData<"project:list">["items"][number];

export type ProjectState = {
  current: ProjectInfo | null;
  items: ProjectListItem[];
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  lastError: IpcError | null;
};

export type ProjectRenameResult = IpcResponseData<"project:rename">;
export type ProjectDuplicateResult = IpcResponseData<"project:duplicate">;
export type ProjectArchiveResult = IpcResponseData<"project:archive">;

export type ProjectActions = {
  bootstrap: () => Promise<void>;
  createAndSetCurrent: (args: {
    name?: string;
  }) => Promise<IpcResponse<ProjectInfo>>;
  /**
   * Set an existing project as current.
   *
   * Why: Dashboard needs to open existing projects without creating new ones.
   */
  setCurrentProject: (projectId: string) => Promise<IpcResponse<ProjectInfo>>;
  /**
   * Delete a project permanently.
   *
   * Why: Dashboard must offer cleanup actions while remaining fully typed and observable.
   */
  deleteProject: (projectId: string) => Promise<IpcResponse<{ deleted: true }>>;
  /**
   * Rename a project.
   *
   * Why: Dashboard needs to support renaming projects without recreating them.
   */
  renameProject: (
    projectId: string,
    name: string,
  ) => Promise<IpcResponse<ProjectRenameResult>>;
  /**
   * Duplicate a project.
   *
   * Why: Dashboard needs to support duplicating projects including documents and KG.
   */
  duplicateProject: (
    projectId: string,
    name?: string,
  ) => Promise<IpcResponse<ProjectDuplicateResult>>;
  /**
   * Archive or unarchive a project.
   *
   * Why: Dashboard needs to support archiving projects to hide them from default list.
   */
  archiveProject: (
    projectId: string,
    archived: boolean,
  ) => Promise<IpcResponse<ProjectArchiveResult>>;
  clearError: () => void;
};

export type ProjectStore = ProjectState & ProjectActions;

export type UseProjectStore = ReturnType<typeof createProjectStore>;

const ProjectStoreContext = React.createContext<UseProjectStore | null>(null);

/**
 * Create a zustand store for project lifecycle state.
 *
 * Why: the renderer must be able to drive a minimal project entry flow and keep
 * current project state in sync with IPC (typed invoke) for stable E2E.
 */
export function createProjectStore(deps: { invoke: IpcInvoke }) {
  return create<ProjectStore>((set, get) => ({
    current: null,
    items: [],
    bootstrapStatus: "idle",
    lastError: null,

    clearError: () => set({ lastError: null }),

    bootstrap: async () => {
      const state = get();
      if (state.bootstrapStatus === "loading") {
        return;
      }

      set({ bootstrapStatus: "loading", lastError: null });

      const currentRes = await deps.invoke("project:getCurrent", {});
      const current = currentRes.ok
        ? currentRes.data
        : currentRes.error.code === "NOT_FOUND"
          ? null
          : null;
      if (!currentRes.ok && currentRes.error.code !== "NOT_FOUND") {
        set({ bootstrapStatus: "error", lastError: currentRes.error });
        return;
      }

      const listRes = await deps.invoke("project:list", {
        includeDeleted: false,
      });
      if (!listRes.ok) {
        set({ bootstrapStatus: "error", lastError: listRes.error, current });
        return;
      }

      set({
        bootstrapStatus: "ready",
        current,
        items: listRes.data.items,
        lastError: null,
      });
    },

    createAndSetCurrent: async ({ name }) => {
      const created = await deps.invoke("project:create", { name });
      if (!created.ok) {
        set({ lastError: created.error });
        return created;
      }

      const setRes = await deps.invoke("project:setCurrent", {
        projectId: created.data.projectId,
      });
      if (!setRes.ok) {
        set({ lastError: setRes.error });
        return setRes;
      }

      set({ current: setRes.data, lastError: null });
      void get().bootstrap();
      return setRes;
    },

    setCurrentProject: async (projectId) => {
      const setRes = await deps.invoke("project:setCurrent", { projectId });
      if (!setRes.ok) {
        set({ lastError: setRes.error });
        return setRes;
      }

      set({ current: setRes.data, lastError: null });
      return setRes;
    },

    deleteProject: async (projectId) => {
      const res = await deps.invoke("project:delete", { projectId });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      set((prev) => ({
        ...prev,
        current: prev.current?.projectId === projectId ? null : prev.current,
        lastError: null,
      }));
      void get().bootstrap();
      return res;
    },

    renameProject: async (projectId, name) => {
      const res = await deps.invoke("project:rename", { projectId, name });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      set((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.projectId === projectId
            ? { ...item, name: res.data.name, updatedAt: res.data.updatedAt }
            : item,
        ),
        lastError: null,
      }));
      return res;
    },

    duplicateProject: async (projectId, name) => {
      const res = await deps.invoke("project:duplicate", { projectId, name });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      set({ lastError: null });
      void get().bootstrap();
      return res;
    },

    archiveProject: async (projectId, archived) => {
      const res = await deps.invoke("project:archive", { projectId, archived });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      set((prev) => ({
        ...prev,
        items: prev.items.filter((item) =>
          archived ? item.projectId !== projectId : true,
        ),
        current:
          archived && prev.current?.projectId === projectId
            ? null
            : prev.current,
        lastError: null,
      }));
      return res;
    },
  }));
}

/**
 * Provide a project store instance for the Workbench UI.
 */
export function ProjectStoreProvider(props: {
  store: UseProjectStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <ProjectStoreContext.Provider value={props.store}>
      {props.children}
    </ProjectStoreContext.Provider>
  );
}

/**
 * Read values from the injected project store.
 */
export function useProjectStore<T>(selector: (state: ProjectStore) => T): T {
  const store = React.useContext(ProjectStoreContext);
  if (!store) {
    throw new Error("ProjectStoreProvider is missing");
  }
  return store(selector);
}
