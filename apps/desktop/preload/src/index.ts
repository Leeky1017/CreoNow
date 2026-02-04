import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";

registerAiStreamBridge();

contextBridge.exposeInMainWorld("creonow", {
  invoke: creonowInvoke,
});

/**
 * Expose E2E mode flag to renderer.
 *
 * Why: E2E tests need to skip onboarding and other flows.
 * The flag is set via CREONOW_E2E environment variable.
 */
const isE2E = process.env.CREONOW_E2E === "1";

contextBridge.exposeInMainWorld("__CN_E2E__", {
  enabled: isE2E,
  ready: false, // Will be set to true by main.tsx after React mounts
});
