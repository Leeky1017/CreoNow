import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";

function isE2EEnabled(): boolean {
  if (typeof window.location?.href === "string") {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("creonow_e2e") === "1") {
        return true;
      }
    } catch {
      // Ignore URL parse errors and fallback to env probing.
    }
  }

  const maybeProcess = (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process;

  return maybeProcess?.env?.CREONOW_E2E === "1";
}

const aiStreamBridge = registerAiStreamBridge();

contextBridge.exposeInMainWorld("creonow", {
  invoke: creonowInvoke,
  stream: {
    registerAiStreamConsumer: aiStreamBridge.registerAiStreamConsumer,
    releaseAiStreamConsumer: aiStreamBridge.releaseAiStreamConsumer,
  },
});

/**
 * Expose E2E mode flag to renderer via separate property.
 *
 * Why: E2E tests need to skip onboarding and other flows.
 * We use a separate property because contextBridge objects are frozen
 * and main.tsx needs to manage __CN_E2E__.ready separately.
 */
contextBridge.exposeInMainWorld("__CN_E2E_ENABLED__", isE2EEnabled());
