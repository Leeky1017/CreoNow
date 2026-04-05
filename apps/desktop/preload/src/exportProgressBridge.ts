import { ipcRenderer } from "electron";

import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportProgressEvent,
} from "@shared/types/export";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExportProgressEvent(value: unknown): value is ExportProgressEvent {
  if (!isRecord(value)) {
    return false;
  }

  const stage = value.stage;
  return (
    typeof value.exportId === "string" &&
    (stage === "parsing" || stage === "converting" || stage === "writing") &&
    typeof value.progress === "number" &&
    typeof value.currentDocument === "string"
  );
}

export type ExportProgressBridgeApi = {
  dispose: () => void;
};

export function registerExportProgressBridge(): ExportProgressBridgeApi {
  const onExportProgress = (_event: unknown, payload: unknown) => {
    if (!isExportProgressEvent(payload)) {
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
    dispose: () => {
      ipcRenderer.removeListener(EXPORT_PROGRESS_CHANNEL, onExportProgress);
    },
  };
}
