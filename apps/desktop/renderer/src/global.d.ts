import type { LegacyCreonowBridge, PreloadApi } from "@/lib/preloadApi";

declare global {
  interface Window {
    api?: PreloadApi;
    creonow?: LegacyCreonowBridge;
    __CN_E2E_ENABLED__?: boolean;
  }
}

export {};