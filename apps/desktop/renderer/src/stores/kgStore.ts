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

export type KgEntity = IpcResponseData<"kg:graph:get">["entities"][number];
export type KgRelation = IpcResponseData<"kg:graph:get">["relations"][number];

export type KgState = {
  projectId: string | null;
  entities: KgEntity[];
  relations: KgRelation[];
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  lastError: IpcError | null;
};

export type KgActions = {
  bootstrapForProject: (projectId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  entityCreate: (args: {
    name: string;
    entityType?: string;
    description?: string;
  }) => Promise<IpcResponse<IpcResponseData<"kg:entity:create">>>;
  entityUpdate: (args: {
    entityId: string;
    patch: Partial<
      Pick<KgEntity, "name" | "entityType" | "description" | "metadataJson">
    >;
  }) => Promise<IpcResponse<IpcResponseData<"kg:entity:update">>>;
  entityDelete: (args: {
    entityId: string;
  }) => Promise<IpcResponse<{ deleted: true }>>;
  relationCreate: (args: {
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
  }) => Promise<IpcResponse<IpcResponseData<"kg:relation:create">>>;
  relationUpdate: (args: {
    relationId: string;
    patch: Partial<
      Pick<
        KgRelation,
        | "fromEntityId"
        | "toEntityId"
        | "relationType"
        | "metadataJson"
        | "evidenceJson"
      >
    >;
  }) => Promise<IpcResponse<IpcResponseData<"kg:relation:update">>>;
  relationDelete: (args: {
    relationId: string;
  }) => Promise<IpcResponse<{ deleted: true }>>;
  clearError: () => void;
};

export type KgStore = KgState & KgActions;

export type UseKgStore = ReturnType<typeof createKgStore>;

const KgStoreContext = React.createContext<UseKgStore | null>(null);

/**
 * Create a zustand store for Knowledge Graph CRUD (project-scoped).
 *
 * Why: KG must be driven through typed IPC while keeping the renderer state
 * machine deterministic for Windows E2E assertions.
 */
export function createKgStore(deps: { invoke: IpcInvoke }) {
  async function loadGraph(
    projectId: string,
  ): Promise<IpcInvokeResult<"kg:graph:get">> {
    return await deps.invoke("kg:graph:get", { projectId });
  }

  function missingProjectError(): IpcError {
    return { code: "INVALID_ARGUMENT", message: "projectId is required" };
  }

  return create<KgStore>((set, get) => ({
    projectId: null,
    entities: [],
    relations: [],
    bootstrapStatus: "idle",
    lastError: null,

    clearError: () => set({ lastError: null }),

    bootstrapForProject: async (projectId) => {
      const state = get();
      if (
        state.bootstrapStatus === "loading" &&
        state.projectId === projectId
      ) {
        return;
      }

      if (!projectId) {
        set({
          projectId: null,
          entities: [],
          relations: [],
          bootstrapStatus: "idle",
          lastError: null,
        });
        return;
      }

      set({
        projectId,
        entities: [],
        relations: [],
        bootstrapStatus: "loading",
        lastError: null,
      });

      const res = await loadGraph(projectId);
      if (!res.ok) {
        set({ bootstrapStatus: "error", lastError: res.error });
        return;
      }

      set({
        bootstrapStatus: "ready",
        entities: res.data.entities,
        relations: res.data.relations,
        lastError: null,
      });
    },

    refresh: async () => {
      const state = get();
      if (!state.projectId) {
        return;
      }

      const res = await loadGraph(state.projectId);
      if (!res.ok) {
        set({ lastError: res.error });
        return;
      }

      set({
        entities: res.data.entities,
        relations: res.data.relations,
        lastError: null,
      });
    },

    entityCreate: async ({ name, entityType, description }) => {
      const state = get();
      if (!state.projectId) {
        const error = missingProjectError();
        set({ lastError: error });
        return { ok: false, error };
      }

      const res = await deps.invoke("kg:entity:create", {
        projectId: state.projectId,
        name,
        entityType,
        description,
      });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    entityUpdate: async ({ entityId, patch }) => {
      const res = await deps.invoke("kg:entity:update", { entityId, patch });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    entityDelete: async ({ entityId }) => {
      const res = await deps.invoke("kg:entity:delete", { entityId });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    relationCreate: async ({ fromEntityId, toEntityId, relationType }) => {
      const state = get();
      if (!state.projectId) {
        const error = missingProjectError();
        set({ lastError: error });
        return { ok: false, error };
      }

      const res = await deps.invoke("kg:relation:create", {
        projectId: state.projectId,
        fromEntityId,
        toEntityId,
        relationType,
      });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    relationUpdate: async ({ relationId, patch }) => {
      const res = await deps.invoke("kg:relation:update", {
        relationId,
        patch,
      });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },

    relationDelete: async ({ relationId }) => {
      const res = await deps.invoke("kg:relation:delete", { relationId });
      if (!res.ok) {
        set({ lastError: res.error });
        return res;
      }

      void get().refresh();
      return res;
    },
  }));
}

/**
 * Provide a KG store instance for the Workbench UI.
 */
export function KgStoreProvider(props: {
  store: UseKgStore;
  children: React.ReactNode;
}): JSX.Element {
  return React.createElement(
    KgStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected KG store.
 */
export function useKgStore<T>(selector: (state: KgStore) => T): T {
  const store = React.useContext(KgStoreContext);
  if (!store) {
    throw new Error("KgStoreProvider is missing");
  }
  return store(selector);
}
