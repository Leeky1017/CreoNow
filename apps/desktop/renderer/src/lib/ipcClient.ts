import type {
  IpcChannel,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../../packages/shared/types/ipc-generated";

export async function invoke<C extends IpcChannel>(
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

  return window.creonow.invoke(channel, payload);
}
