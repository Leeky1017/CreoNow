import { ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type IpcChannel,
  type IpcInvokeResult,
  type IpcRequest,
} from "@shared/types/ipc-generated";
import { createPreloadIpcGateway } from "./ipcGateway";

function resolveRendererId(): string {
  const maybeProcess = (globalThis as { process?: { pid?: number } }).process;
  if (typeof maybeProcess?.pid === "number") {
    return `pid-${maybeProcess.pid}`;
  }

  return "pid-unknown";
}

const gateway = createPreloadIpcGateway({
  allowedChannels: IPC_CHANNELS as unknown as readonly string[],
  rendererId: resolveRendererId(),
  invoke: async (channel, payload) =>
    await ipcRenderer.invoke(channel, payload),
});

export type CreonowInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export const creonowInvoke: CreonowInvoke = async <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
): Promise<IpcInvokeResult<C>> => {
  return (await gateway.invoke(channel, payload)) as IpcInvokeResult<C>;
};
