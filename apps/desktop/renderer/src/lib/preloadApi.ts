import type { IpcChannel, IpcError, IpcInvokeResult, IpcRequest, IpcResponseData } from "@shared/types/ipc-generated";

export type InvokeHandler<C extends IpcChannel> = (payload: IpcRequest<C>) => Promise<IpcInvokeResult<C>>;
export type StreamSubscriptionResult = {
  ok: true;
  data: { subscriptionId: string };
} | {
  ok: false;
  error: IpcError;
};

export interface PreloadStreamApi {
  registerAiStreamConsumer: () => StreamSubscriptionResult;
  releaseAiStreamConsumer: (subscriptionId: string) => void;
  registerExportProgressConsumer: () => StreamSubscriptionResult;
  releaseExportProgressConsumer: (subscriptionId: string) => void;
}

export interface PreloadApi {
  project: {
    create: InvokeHandler<"project:project:create">;
    getCurrent: () => Promise<IpcInvokeResult<"project:project:getcurrent">>;
    list: InvokeHandler<"project:project:list">;
    setCurrent: InvokeHandler<"project:project:setcurrent">;
    switchProject: InvokeHandler<"project:project:switch">;
    stats: InvokeHandler<"project:project:stats">;
  };
  file: {
    createDocument: InvokeHandler<"file:document:create">;
    getCurrentDocument: InvokeHandler<"file:document:getcurrent">;
    listDocuments: InvokeHandler<"file:document:list">;
    readDocument: InvokeHandler<"file:document:read">;
    saveDocument: InvokeHandler<"file:document:save">;
    setCurrentDocument: InvokeHandler<"file:document:setcurrent">;
  };
  ai: {
    getConfig?: InvokeHandler<"ai:config:get">;
    testConfig?: InvokeHandler<"ai:config:test">;
    updateConfig?: InvokeHandler<"ai:config:update">;
    confirmSkill: InvokeHandler<"ai:skill:confirm">;
    cancelSkill: InvokeHandler<"ai:skill:cancel">;
    runSkill: InvokeHandler<"ai:skill:run">;
    submitSkillFeedback: InvokeHandler<"ai:skill:feedback">;
  };
  version: {
    listSnapshots: InvokeHandler<"version:snapshot:list">;
    readSnapshot: InvokeHandler<"version:snapshot:read">;
    rollbackSnapshot: InvokeHandler<"version:snapshot:rollback">;
    restoreSnapshot: InvokeHandler<"version:snapshot:restore">;
  };
  character: {
    create: InvokeHandler<"settings:character:create">;
    list: InvokeHandler<"settings:character:list">;
    read: InvokeHandler<"settings:character:read">;
    update: InvokeHandler<"settings:character:update">;
    delete: InvokeHandler<"settings:character:delete">;
  };
  location: {
    create: InvokeHandler<"settings:location:create">;
    list: InvokeHandler<"settings:location:list">;
    read: InvokeHandler<"settings:location:read">;
    update: InvokeHandler<"settings:location:update">;
    delete: InvokeHandler<"settings:location:delete">;
  };
  memory?: {
    list: InvokeHandler<"memory:simple:list">;
  };
  search: {
    query: InvokeHandler<"search:fts:query">;
  };
}

export interface LegacyCreonowBridge {
  api: PreloadApi;
  invoke: <C extends IpcChannel>(channel: C, payload: IpcRequest<C>) => Promise<IpcInvokeResult<C>>;
  stream: PreloadStreamApi;
}

export class RendererIpcError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(error: IpcError) {
    super(error.message);
    this.name = "RendererIpcError";
    this.code = error.code;
    this.details = error.details;
  }
}

export function getPreloadApi(): PreloadApi {
  const api = window.api ?? window.creonow?.api;
  if (!api) {
    throw new Error("Preload API is unavailable");
  }

  return api;
}

export function getPreloadStreamApi(): PreloadStreamApi {
  const stream = window.creonow?.stream;
  if (!stream) {
    throw new Error("Preload stream API is unavailable");
  }

  return stream;
}

export function unwrapIpcResult<C extends IpcChannel>(result: IpcInvokeResult<C>): IpcResponseData<C> {
  if (!result.ok) {
    throw new RendererIpcError(result.error);
  }

  return result.data;
}

export async function invokeThroughBridge<C extends IpcChannel>(channel: C, payload: IpcRequest<C>): Promise<IpcResponseData<C>> {
  const invoke = window.creonow?.invoke;
  if (!invoke) {
    throw new Error("Legacy invoke bridge is unavailable");
  }

  const result = await invoke(channel, payload);
  return unwrapIpcResult(result);
}
