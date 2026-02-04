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
      /** Whether E2E mode is enabled (set by preload from CREONOW_E2E env) */
      enabled?: boolean;
      /** Whether the React app has mounted (set by main.tsx) */
      ready: boolean;
    };
  }
}
