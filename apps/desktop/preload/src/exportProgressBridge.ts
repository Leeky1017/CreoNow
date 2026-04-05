import { ipcRenderer } from "electron";

import { EXPORT_PROGRESS_CHANNEL, type ExportProgressEvent } from "@shared/types/export";
import type { IpcResponse } from "@shared/types/ipc-generated";

type ExportProgressBridgeApi = {
  registerExportProgressConsumer: () => IpcResponse<{ subscriptionId: string }>;
  releaseExportProgressConsumer: (subscriptionId: string) => void;
  dispose: () => void;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isExportProgressEvent(x: unknown): x is ExportProgressEvent {
  return (
    isRecord(x) &&
    x.type === "export-progress" &&
    typeof x.exportId === "string" &&
    (x.stage === "parsing" || x.stage === "converting" || x.stage === "writing") &&
    typeof x.progress === "number" &&
    typeof x.currentDocument === "string"
  );
}

function createSubscriptionId(): string {
  if (
    typeof globalThis.crypto === "object" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function registerExportProgressBridge(): ExportProgressBridgeApi {
  const subscriptions = new Set<string>();

  const onExportProgress = (_event: unknown, payload: unknown) => {
    if (subscriptions.size === 0 || !isExportProgressEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ExportProgressEvent>(EXPORT_PROGRESS_CHANNEL, {
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
