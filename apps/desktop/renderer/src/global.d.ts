export {};

declare global {
  interface Window {
    creonow?: {
      invoke: (channel: string, payload: unknown) => Promise<unknown>;
    };
    __CN_E2E__?: {
      ready: boolean;
    };
  }
}
