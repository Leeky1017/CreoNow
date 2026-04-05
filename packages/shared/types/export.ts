/**
 * Shared types for the export lifecycle push-notification channel.
 *
 * The `export:progress:update` channel is a Push Notification (Main → Renderer);
 * it is NOT part of the request-response IPC contract and MUST NOT be invoked
 * via `ipcRenderer.invoke`. The preload bridge forwards validated lifecycle
 * events to the renderer as DOM CustomEvents so the renderer can keep its
 * export-busy state closed over start → progress → completed/failed.
 */

export const EXPORT_PROGRESS_CHANNEL = "export:progress:update" as const;

export type ExportFormat = "markdown" | "docx" | "pdf" | "txt";

export type ExportStartedEvent = {
  type: "export-started";
  exportId: string;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
  timestamp: number;
};

export type ExportProgressEvent = {
  type: "export-progress";
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
};

export type ExportCompletedEvent = {
  type: "export-completed";
  exportId: string;
  success: true;
  projectId: string;
  format: ExportFormat;
  documentCount: number;
  timestamp: number;
};

export type ExportFailedEvent = {
  type: "export-failed";
  exportId: string;
  success: false;
  projectId: string;
  format: ExportFormat;
  currentDocument: string;
  error: {
    code: string;
    message: string;
  };
  timestamp: number;
};

export type ExportLifecycleEvent =
  | ExportStartedEvent
  | ExportProgressEvent
  | ExportCompletedEvent
  | ExportFailedEvent;
