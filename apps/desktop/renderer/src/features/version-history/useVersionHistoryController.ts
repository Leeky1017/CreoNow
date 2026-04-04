import { useCallback, useEffect, useRef, useState } from "react";

import type { PreloadApi } from "@/lib/preloadApi";

import type {
  VersionHistoryAction,
  VersionHistoryDocumentRef,
  VersionHistorySnapshotDetail,
  VersionHistorySnapshotSummary,
  VersionHistoryStatus,
} from "./types";

type VersionApi = PreloadApi["version"];

interface UseVersionHistoryControllerArgs {
  activeDocument: VersionHistoryDocumentRef | null;
  api: VersionApi;
  enabled: boolean;
}

interface RefreshOptions {
  preferredVersionId?: string | null;
}

interface LoadSnapshotOptions {
  keepSelection?: boolean;
}

function readErrorMessage(error: { message: string }): string {
  return error.message;
}

export function useVersionHistoryController(args: UseVersionHistoryControllerArgs) {
  const [action, setAction] = useState<VersionHistoryAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<VersionHistorySnapshotSummary[]>([]);
  const [previewStatus, setPreviewStatus] = useState<VersionHistoryStatus>("idle");
  const [selectedSnapshot, setSelectedSnapshot] = useState<VersionHistorySnapshotDetail | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [status, setStatus] = useState<VersionHistoryStatus>("idle");
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const reset = useCallback(() => {
    setAction(null);
    setErrorMessage(null);
    setItems([]);
    setPreviewStatus("idle");
    setSelectedSnapshot(null);
    setSelectedVersionId(null);
    setStatus("idle");
  }, []);

  const loadSnapshot = useCallback(async (
    versionId: string,
    options?: LoadSnapshotOptions,
  ): Promise<VersionHistorySnapshotDetail | null> => {
    if (args.activeDocument === null) {
      return null;
    }

    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    if (options?.keepSelection !== true) {
      setSelectedVersionId(versionId);
    }
    setPreviewStatus("loading");
    setErrorMessage(null);

    const result = await args.api.readSnapshot({
      documentId: args.activeDocument.documentId,
      projectId: args.activeDocument.projectId,
      versionId,
    });
    if (detailRequestIdRef.current !== requestId) {
      return null;
    }

    if (result.ok === false) {
      setPreviewStatus("error");
      setSelectedSnapshot(null);
      setErrorMessage(readErrorMessage(result.error));
      return null;
    }

    setPreviewStatus("ready");
    setSelectedSnapshot(result.data);
    return result.data;
  }, [args.activeDocument, args.api]);

  const refresh = useCallback(async (options?: RefreshOptions): Promise<VersionHistorySnapshotSummary[] | null> => {
    if (args.activeDocument === null) {
      reset();
      return null;
    }

    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    setStatus("loading");
    setErrorMessage(null);

    const result = await args.api.listSnapshots({
      documentId: args.activeDocument.documentId,
      projectId: args.activeDocument.projectId,
    });
    if (listRequestIdRef.current !== requestId) {
      return null;
    }

    if (result.ok === false) {
      setStatus("error");
      setItems([]);
      setPreviewStatus("idle");
      setSelectedSnapshot(null);
      setSelectedVersionId(null);
      setErrorMessage(readErrorMessage(result.error));
      return null;
    }

    setItems(result.data.items);
    setStatus("ready");

    if (result.data.items.length === 0) {
      setPreviewStatus("idle");
      setSelectedSnapshot(null);
      setSelectedVersionId(null);
      return result.data.items;
    }

    const preferredVersionId = options?.preferredVersionId;
    const initialVersionId = preferredVersionId !== undefined && preferredVersionId !== null
      && result.data.items.some((item) => item.versionId === preferredVersionId)
      ? preferredVersionId
      : result.data.items[0].versionId;
    setSelectedVersionId(initialVersionId);
    await loadSnapshot(initialVersionId, { keepSelection: true });
    return result.data.items;
  }, [args.activeDocument, args.api, loadSnapshot, reset]);

  const rollbackSelected = useCallback(async () => {
    if (args.activeDocument === null || selectedVersionId === null) {
      return null;
    }

    setAction("rollback");
    setErrorMessage(null);
    const result = await args.api.rollbackSnapshot({
      documentId: args.activeDocument.documentId,
      projectId: args.activeDocument.projectId,
      versionId: selectedVersionId,
    });
    setAction(null);

    if (result.ok === false) {
      setErrorMessage(readErrorMessage(result.error));
      return null;
    }

    return result.data;
  }, [args.activeDocument, args.api, selectedVersionId]);

  const restoreSelected = useCallback(async () => {
    if (args.activeDocument === null || selectedVersionId === null) {
      return null;
    }

    setAction("restore");
    setErrorMessage(null);
    const result = await args.api.restoreSnapshot({
      documentId: args.activeDocument.documentId,
      projectId: args.activeDocument.projectId,
      versionId: selectedVersionId,
    });
    setAction(null);

    if (result.ok === false) {
      setErrorMessage(readErrorMessage(result.error));
      return null;
    }

    return result.data;
  }, [args.activeDocument, args.api, selectedVersionId]);

  useEffect(() => {
    if (args.enabled === false) {
      return;
    }

    void refresh();
  }, [args.enabled, args.activeDocument?.documentId, args.activeDocument?.projectId, refresh]);

  return {
    action,
    errorMessage,
    items,
    previewStatus,
    refresh,
    reset,
    rollbackSelected,
    selectedSnapshot,
    selectedVersionId,
    selectVersion: loadSnapshot,
    status,
    restoreSelected,
  };
}
