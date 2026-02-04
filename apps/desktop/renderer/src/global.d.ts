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
    /** E2E mode flag set by preload (frozen, read-only) */
    __CN_E2E_ENABLED__?: boolean;
    /** E2E ready state managed by main.tsx (mutable) */
    __CN_E2E__?: {
      ready: boolean;
    };
  }
}
