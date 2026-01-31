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
  "ai:skill:cancel",
  "ai:skill:feedback",
  "ai:skill:run",
  "app:ping",
  "constraints:get",
  "constraints:set",
  "context:creonow:ensure",
  "context:creonow:status",
  "db:debug:tableNames",
  "file:document:create",
  "file:document:delete",
  "file:document:getCurrent",
  "file:document:list",
  "file:document:read",
  "file:document:rename",
  "file:document:setCurrent",
  "file:document:write",
  "judge:model:ensure",
  "judge:model:getState",
  "project:create",
  "project:delete",
  "project:getCurrent",
  "project:list",
  "project:setCurrent",
  "version:aiApply:logConflict",
  "version:list",
  "version:restore",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
  "ai:skill:cancel": {
    request: {
      runId: string;
    };
    response: {
      canceled: true;
    };
  };
  "ai:skill:feedback": {
    request: {
      comment?: string;
      rating: "up" | "down";
      runId: string;
    };
    response: {
      recorded: true;
    };
  };
  "ai:skill:run": {
    request: {
      context?: {
        documentId?: string;
        projectId?: string;
      };
      input: string;
      skillId: string;
      stream: boolean;
    };
    response: {
      outputText?: string;
      runId: string;
    };
  };
  "app:ping": {
    request: Record<string, never>;
    response: Record<string, never>;
  };
  "constraints:get": {
    request: {
      projectId: string;
    };
    response: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
    };
  };
  "constraints:set": {
    request: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
      projectId: string;
    };
    response: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
    };
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
  "file:document:getCurrent": {
    request: {
      projectId: string;
    };
    response: {
      documentId: string;
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
  "file:document:rename": {
    request: {
      documentId: string;
      projectId: string;
      title: string;
    };
    response: {
      updated: true;
    };
  };
  "file:document:setCurrent": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:write": {
    request: {
      actor: "user" | "auto" | "ai";
      contentJson: string;
      documentId: string;
      projectId: string;
      reason: string;
    };
    response: {
      contentHash: string;
      updatedAt: number;
    };
  };
  "judge:model:ensure": {
    request: {
      timeoutMs?: number;
    };
    response: {
      state:
        | {
            status: "not_ready";
          }
        | {
            status: "downloading";
          }
        | {
            status: "ready";
          }
        | {
            error: {
              code:
                | "INVALID_ARGUMENT"
                | "NOT_FOUND"
                | "ALREADY_EXISTS"
                | "CONFLICT"
                | "PERMISSION_DENIED"
                | "UNSUPPORTED"
                | "IO_ERROR"
                | "DB_ERROR"
                | "MODEL_NOT_READY"
                | "ENCODING_FAILED"
                | "RATE_LIMITED"
                | "TIMEOUT"
                | "CANCELED"
                | "UPSTREAM_ERROR"
                | "INTERNAL";
              message: string;
            };
            status: "error";
          };
    };
  };
  "judge:model:getState": {
    request: Record<string, never>;
    response: {
      state:
        | {
            status: "not_ready";
          }
        | {
            status: "downloading";
          }
        | {
            status: "ready";
          }
        | {
            error: {
              code:
                | "INVALID_ARGUMENT"
                | "NOT_FOUND"
                | "ALREADY_EXISTS"
                | "CONFLICT"
                | "PERMISSION_DENIED"
                | "UNSUPPORTED"
                | "IO_ERROR"
                | "DB_ERROR"
                | "MODEL_NOT_READY"
                | "ENCODING_FAILED"
                | "RATE_LIMITED"
                | "TIMEOUT"
                | "CANCELED"
                | "UPSTREAM_ERROR"
                | "INTERNAL";
              message: string;
            };
            status: "error";
          };
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
  "version:aiApply:logConflict": {
    request: {
      documentId: string;
      runId: string;
    };
    response: {
      logged: true;
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
