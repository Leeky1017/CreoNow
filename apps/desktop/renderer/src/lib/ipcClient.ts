import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
} from "@shared/types/ipc-generated";

function toInvokeError(message: string, details?: unknown): IpcError {
  return {
    code: "INTERNAL",
    message,
    details,
  };
}

function toThrowableMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isEnvelope(value: unknown): value is IpcInvokeResult<IpcChannel> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

export async function safeInvoke<C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
): Promise<IpcInvokeResult<C>> {
  if (!window.creonow) {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "IPC bridge not available",
      },
    };
  }

  try {
    const response = await window.creonow.invoke(channel, payload);
    if (!isEnvelope(response)) {
      return {
        ok: false,
        error: toInvokeError("Invalid IPC response shape"),
      };
    }
    return response as IpcInvokeResult<C>;
  } catch (error) {
    return {
      ok: false,
      error: toInvokeError("IPC invoke failed", {
        message: toThrowableMessage(error),
      }),
    };
  }
}

export const invoke = safeInvoke;
