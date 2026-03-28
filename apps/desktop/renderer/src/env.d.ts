/// <reference types="vite/client" />

interface CreonowBridge {
  invoke: (channel: string, payload?: unknown) => Promise<unknown>;
  stream: {
    registerAiStreamConsumer: (consumerId: string, handler: (data: unknown) => void) => void;
    releaseAiStreamConsumer: (consumerId: string) => void;
  };
}

declare global {
  interface Window {
    creonow: CreonowBridge;
    __CN_E2E_ENABLED__: boolean;
  }
}

export {};
