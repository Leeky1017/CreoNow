/**
 * useExportProgress — renderer-side consumer for the export:progress push channel.
 *
 * Registers with the preload bridge so the bridge forwards export lifecycle
 * CustomEvents from Main → Renderer. Returns the latest ExportLifecycleEvent
 * (null when no export is in progress) and an `isExporting` flag.
 *
 * Main → (IPC push) → preload bridge → DOM CustomEvent → this hook.
 */

import { useEffect, useRef, useState } from "react";

import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportLifecycleEvent,
} from "@shared/types/export";

import { getPreloadStreamApi } from "./preloadApi";

export interface ExportProgressState {
  event: ExportLifecycleEvent | null;
  isExporting: boolean;
}

/**
 * Subscribe to export progress events pushed from Main via the preload bridge.
 *
 * Calls `registerExportProgressConsumer` on mount and
 * `releaseExportProgressConsumer` on unmount to keep the preload bridge
 * subscription reference-counted.
 */
export function useExportProgress(): ExportProgressState {
  const [state, setState] = useState<ExportProgressState>({ event: null, isExporting: false });
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const streamApi = getPreloadStreamApi();
    const result = streamApi.registerExportProgressConsumer();
    if (result.ok) {
      subscriptionIdRef.current = result.data.subscriptionId;
    }

    const handleProgress = (domEvent: Event) => {
      const exportEvent = (domEvent as CustomEvent<ExportLifecycleEvent>).detail;
      setState({
        event: exportEvent,
        isExporting:
          exportEvent.type === "export-started" ||
          exportEvent.type === "export-progress",
      });
    };

    window.addEventListener(EXPORT_PROGRESS_CHANNEL, handleProgress);

    return () => {
      window.removeEventListener(EXPORT_PROGRESS_CHANNEL, handleProgress);
      if (subscriptionIdRef.current !== null) {
        streamApi.releaseExportProgressConsumer(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, []);

  return state;
}
