import type { LegacyCreonowBridge, PreloadApi } from "@/lib/preloadApi";

declare global {
  interface Window {
    api?: PreloadApi;
    creonow?: LegacyCreonowBridge;
    __CN_E2E_ENABLED__?: boolean;
  }
}

/**
 * @why React 18 @types/react lacks the `inert` HTML attribute (added in React 19 types).
 * We use `inert` for zen mode to keep panels mounted but non-interactive (F-01 R3).
 * Remove this augmentation after upgrading to @types/react >= 19.
 */
declare module "react" {
  interface HTMLAttributes<T> {
    inert?: boolean | undefined;
  }
}

export {};
