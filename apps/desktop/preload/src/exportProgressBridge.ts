import { ipcRenderer } from "electron";

import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportCompletedEvent,
  type ExportFailedEvent,
  type ExportFormat,
  type ExportLifecycleEvent,
  type ExportProgressEvent,
  type ExportStartedEvent,
} from "@shared/types/export";
import type { IpcResponse } from "@shared/types/ipc-generated";

type ExportProgressBridgeApi = {
  registerExportProgressConsumer: () => IpcResponse<{ subscriptionId: string }>;
  releaseExportProgressConsumer: (subscriptionId: string) => void;
  dispose: () => void;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isExportFormat(x: unknown): x is ExportFormat {
  return x === "markdown" || x === "docx" || x === "pdf" || x === "txt";
}

function isExportStartedEvent(x: unknown): x is ExportStartedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-started" &&
    typeof x["exportId"] === "string" &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["currentDocument"] === "string" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportProgressEvent(x: unknown): x is ExportProgressEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-progress" &&
    typeof x["exportId"] === "string" &&
    (x["stage"] === "parsing" ||
      x["stage"] === "converting" ||
      x["stage"] === "writing") &&
    typeof x["progress"] === "number" &&
    typeof x["currentDocument"] === "string"
  );
}

function isExportCompletedEvent(x: unknown): x is ExportCompletedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-completed" &&
    typeof x["exportId"] === "string" &&
    x["success"] === true &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["documentCount"] === "number" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportFailedEvent(x: unknown): x is ExportFailedEvent {
  return (
    isRecord(x) &&
    x["type"] === "export-failed" &&
    typeof x["exportId"] === "string" &&
    x["success"] === false &&
    typeof x["projectId"] === "string" &&
    isExportFormat(x["format"]) &&
    typeof x["currentDocument"] === "string" &&
    isRecord(x["error"]) &&
    typeof x["error"]["code"] === "string" &&
    typeof x["error"]["message"] === "string" &&
    typeof x["timestamp"] === "number"
  );
}

function isExportLifecycleEvent(x: unknown): x is ExportLifecycleEvent {
  return (
    isExportStartedEvent(x) ||
    isExportProgressEvent(x) ||
    isExportCompletedEvent(x) ||
    isExportFailedEvent(x)
  );
}

function createSubscriptionId(): string {
  if (
    typeof globalThis.crypto === "object" &&
    typeof (globalThis.crypto as { randomUUID?: () => string }).randomUUID ===
      "function"
  ) {
    return (
      globalThis.crypto as { randomUUID: () => string }
    ).randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Register the export-progress push-notification bridge.
 *
 * Listens on the `export:progress:update` IPC channel (pushed by Main via
 * `webContents.send`) and re-dispatches validated payloads as DOM
 * `CustomEvent<ExportLifecycleEvent>` so Angular services can subscribe
 * without depending on Electron APIs directly.
 */
export function registerExportProgressBridge(): ExportProgressBridgeApi {
  const subscriptions = new Set<string>();

  const onExportProgress = (_event: unknown, payload: unknown): void => {
    if (subscriptions.size === 0 || !isExportLifecycleEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ExportLifecycleEvent>(EXPORT_PROGRESS_CHANNEL, {
        detail: payload,
      }),
    );
  };

  ipcRenderer.on(EXPORT_PROGRESS_CHANNEL, onExportProgress);

  return {
    registerExportProgressConsumer: () => {
      const subscriptionId = createSubscriptionId();
      subscriptions.add(subscriptionId);
      return { ok: true, data: { subscriptionId } };
    },
    releaseExportProgressConsumer: (subscriptionId: string) => {
      subscriptions.delete(subscriptionId);
    },
    dispose: () => {
      ipcRenderer.removeListener(EXPORT_PROGRESS_CHANNEL, onExportProgress);
      subscriptions.clear();
    },
  };
}
