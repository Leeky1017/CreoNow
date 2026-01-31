import { randomUUID } from "node:crypto";
import { ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type IpcChannel,
  type IpcError,
  type IpcErrorCode,
  type IpcErr,
  type IpcInvokeResult,
  type IpcRequest,
  type IpcResponse,
} from "../../../../packages/shared/types/ipc-generated";

const CHANNEL_SET = new Set<string>(
  IPC_CHANNELS as unknown as readonly string[],
);

function nowTs(): number {
  return Date.now();
}

function ipcError(
  code: IpcErrorCode,
  message: string,
  details?: unknown,
): IpcError {
  return {
    code,
    message,
    details,
    retryable: code === "TIMEOUT",
  };
}

function err(code: IpcErrorCode, message: string, details?: unknown): IpcErr {
  return {
    ok: false,
    error: ipcError(code, message, details),
    meta: { requestId: randomUUID(), ts: nowTs() },
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isIpcResponse(x: unknown): x is IpcResponse<unknown> {
  if (!isRecord(x)) {
    return false;
  }
  if (typeof x.ok !== "boolean") {
    return false;
  }
  if (x.ok === true) {
    return "data" in x;
  }
  return (
    isRecord(x.error) &&
    typeof x.error.code === "string" &&
    typeof x.error.message === "string"
  );
}

export type CreonowInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export const creonowInvoke: CreonowInvoke = async <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
): Promise<IpcInvokeResult<C>> => {
  if (!CHANNEL_SET.has(channel)) {
    return err("INVALID_ARGUMENT", "Unknown IPC channel", { channel });
  }

  const res = await ipcRenderer.invoke(channel, payload);
  if (isIpcResponse(res)) {
    return res as IpcInvokeResult<C>;
  }

  return err("INTERNAL", "Invalid IPC response shape");
};
