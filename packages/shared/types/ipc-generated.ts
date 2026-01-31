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
  "app:ping"
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
  "app:ping": {
    request: Record<string, never>;
    response: Record<string, never>;
  };
};

export type IpcRequest<C extends IpcChannel> = IpcChannelSpec[C]["request"];

export type IpcResponseData<C extends IpcChannel> = IpcChannelSpec[C]["response"];

export type IpcInvokeResult<C extends IpcChannel> = IpcResponse<IpcResponseData<C>>;
