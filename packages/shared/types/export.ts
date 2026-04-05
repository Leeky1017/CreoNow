/**
 * Shared types for the export progress push-notification channel.
 *
 * The `export:progress:update` channel is a Push Notification (Main → Renderer);
 * it is NOT part of the request-response IPC contract and MUST NOT be invoked
 * via `ipcRenderer.invoke`.  The preload bridge forwards these events to the
 * renderer as DOM CustomEvents so that Angular services can subscribe without
 * importing Electron APIs directly.
 */

export const EXPORT_PROGRESS_CHANNEL = "export:progress:update" as const;

export type ExportProgressEvent = {
  type: "export-progress";
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
};
