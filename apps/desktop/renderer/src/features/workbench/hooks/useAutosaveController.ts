import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { WorkbenchContextToken } from "@/features/workbench/runtime";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import type { PreloadApi } from "@/lib/preloadApi";

import type {
  AcceptSaveRetryControllerState,
  AutosaveControllerState,
  AutosaveToastEvent,
  InFlightAutosave,
  MutableRef,
  PendingAutosaveDraft,
  SaveDocumentResult,
  SaveRequestToken,
  SaveState,
} from "./types";

const AUTOSAVE_DELAY_MS = 800;
const SAVE_SUCCESS_DECAY_MS = 2000;

export class BlockedAutosaveError extends Error {
  constructor() {
    super("blocked-autosave");
    this.name = "BlockedAutosaveError";
  }
}

function isSameContextToken(left: WorkbenchContextToken | null, right: WorkbenchContextToken | null): boolean {
  if (left === null || right === null) {
    return false;
  }

  return left.projectId === right.projectId
    && left.documentId === right.documentId
    && left.revision === right.revision;
}

export interface AutosaveControllerDeps {
  api: PreloadApi;
  activeContextTokenRef: MutableRef<WorkbenchContextToken | null>;
  userEditRevisionRef: MutableRef<number>;
}

export interface AutosaveController {
  armSavedStateDecayTimer: (request: SaveRequestToken) => void;
  autosaveToastEvent: AutosaveToastEvent | null;
  clearAcceptSaveFailure: () => void;
  clearAcceptSaveRetryController: () => void;
  clearAutosaveController: () => void;
  clearAutosaveError: () => void;
  clearPendingAutosaveTimer: () => void;
  clearSavedStateDecayTimer: () => void;
  flushDirtyDraftBeforeContextSwitch: () => Promise<void>;
  flushPendingAutosaveDraft: (draft: PendingAutosaveDraft | null) => Promise<SaveDocumentResult | null>;
  isCurrentContextToken: (context: WorkbenchContextToken | null) => boolean;
  isCurrentSaveContext: (request: SaveRequestToken) => boolean;
  isLatestSaveRequest: (request: SaveRequestToken) => boolean;
  lastSavedAt: number | null;
  pendingAutosaveDraftRef: MutableRef<PendingAutosaveDraft | null>;
  persistAutosaveDraft: (draft: PendingAutosaveDraft) => Promise<SaveDocumentResult>;
  publishAutosaveToast: (event: Omit<AutosaveToastEvent, "eventId">) => void;
  queueSaveRequest: <TResult>(operation: () => Promise<TResult>) => Promise<TResult>;
  reserveSaveRequest: () => SaveRequestToken;
  retryLastAutosave: () => void;
  runWithoutAutosave: <TResult>(operation: () => TResult) => TResult;
  saveState: SaveState;
  scheduleAutosave: (content: unknown) => void;
  setLastSavedAt: React.Dispatch<React.SetStateAction<number | null>>;
  setSaveUiState: (nextState: SaveState, source?: "autosave" | "accept" | null) => void;
  setWorkbenchError: (message: string | null, source: "accept" | "autosave" | "general" | null) => void;
  // Expose refs needed by AI skill controller
  acceptSaveRetryControllerRef: MutableRef<AcceptSaveRetryControllerState>;
  autosaveControllerRef: MutableRef<AutosaveControllerState>;
  autosaveSuppressionDepthRef: MutableRef<number>;
  autosaveTimerRef: MutableRef<number | null>;
  errorMessageSourceRef: MutableRef<"accept" | "autosave" | "general" | null>;
  saveErrorSourceRef: MutableRef<"autosave" | "accept" | null>;
  // Expose error state
  errorMessage: string | null;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
}

export const AUTOSAVE_DELAY = AUTOSAVE_DELAY_MS;

export function useAutosaveController(deps: AutosaveControllerDeps): AutosaveController {
  const { api, activeContextTokenRef, userEditRevisionRef } = deps;
  const { t } = useTranslation();

  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveSuppressionDepthRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveRequestRef = useRef(0);
  const pendingAutosaveDraftRef = useRef<PendingAutosaveDraft | null>(null);
  const inFlightAutosaveRef = useRef<InFlightAutosave | null>(null);
  const autosaveControllerRef = useRef<AutosaveControllerState>({ draft: null, saveState: "idle" });
  const autosaveToastEventIdRef = useRef(0);
  const acceptSaveRetryControllerRef = useRef<AcceptSaveRetryControllerState>({ preview: null, saveState: "idle" });
  const errorMessageSourceRef = useRef<"accept" | "autosave" | "general" | null>(null);
  const saveErrorSourceRef = useRef<"autosave" | "accept" | null>(null);
  const savedStateDecayTimerRef = useRef<number | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [autosaveToastEvent, setAutosaveToastEvent] = useState<AutosaveToastEvent | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearPendingAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const clearSavedStateDecayTimer = useCallback(() => {
    if (savedStateDecayTimerRef.current !== null) {
      window.clearTimeout(savedStateDecayTimerRef.current);
      savedStateDecayTimerRef.current = null;
    }
  }, []);

  const runWithoutAutosave = useCallback(<TResult,>(operation: () => TResult): TResult => {
    autosaveSuppressionDepthRef.current += 1;
    try {
      return operation();
    } finally {
      autosaveSuppressionDepthRef.current -= 1;
    }
  }, []);

  const reserveSaveRequest = useCallback((): SaveRequestToken => {
    clearSavedStateDecayTimer();
    latestSaveRequestRef.current += 1;
    return {
      requestId: latestSaveRequestRef.current,
      context: activeContextTokenRef.current,
    };
  }, [activeContextTokenRef, clearSavedStateDecayTimer]);

  const isCurrentSaveContext = useCallback((request: SaveRequestToken) => (
    isSameContextToken(activeContextTokenRef.current, request.context)
  ), [activeContextTokenRef]);

  const isLatestSaveRequest = useCallback((request: SaveRequestToken) => (
    latestSaveRequestRef.current === request.requestId
    && isCurrentSaveContext(request)
  ), [isCurrentSaveContext]);

  const isCurrentContextToken = useCallback((context: WorkbenchContextToken | null) => (
    isSameContextToken(activeContextTokenRef.current, context)
  ), [activeContextTokenRef]);

  const armSavedStateDecayTimer = useCallback((request: SaveRequestToken) => {
    clearSavedStateDecayTimer();
    savedStateDecayTimerRef.current = window.setTimeout(() => {
      savedStateDecayTimerRef.current = null;
      if (isLatestSaveRequest(request)) {
        saveErrorSourceRef.current = null;
        setSaveState("idle");
      }
    }, SAVE_SUCCESS_DECAY_MS);
  }, [clearSavedStateDecayTimer, isLatestSaveRequest]);

  const queueSaveRequest = useCallback(<TResult,>(operation: () => Promise<TResult>): Promise<TResult> => {
    const task = saveQueueRef.current.then(operation, operation);
    saveQueueRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, []);

  const publishAutosaveToast = useCallback((event: Omit<AutosaveToastEvent, "eventId">) => {
    autosaveToastEventIdRef.current += 1;
    setAutosaveToastEvent({
      eventId: autosaveToastEventIdRef.current,
      ...event,
    });
  }, []);

  const clearAutosaveController = useCallback(() => {
    autosaveControllerRef.current = { draft: null, saveState: "idle" };
  }, []);

  const clearAcceptSaveRetryController = useCallback(() => {
    acceptSaveRetryControllerRef.current = { preview: null, saveState: "idle" };
  }, []);

  const setWorkbenchError = useCallback((message: string | null, source: "accept" | "autosave" | "general" | null) => {
    errorMessageSourceRef.current = source;
    setErrorMessage(message);
  }, []);

  const clearAutosaveError = useCallback(() => {
    if (errorMessageSourceRef.current === "autosave") {
      errorMessageSourceRef.current = null;
      setErrorMessage(null);
    }
  }, []);

  const setSaveUiState = useCallback((nextState: SaveState, source: "autosave" | "accept" | null = null) => {
    saveErrorSourceRef.current = nextState === "error" ? source : null;
    setSaveState(nextState);
  }, []);

  const clearAcceptSaveFailure = useCallback(() => {
    const hasAcceptFailure = acceptSaveRetryControllerRef.current.saveState === "error"
      || saveErrorSourceRef.current === "accept"
      || errorMessageSourceRef.current === "accept";
    if (hasAcceptFailure === false) {
      return;
    }

    clearAcceptSaveRetryController();
    if (saveErrorSourceRef.current === "accept") {
      setSaveUiState("idle");
    }
    if (errorMessageSourceRef.current === "accept") {
      setWorkbenchError(null, null);
    }
  }, [clearAcceptSaveRetryController, setSaveUiState, setWorkbenchError]);

  const persistAutosaveDraft = useCallback((draft: PendingAutosaveDraft) => {
    autosaveControllerRef.current = { draft, saveState: "saving" };

    const task = queueSaveRequest(async () => {
      if (isLatestSaveRequest(draft.request)) {
        setSaveUiState("saving");
        clearAutosaveError();
      }

      const result = await api.file.saveDocument({
        projectId: draft.context.projectId,
        documentId: draft.context.documentId,
        actor: "auto",
        reason: "autosave",
        contentJson: draft.contentJson,
      });

      if (result.ok === false) {
        if (isLatestSaveRequest(draft.request)) {
          const humanErrorMessage = getHumanErrorMessage(result.error, t);
          autosaveControllerRef.current = { draft, saveState: "error" };
          setSaveUiState("error", "autosave");
          setWorkbenchError(humanErrorMessage, "autosave");
          publishAutosaveToast({ kind: "error", errorMessage: humanErrorMessage });
        }
        return result;
      }

      if (isLatestSaveRequest(draft.request)) {
        autosaveControllerRef.current = { draft, saveState: "saved" };
        setSaveUiState("saved");
        clearAutosaveError();
        setLastSavedAt(result.data.updatedAt);
        publishAutosaveToast({ kind: "success" });
        armSavedStateDecayTimer(draft.request);
      }

      return result;
    });

    const trackedTask = task.finally(() => {
      if (inFlightAutosaveRef.current?.promise === trackedTask) {
        inFlightAutosaveRef.current = null;
      }
    });

    inFlightAutosaveRef.current = {
      context: draft.context,
      promise: trackedTask,
      request: draft.request,
    };

    return trackedTask;
  }, [api.file, armSavedStateDecayTimer, clearAutosaveError, isLatestSaveRequest, publishAutosaveToast, queueSaveRequest, setSaveUiState, setWorkbenchError, t]);

  const flushPendingAutosaveDraft = useCallback(async (draft: PendingAutosaveDraft | null) => {
    if (draft === null) {
      return null;
    }

    if (pendingAutosaveDraftRef.current === draft) {
      pendingAutosaveDraftRef.current = null;
    }

    return persistAutosaveDraft(draft);
  }, [persistAutosaveDraft]);

  const retryLastAutosave = useCallback(() => {
    const latestAutosave = autosaveControllerRef.current;
    if (latestAutosave.draft === null || latestAutosave.saveState !== "error") {
      return;
    }

    clearPendingAutosaveTimer();
    pendingAutosaveDraftRef.current = null;
    clearAutosaveError();

    const retryDraft = {
      ...latestAutosave.draft,
      request: reserveSaveRequest(),
    } satisfies PendingAutosaveDraft;

    autosaveControllerRef.current = { draft: retryDraft, saveState: "saving" };
    void persistAutosaveDraft(retryDraft);
  }, [clearAutosaveError, clearPendingAutosaveTimer, persistAutosaveDraft, reserveSaveRequest]);

  const flushDirtyDraftBeforeContextSwitch = useCallback(async () => {
    clearPendingAutosaveTimer();
    const pendingDraft = pendingAutosaveDraftRef.current;
    if (pendingDraft !== null && isCurrentContextToken(pendingDraft.context)) {
      const result = await flushPendingAutosaveDraft(pendingDraft);
      if (result?.ok === false) {
        throw new BlockedAutosaveError();
      }
      return;
    }

    const inFlightAutosave = inFlightAutosaveRef.current;
    if (inFlightAutosave === null || isCurrentContextToken(inFlightAutosave.context) === false) {
      return;
    }

    const result = await inFlightAutosave.promise;
    if (result.ok === false) {
      throw new BlockedAutosaveError();
    }
  }, [clearPendingAutosaveTimer, flushPendingAutosaveDraft, isCurrentContextToken]);

  const scheduleAutosave = useCallback((content: unknown) => {
    const currentContext = activeContextTokenRef.current;
    if (autosaveSuppressionDepthRef.current > 0 || currentContext === null) {
      return;
    }

    clearPendingAutosaveTimer();
    userEditRevisionRef.current += 1;

    clearAcceptSaveFailure();
    setSaveUiState("idle");
    const nextDraft = {
      contentJson: JSON.stringify(content),
      context: currentContext,
      request: reserveSaveRequest(),
    } satisfies PendingAutosaveDraft;
    autosaveControllerRef.current = { draft: nextDraft, saveState: "idle" };
    pendingAutosaveDraftRef.current = nextDraft;
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      if (pendingAutosaveDraftRef.current !== nextDraft) {
        return;
      }
      void flushPendingAutosaveDraft(nextDraft);
    }, AUTOSAVE_DELAY_MS);
  }, [activeContextTokenRef, clearAcceptSaveFailure, clearPendingAutosaveTimer, flushPendingAutosaveDraft, reserveSaveRequest, setSaveUiState, userEditRevisionRef]);

  return {
    acceptSaveRetryControllerRef,
    armSavedStateDecayTimer,
    autosaveControllerRef,
    autosaveSuppressionDepthRef,
    autosaveTimerRef,
    autosaveToastEvent,
    clearAcceptSaveFailure,
    clearAcceptSaveRetryController,
    clearAutosaveController,
    clearAutosaveError,
    clearPendingAutosaveTimer,
    clearSavedStateDecayTimer,
    errorMessage,
    errorMessageSourceRef,
    flushDirtyDraftBeforeContextSwitch,
    flushPendingAutosaveDraft,
    isCurrentContextToken,
    isCurrentSaveContext,
    isLatestSaveRequest,
    lastSavedAt,
    pendingAutosaveDraftRef,
    persistAutosaveDraft,
    publishAutosaveToast,
    queueSaveRequest,
    reserveSaveRequest,
    retryLastAutosave,
    runWithoutAutosave,
    saveErrorSourceRef,
    saveState,
    scheduleAutosave,
    setErrorMessage,
    setLastSavedAt,
    setSaveUiState,
    setWorkbenchError,
  };
}
