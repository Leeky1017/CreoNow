/**
 * useExportProgress — renderer-side consumer for the export:progress push channel.
 *
 * Registers with the preload bridge so the bridge forwards export lifecycle
 * CustomEvents from Main → Renderer. Returns the latest ExportLifecycleEvent
 * (null when no export is in progress) and an `isExporting` flag.
 *
 * Main → (IPC push) → preload bridge → DOM CustomEvent → this hook.
 *
 * Concurrent-safety: tracks active exportIds in a Set so that a completed
 * export does not drop `isExporting` to false while another export is
 * still in flight.
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
  const activeExportIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const streamApi = getPreloadStreamApi();
    const result = streamApi.registerExportProgressConsumer();
    if (result.ok) {
      subscriptionIdRef.current = result.data.subscriptionId;
    }

    const handleProgress = (domEvent: Event) => {
      const exportEvent = (domEvent as CustomEvent<ExportLifecycleEvent>).detail;

      if (exportEvent.type === "export-started" || exportEvent.type === "export-progress") {
        activeExportIdsRef.current.add(exportEvent.exportId);
      } else if (
        exportEvent.type === "export-completed" ||
        exportEvent.type === "export-failed"
      ) {
        activeExportIdsRef.current.delete(exportEvent.exportId);
      }

      setState({
        event: exportEvent,
        isExporting: activeExportIdsRef.current.size > 0,
      });
    };

    window.addEventListener(EXPORT_PROGRESS_CHANNEL, handleProgress);

    return () => {
      window.removeEventListener(EXPORT_PROGRESS_CHANNEL, handleProgress);
      activeExportIdsRef.current.clear();
      if (subscriptionIdRef.current !== null) {
        streamApi.releaseExportProgressConsumer(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, []);

  return state;
}
