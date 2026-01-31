/* eslint-disable */
/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: apps/desktop/main/src/ipc/contract/ipc-contract.ts
 * Run: pnpm contract:generate
 */

export type IpcErrorCode =
  | "ALREADY_EXISTS"
  | "CANCELED"
  | "CONFLICT"
  | "DB_ERROR"
  | "ENCODING_FAILED"
  | "INTERNAL"
  | "INVALID_ARGUMENT"
  | "IO_ERROR"
  | "MODEL_NOT_READY"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNSUPPORTED"
  | "UPSTREAM_ERROR";

export type IpcMeta = {
  requestId: string;
  ts: number;
};

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type IpcOk<TData> = {
  ok: true;
  data: TData;
  meta?: IpcMeta;
};

export type IpcErr = {
  ok: false;
  error: IpcError;
  meta?: IpcMeta;
};

export type IpcResponse<TData> = IpcOk<TData> | IpcErr;

export const IPC_CHANNELS = [
  "app:ping",
  "context:creonow:ensure",
  "context:creonow:status",
  "db:debug:tableNames",
  "file:document:create",
  "file:document:delete",
  "file:document:list",
  "file:document:read",
  "file:document:write",
  "project:create",
  "project:delete",
  "project:getCurrent",
  "project:list",
  "project:setCurrent",
  "version:list",
  "version:restore",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
  "app:ping": {
    request: Record<string, never>;
    response: Record<string, never>;
  };
  "context:creonow:ensure": {
    request: {
      projectId: string;
    };
    response: {
      ensured: true;
      rootPath: string;
    };
  };
  "context:creonow:status": {
    request: {
      projectId: string;
    };
    response: {
      exists: boolean;
      rootPath?: string;
      watching: boolean;
    };
  };
  "db:debug:tableNames": {
    request: Record<string, never>;
    response: {
      tableNames: Array<string>;
    };
  };
  "file:document:create": {
    request: {
      projectId: string;
      title?: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:delete": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      deleted: true;
    };
  };
  "file:document:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        documentId: string;
        title: string;
        updatedAt: number;
      }>;
    };
  };
  "file:document:read": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      contentHash: string;
      contentJson: string;
      contentMd: string;
      contentText: string;
      documentId: string;
      projectId: string;
      title: string;
      updatedAt: number;
    };
  };
  "file:document:write": {
    request: {
      actor: "user" | "auto";
      contentJson: string;
      documentId: string;
      projectId: string;
      reason: "manual-save" | "autosave";
    };
    response: {
      contentHash: string;
      updatedAt: number;
    };
  };
  "project:create": {
    request: {
      name?: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:delete": {
    request: {
      projectId: string;
    };
    response: {
      deleted: true;
    };
  };
  "project:getCurrent": {
    request: Record<string, never>;
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:list": {
    request: {
      includeDeleted?: boolean;
    };
    response: {
      items: Array<{
        name: string;
        projectId: string;
        rootPath: string;
        updatedAt: number;
      }>;
    };
  };
  "project:setCurrent": {
    request: {
      projectId: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "version:list": {
    request: {
      documentId: string;
    };
    response: {
      items: Array<{
        actor: "user" | "auto" | "ai";
        contentHash: string;
        createdAt: number;
        reason: string;
        versionId: string;
      }>;
    };
  };
  "version:restore": {
    request: {
      documentId: string;
      versionId: string;
    };
    response: {
      restored: true;
    };
  };
};

export type IpcRequest<C extends IpcChannel> = IpcChannelSpec[C]["request"];

export type IpcResponseData<C extends IpcChannel> =
  IpcChannelSpec[C]["response"];

export type IpcInvokeResult<C extends IpcChannel> = IpcResponse<
  IpcResponseData<C>
>;
