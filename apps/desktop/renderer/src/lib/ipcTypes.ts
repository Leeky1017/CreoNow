import type {
  IpcChannel,
  IpcInvokeResult,
  IpcRequest,
} from "@shared/types/ipc-generated";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;
