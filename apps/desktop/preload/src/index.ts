import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";

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
contextBridge.exposeInMainWorld(
  "__CN_E2E_ENABLED__",
  process.env.CREONOW_E2E === "1",
);
