export {};

import type {
  IpcChannel,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../packages/shared/types/ipc-generated";

declare global {
  interface Window {
    creonow?: {
      invoke: <C extends IpcChannel>(
        channel: C,
        payload: IpcRequest<C>,
      ) => Promise<IpcInvokeResult<C>>;
    };
    __CN_E2E__?: {
      ready: boolean;
    };
  }
}
