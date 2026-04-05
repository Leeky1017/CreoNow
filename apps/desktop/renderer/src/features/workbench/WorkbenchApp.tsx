import {
  Brain,
  ChevronLeft,
  FolderTree,
  History,
  ListTree,
  Network,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { createEditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";
import type { VersionHistorySnapshotDetail } from "@/features/version-history/types";
import { useVersionHistoryController } from "@/features/version-history/useVersionHistoryController";
import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";
import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";
import {
  SelectionChangedError,
  StaleAiPreviewError,
  acceptAiPreview,
  bootstrapWorkspace,
  createDocumentAndOpen,
  openDocument,
  rejectAiPreview,
  requestAiPreview,
  type AiPreview,
  type DocumentListItem,
  type DocumentRead,
  type ProjectListItem,
  type WorkbenchContextToken,
  type WorkbenchSkillId,
} from "@/features/workbench/runtime";
import { AppToastProvider, useAppToast } from "@/lib/appToast";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { GlobalErrorToastBridge } from "@/lib/globalErrorToastBridge";
import { getPreloadApi, type PreloadApi } from "@/lib/preloadApi";
import { useExportProgress } from "@/lib/useExportProgress";

const DEFAULT_MODEL = "gpt-4.1-mini";
const AUTOSAVE_DELAY_MS = 800;
const SAVE_SUCCESS_DECAY_MS = 2000;
const MAX_REFERENCE_LENGTH = 120;

const LAYOUT_STORAGE_KEYS = {
  activeLeftPanel: "creonow.layout.activeLeftPanel",
  activeRightPanel: "creonow.layout.activePanelTab",
  panelCollapsed: "creonow.layout.panelCollapsed",
  panelWidth: "creonow.layout.panelWidth",
  sidebarCollapsed: "creonow.layout.sidebarCollapsed",
  sidebarWidth: "creonow.layout.sidebarWidth",
} as const;

const LEFT_SIDEBAR_BOUNDS = {
  defaultWidth: 240,
  minWidth: 180,
  maxWidth: 400,
} as const;

const RIGHT_PANEL_BOUNDS = {
  defaultWidth: 320,
  minWidth: 280,
  maxWidth: 480,
} as const;

type BootstrapStatus = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";
type LeftPanelId =
  | "files"
  | "search"
  | "outline"
  | "versionHistory"
  | "memory"
  | "characters"
  | "knowledgeGraph"
  | "settings";
type RightPanelId = "ai" | "info" | "quality";
type DragState =
  | { panel: "left"; startWidth: number; startX: number }
  | { panel: "right"; startWidth: number; startX: number }
  | null;

type SaveRequestToken = {
  context: WorkbenchContextToken | null;
  requestId: number;
};

type PendingAutosaveDraft = {
  contentJson: string;
  context: WorkbenchContextToken;
  request: SaveRequestToken;
};

type SaveDocumentResult = Awaited<ReturnType<PreloadApi["file"]["saveDocument"]>>;

type InFlightAutosave = {
  context: WorkbenchContextToken;
  promise: Promise<SaveDocumentResult>;
  request: SaveRequestToken;
};

type AutosaveControllerState = {
  draft: PendingAutosaveDraft | null;
  saveState: SaveState;
};

type AcceptSaveRetryControllerState = {
  preview: AiPreview | null;
  saveState: SaveState;
};

type AutosaveToastEvent = {
  eventId: number;
  errorMessage?: string;
  kind: "error" | "success";
};

type VersionPreviewState = {
  currentContentJson: string;
  snapshot: VersionHistorySnapshotDetail;
};

class BlockedAutosaveError extends Error {
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

const LEFT_PANEL_ITEMS: Array<{
  icon: typeof FolderTree;
  id: LeftPanelId;
  labelKey: string;
  placement: "top" | "bottom";
}> = [
  { id: "files", icon: FolderTree, labelKey: "iconBar.files", placement: "top" },
  { id: "search", icon: Search, labelKey: "iconBar.search", placement: "top" },
  { id: "outline", icon: ListTree, labelKey: "iconBar.outline", placement: "top" },
  { id: "versionHistory", icon: History, labelKey: "iconBar.versionHistory", placement: "top" },
  { id: "memory", icon: Brain, labelKey: "iconBar.memory", placement: "top" },
  { id: "characters", icon: Users, labelKey: "iconBar.characters", placement: "top" },
  { id: "knowledgeGraph", icon: Network, labelKey: "iconBar.knowledgeGraph", placement: "top" },
  { id: "settings", icon: Settings, labelKey: "iconBar.settings", placement: "bottom" },
];

const LEFT_PANEL_IDS = LEFT_PANEL_ITEMS.map((item) => item.id) as LeftPanelId[];
const RIGHT_PANEL_IDS = ["ai", "info", "quality"] as const satisfies readonly RightPanelId[];

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function isMeaningfulSelection(selection: SelectionRef | null): selection is SelectionRef {
  return selection !== null && selection.text.trim().length > 0;
}

function truncateReference(text: string): string {
  if (text.length <= MAX_REFERENCE_LENGTH) {
    return text;
  }

  return text.slice(0, MAX_REFERENCE_LENGTH).trimEnd() + "...";
}

function clampWidth(value: number, bounds: { minWidth: number; maxWidth: number }): number {
  return Math.min(bounds.maxWidth, Math.max(bounds.minWidth, Math.round(value)));
}

function readLayoutValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLayoutValue(key: string, value: boolean | number | string): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const value = readLayoutValue(key);
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function readStoredPanelId<TPanel extends string>(key: string, allowed: readonly TPanel[], fallback: TPanel): TPanel {
  const value = readLayoutValue(key);
  if (value !== null && allowed.includes(value as TPanel)) {
    return value as TPanel;
  }
  return fallback;
}

function readStoredWidth(
  key: string,
  bounds: { defaultWidth: number; minWidth: number; maxWidth: number },
): number {
  const value = Number(readLayoutValue(key));
  if (Number.isFinite(value)) {
    return clampWidth(value, bounds);
  }
  return bounds.defaultWidth;
}

function ToastIntegrationBridge(props: {
  autosaveEvent: AutosaveToastEvent | null;
  retryLastAutosave: () => void;
}) {
  const { showToast } = useAppToast();
  const { t } = useTranslation();
  const latestHandledEventRef = useRef(0);

  useEffect(() => {
    if (props.autosaveEvent === null || props.autosaveEvent.eventId === latestHandledEventRef.current) {
      return;
    }

    latestHandledEventRef.current = props.autosaveEvent.eventId;

    if (props.autosaveEvent.kind === "error") {
      showToast({
        action: {
          label: t("actions.retry"),
          onClick: props.retryLastAutosave,
        },
        description: props.autosaveEvent.errorMessage ?? t("toast.autosaveError.description"),
        title: t("toast.autosaveError.title"),
        variant: "error",
      });
      return;
    }

    showToast({
      description: t("toast.autosaveSuccess.description"),
      title: t("toast.autosaveSuccess.title"),
      variant: "success",
    });
  }, [props.autosaveEvent, props.retryLastAutosave, showToast, t]);

  return null;
}

export function WorkbenchApp() {
  return <AppToastProvider>
    <GlobalErrorToastBridge />
    <WorkbenchShell />
  </AppToastProvider>;
}

function WorkbenchShell() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const exportProgress = useExportProgress();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveSuppressionDepthRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveRequestRef = useRef(0);
  const latestBusyOperationRef = useRef(0);
  const userEditRevisionRef = useRef(0);
  const editorContextRevisionRef = useRef(0);
  const activeContextTokenRef = useRef<WorkbenchContextToken | null>(null);
  const pendingAutosaveDraftRef = useRef<PendingAutosaveDraft | null>(null);
  const inFlightAutosaveRef = useRef<InFlightAutosave | null>(null);
  const autosaveControllerRef = useRef<AutosaveControllerState>({ draft: null, saveState: "idle" });
  const autosaveToastEventIdRef = useRef(0);
  const acceptSaveRetryControllerRef = useRef<AcceptSaveRetryControllerState>({ preview: null, saveState: "idle" });
  const errorMessageSourceRef = useRef<"accept" | "autosave" | "general" | null>(null);
  const saveErrorSourceRef = useRef<"autosave" | "accept" | null>(null);
  const savedStateDecayTimerRef = useRef<number | null>(null);
  const bootstrapStatusRef = useRef<BootstrapStatus>("loading");

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
  }, [clearSavedStateDecayTimer]);

  const reserveBusyOperation = useCallback(() => {
    latestBusyOperationRef.current += 1;
    return latestBusyOperationRef.current;
  }, []);

  const isCurrentSaveContext = useCallback((request: SaveRequestToken) => (
    isSameContextToken(activeContextTokenRef.current, request.context)
  ), []);

  const isLatestSaveRequest = useCallback((request: SaveRequestToken) => (
    latestSaveRequestRef.current === request.requestId
    && isCurrentSaveContext(request)
  ), [isCurrentSaveContext]);

  const isCurrentContextToken = useCallback((context: WorkbenchContextToken | null) => (
    isSameContextToken(activeContextTokenRef.current, context)
  ), []);

  const isLatestBusyOperation = useCallback((operationId: number) => (
    latestBusyOperationRef.current === operationId
  ), []);

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

  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("loading");
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRead | null>(null);
  const [liveSelection, setLiveSelection] = useState<SelectionRef | null>(null);
  const [stickySelection, setStickySelection] = useState<SelectionRef | null>(null);
  const [activeSkill, setActiveSkill] = useState<WorkbenchSkillId>("builtin:polish");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [versionPreviewState, setVersionPreviewState] = useState<VersionPreviewState | null>(null);
  const [restoreDialogSnapshot, setRestoreDialogSnapshot] = useState<VersionHistorySnapshotDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [autosaveToastEvent, setAutosaveToastEvent] = useState<AutosaveToastEvent | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelId>(() =>
    readStoredPanelId(LAYOUT_STORAGE_KEYS.activeLeftPanel, LEFT_PANEL_IDS, "files"),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readStoredBoolean(LAYOUT_STORAGE_KEYS.sidebarCollapsed, false),
  );
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredWidth(LAYOUT_STORAGE_KEYS.sidebarWidth, LEFT_SIDEBAR_BOUNDS),
  );
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelId>(() =>
    readStoredPanelId(LAYOUT_STORAGE_KEYS.activeRightPanel, RIGHT_PANEL_IDS, "ai"),
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(() =>
    readStoredBoolean(LAYOUT_STORAGE_KEYS.panelCollapsed, false),
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredWidth(LAYOUT_STORAGE_KEYS.panelWidth, RIGHT_PANEL_BOUNDS),
  );
  const [dragState, setDragState] = useState<DragState>(null);
  const versionHistoryDocument = useMemo(
    () => activeDocument === null
      ? null
      : {
          documentId: activeDocument.documentId,
          projectId: activeDocument.projectId,
        },
    [activeDocument?.documentId, activeDocument?.projectId],
  );
  const versionHistory = useVersionHistoryController({
    activeDocument: versionHistoryDocument,
    api: api.version,
    enabled: activeLeftPanel === "versionHistory" && sidebarCollapsed === false,
  });
  const versionPreviewSnapshot = versionPreviewState?.snapshot ?? null;
  const isVersionPreviewActive = versionPreviewSnapshot !== null;

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
    setPreview(null);
    if (saveErrorSourceRef.current === "accept") {
      setSaveUiState("idle");
    }
    if (errorMessageSourceRef.current === "accept") {
      setWorkbenchError(null, null);
    }
  }, [clearAcceptSaveRetryController, setPreview, setSaveUiState, setWorkbenchError]);

  useEffect(() => {
    bootstrapStatusRef.current = bootstrapStatus;
  }, [bootstrapStatus]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.activeLeftPanel, activeLeftPanel);
  }, [activeLeftPanel]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.sidebarWidth, sidebarWidth);
  }, [sidebarWidth]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.activeRightPanel, activeRightPanel);
  }, [activeRightPanel]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.panelCollapsed, rightPanelCollapsed);
  }, [rightPanelCollapsed]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.panelWidth, rightPanelWidth);
  }, [rightPanelWidth]);

  useEffect(() => {
    if (dragState === null) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (dragState.panel === "left") {
        setSidebarWidth(clampWidth(dragState.startWidth + (event.clientX - dragState.startX), LEFT_SIDEBAR_BOUNDS));
        return;
      }

      setRightPanelWidth(clampWidth(dragState.startWidth + (dragState.startX - event.clientX), RIGHT_PANEL_BOUNDS));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  const clearReference = () => {
    setStickySelection(null);
  };

  const selectAiSkill = useCallback((skillId: WorkbenchSkillId) => {
    setActiveSkill(skillId);
    setPreview(null);
    clearAcceptSaveFailure();
    setWorkbenchError(null, null);
  }, [clearAcceptSaveFailure, setWorkbenchError]);

  const resetAiConversation = () => {
    setInstruction("");
    setPreview(null);
    clearAcceptSaveFailure();
    setWorkbenchError(null, null);
    clearReference();
  };

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

  const editorBridge = useMemo(
    () =>
      createEditorBridge({
        onSelectionChange: (nextSelection) => {
          setLiveSelection(nextSelection);

          if (bootstrapStatusRef.current !== "ready" || isMeaningfulSelection(nextSelection) === false) {
            return;
          }

          setStickySelection(nextSelection);
          setPreview(null);
          clearAcceptSaveFailure();
          setWorkbenchError(null, null);
        },
        onDocumentChange: (content) => {
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
        },
      }),
    [clearAcceptSaveFailure, clearPendingAutosaveTimer, flushPendingAutosaveDraft, reserveSaveRequest, setSaveUiState],
  );

  const replaceEditorContextContent = useCallback((nextContext: {
    contentJson: string;
    documentId: string;
    projectId: string;
  }) => {
    clearPendingAutosaveTimer();
    pendingAutosaveDraftRef.current = null;
    clearSavedStateDecayTimer();
    clearAutosaveController();
    clearAcceptSaveFailure();
    editorContextRevisionRef.current += 1;
    activeContextTokenRef.current = {
      documentId: nextContext.documentId,
      projectId: nextContext.projectId,
      revision: editorContextRevisionRef.current,
    };
    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    runWithoutAutosave(() => {
      editorBridge.setEditable(true);
      editorBridge.setContent(JSON.parse(nextContext.contentJson));
    });
  }, [
    clearAcceptSaveFailure,
    clearAutosaveController,
    clearPendingAutosaveTimer,
    clearSavedStateDecayTimer,
    editorBridge,
    runWithoutAutosave,
  ]);

  const startVersionPreview = useCallback((snapshot: VersionHistorySnapshotDetail) => {
    setWorkbenchError(null, null);
    setRestoreDialogSnapshot(null);
    setVersionPreviewState((currentPreview) => ({
      currentContentJson: currentPreview?.currentContentJson ?? JSON.stringify(editorBridge.getContent()),
      snapshot,
    }));
    runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(snapshot.contentJson));
      editorBridge.setEditable(false);
    });
  }, [editorBridge, runWithoutAutosave, setWorkbenchError]);

  const handleReturnToCurrentVersion = useCallback(() => {
    if (versionPreviewState === null) {
      return;
    }

    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(versionPreviewState.currentContentJson));
      editorBridge.setEditable(true);
    });
  }, [editorBridge, runWithoutAutosave, versionPreviewState]);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    editorBridge.mount(containerRef.current);
    editorBridge.focus();

    return () => {
      clearPendingAutosaveTimer();
      clearSavedStateDecayTimer();
      editorBridge.destroy();
    };
  }, [clearPendingAutosaveTimer, clearSavedStateDecayTimer, editorBridge]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) === false || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key === "\\") {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
        return;
      }

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        if (rightPanelCollapsed) {
          setActiveRightPanel("ai");
          setRightPanelCollapsed(false);
          return;
        }

        setRightPanelCollapsed(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rightPanelCollapsed]);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      try {
        clearPendingAutosaveTimer();
        clearSavedStateDecayTimer();
        setBootstrapStatus("loading");
        setWorkbenchError(null, null);
        const workspace = await bootstrapWorkspace(api, {
          defaultProjectName: t("project.defaultName"),
          defaultDocumentTitle: t("document.defaultTitle"),
        });
        if (disposed) {
          return;
        }

        replaceEditorContextContent({
          contentJson: workspace.activeDocument.contentJson,
          documentId: workspace.activeDocument.documentId,
          projectId: workspace.project.projectId,
        });
        setProject(workspace.project);
        setDocuments(workspace.documents);
        setActiveDocument(workspace.activeDocument);
        setSaveUiState("idle");
        setLastSavedAt(workspace.activeDocument.updatedAt);
        setPreview(null);
        setStickySelection(null);
        setLiveSelection(null);
        setBootstrapStatus("ready");
      } catch (error) {
        if (disposed === false) {
          setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
          setBootstrapStatus("error");
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [api, clearSavedStateDecayTimer, replaceEditorContextContent, setSaveUiState, t]);

  const handleCreateDocument = async () => {
    if (project === null) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      await flushDirtyDraftBeforeContextSwitch();
      const result = await createDocumentAndOpen({
        api,
        projectId: project.projectId,
        defaultDocumentTitle: t("document.defaultTitle"),
      });
      replaceEditorContextContent({
        contentJson: result.activeDocument.contentJson,
        documentId: result.activeDocument.documentId,
        projectId: result.activeDocument.projectId,
      });
      setDocuments(result.documents);
      setActiveDocument(result.activeDocument);
      setPreview(null);
      setStickySelection(null);
      setLiveSelection(null);
      setSaveUiState("idle");
      setLastSavedAt(result.activeDocument.updatedAt);
      setWorkbenchError(null, null);
      setActiveLeftPanel("files");
      setSidebarCollapsed(false);
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  };

  const handleOpenDocument = async (documentId: string) => {
    if (project === null) {
      return;
    }

    if (activeDocument !== null && documentId === activeDocument.documentId) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      await flushDirtyDraftBeforeContextSwitch();
      const readDocument = await openDocument({
        api,
        projectId: project.projectId,
        documentId,
      });
      replaceEditorContextContent({
        contentJson: readDocument.contentJson,
        documentId: readDocument.documentId,
        projectId: readDocument.projectId,
      });
      setActiveDocument(readDocument);
      setPreview(null);
      setStickySelection(null);
      setLiveSelection(null);
      setWorkbenchError(null, null);
      setSaveUiState("idle");
      setLastSavedAt(readDocument.updatedAt);
      setActiveLeftPanel("files");
      setSidebarCollapsed(false);
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  };

  const refreshActiveDocumentFromDisk = useCallback(async () => {
    if (activeDocument === null) {
      return null;
    }

    const readDocument = await api.file.readDocument({
      documentId: activeDocument.documentId,
      projectId: activeDocument.projectId,
    });
    if (readDocument.ok === false) {
      throw readDocument.error;
    }

    replaceEditorContextContent({
      contentJson: readDocument.data.contentJson,
      documentId: readDocument.data.documentId,
      projectId: readDocument.data.projectId,
    });
    setActiveDocument(readDocument.data);
    setDocuments((currentDocuments) => currentDocuments.map((document) =>
      document.documentId === readDocument.data.documentId
        ? {
            ...document,
            status: readDocument.data.status,
            title: readDocument.data.title,
            updatedAt: readDocument.data.updatedAt,
          }
        : document,
    ));
    setPreview(null);
    setStickySelection(null);
    setLiveSelection(null);
    setSaveUiState("idle");
    setLastSavedAt(readDocument.data.updatedAt);
    return readDocument.data;
  }, [activeDocument, api.file, replaceEditorContextContent, setSaveUiState]);

  const handleVersionHistoryRestore = useCallback(async () => {
    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      setWorkbenchError(null, null);
      setRestoreDialogSnapshot(null);
      await flushDirtyDraftBeforeContextSwitch();
      const result = await versionHistory.restoreSelected();
      if (result === null) {
        return;
      }
      await refreshActiveDocumentFromDisk();
      await versionHistory.refresh();
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  }, [
    flushDirtyDraftBeforeContextSwitch,
    isLatestBusyOperation,
    refreshActiveDocumentFromDisk,
    reserveBusyOperation,
    setWorkbenchError,
    t,
    versionHistory,
  ]);

  const handleRequestVersionRestore = useCallback(() => {
    if (versionHistory.selectedSnapshot === null) {
      return;
    }

    setRestoreDialogSnapshot(versionHistory.selectedSnapshot);
  }, [versionHistory.selectedSnapshot]);

  const handleGeneratePreview = async () => {
    const previewContext = activeContextTokenRef.current;
    if (previewContext === null) {
      return;
    }

    clearAcceptSaveFailure();

    if (activeSkill === "builtin:rewrite" && instruction.trim().length === 0) {
      setWorkbenchError(t("messages.rewriteInstructionRequired"), "general");
      return;
    }

    if (activeSkill !== "builtin:continue" && stickySelection === null) {
      return;
    }

    const cursorContext = activeSkill === "builtin:continue" ? editorBridge.getCursorContext() : null;
    if (activeSkill === "builtin:continue" && (cursorContext === null || cursorContext.precedingText.trim().length === 0)) {
      setWorkbenchError(t("messages.continueContextEmpty"), "general");
      return;
    }

    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      setWorkbenchError(null, null);
      const nextPreview = activeSkill === "builtin:continue"
        ? await requestAiPreview({
            api,
            context: previewContext,
            cursorPosition: cursorContext!.cursorPosition,
            instruction,
            model,
            precedingText: cursorContext!.precedingText,
            skillId: activeSkill,
            userEditRevision: userEditRevisionRef.current,
          })
        : await requestAiPreview({
            api,
            context: previewContext,
            selection: stickySelection!,
            instruction,
            model,
            skillId: activeSkill,
            userEditRevision: userEditRevisionRef.current,
          });
      if (isCurrentContextToken(previewContext)) {
        clearAcceptSaveFailure();
        setPreview(nextPreview);
        setStickySelection(null);
      }
    } catch (error) {
      if (isCurrentContextToken(previewContext)) {
        if (error instanceof Error && error.message === "preview-unavailable") {
          setWorkbenchError(t("messages.previewUnavailable"), "general");
        } else {
          setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
        }
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  };

  const runAcceptPreview = useCallback(async (acceptingPreview: AiPreview) => {
    if (isCurrentContextToken(acceptingPreview.context) === false) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    clearPendingAutosaveTimer();
    pendingAutosaveDraftRef.current = null;
    clearAutosaveController();
    acceptSaveRetryControllerRef.current = { preview: acceptingPreview, saveState: "saving" };
    const saveRequestId = reserveSaveRequest();
    const acceptStartedAtUserEditRevision = userEditRevisionRef.current;
    const acceptStartedAtEditorContextRevision = editorContextRevisionRef.current;

    try {
      setBusy(true);
      setWorkbenchError(null, null);
      setSaveUiState("saving");
      const result = await queueSaveRequest(() => acceptAiPreview({
        api,
        bridge: editorBridge,
        preview: acceptingPreview,
        runWithoutAutosave,
        getUserEditRevision: () => userEditRevisionRef.current,
        getEditorContextRevision: () => editorContextRevisionRef.current,
      }));
      const acceptPathStillActive = acceptSaveRetryControllerRef.current.saveState === "saving"
        && acceptSaveRetryControllerRef.current.preview?.runId === acceptingPreview.runId;
      if (acceptPathStillActive) {
        clearAcceptSaveRetryController();
      }
      if (isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
        setWorkbenchError(result.feedbackError ? getHumanErrorMessage(result.feedbackError, t) : null, result.feedbackError ? "general" : null);
      }
      if (isLatestSaveRequest(saveRequestId) && acceptPathStillActive) {
        setSaveUiState("saved");
        setLastSavedAt(result.updatedAt);
        armSavedStateDecayTimer(saveRequestId);
      }
    } catch (error) {
      const acceptPathStillActive = acceptSaveRetryControllerRef.current.saveState === "saving"
        && acceptSaveRetryControllerRef.current.preview?.runId === acceptingPreview.runId;
      const stalePreviewError = error instanceof StaleAiPreviewError;
      const acceptPathInvalidated = userEditRevisionRef.current !== acceptStartedAtUserEditRevision
        || editorContextRevisionRef.current !== acceptStartedAtEditorContextRevision;
      if (acceptPathStillActive && (stalePreviewError || acceptPathInvalidated)) {
        clearAcceptSaveRetryController();
      }
      if (isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && stalePreviewError) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
        setWorkbenchError(t("messages.previewStale"), "accept");
      } else if (isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && acceptPathInvalidated) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
      }
      if (isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && stalePreviewError === false && acceptPathInvalidated === false) {
        if (error instanceof SelectionChangedError) {
          setWorkbenchError(t("messages.selectionChanged"), "accept");
        } else {
          setWorkbenchError(getHumanErrorMessage(error as Error, t), "accept");
        }
      }
      if (isLatestSaveRequest(saveRequestId) && acceptPathStillActive && stalePreviewError) {
        setSaveUiState("idle");
      } else if (isLatestSaveRequest(saveRequestId) && acceptPathStillActive && acceptPathInvalidated === false) {
        acceptSaveRetryControllerRef.current = { preview: acceptingPreview, saveState: "error" };
        setSaveUiState("error", "accept");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  }, [api, armSavedStateDecayTimer, clearAcceptSaveRetryController, clearAutosaveController, clearPendingAutosaveTimer, editorBridge, isCurrentContextToken, isLatestBusyOperation, isLatestSaveRequest, queueSaveRequest, reserveBusyOperation, reserveSaveRequest, runWithoutAutosave, setSaveUiState, setWorkbenchError, t]);

  const retryLastAcceptSave = useCallback(() => {
    const latestAcceptSave = acceptSaveRetryControllerRef.current;
    if (latestAcceptSave.preview === null || latestAcceptSave.saveState !== "error") {
      return;
    }

    void runAcceptPreview(latestAcceptSave.preview);
  }, [runAcceptPreview]);

  const handleAcceptPreview = async () => {
    if (preview === null) {
      return;
    }

    await runAcceptPreview(preview);
  };

  const handleRejectPreview = async () => {
    if (preview === null) {
      return;
    }

    const previewContext = preview.context;
    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      await rejectAiPreview(api, preview);
      if (isCurrentContextToken(previewContext)) {
        setPreview(null);
        clearAcceptSaveFailure();
        setWorkbenchError(null, null);
      }
    } catch (error) {
      if (isCurrentContextToken(previewContext)) {
        setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  };

  const handleLeftPanelSelect = (panelId: LeftPanelId) => {
    if (activeLeftPanel === panelId) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setActiveLeftPanel(panelId);
    setSidebarCollapsed(false);
  };

  const handleRightPanelSelect = (panelId: RightPanelId) => {
    setActiveRightPanel(panelId);
    setRightPanelCollapsed(false);
  };

  const handleToggleRightPanel = () => {
    setRightPanelCollapsed((current) => !current);
  };

  const startResize = (panel: "left" | "right") => (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    if (panel === "left") {
      setDragState({ panel, startX: event.clientX, startWidth: sidebarWidth });
      return;
    }

    setDragState({ panel, startX: event.clientX, startWidth: rightPanelWidth });
  };

  const handleStatusBarAction = () => {
    if (saveState !== "error") {
      return;
    }

    if (saveErrorSourceRef.current === "autosave") {
      retryLastAutosave();
      return;
    }

    if (saveErrorSourceRef.current === "accept") {
      retryLastAcceptSave();
    }
  };

  const saveLabel =
    saveState === "saving"
      ? t("status.saving")
      : saveState === "saved"
        ? t("status.saved")
        : saveState === "error"
          ? t("status.error")
          : t("status.ready");

  const wordCount = editorBridge.getTextContent().trim().length;
  const selectionHint = isVersionPreviewActive
    ? t("versionHistory.previewReadonlyHint")
    : stickySelection
      ? t("panel.ai.selectionLength", { count: stickySelection.text.length })
      : liveSelection
        ? t("panel.ai.selectionLength", { count: liveSelection.text.length })
        : t("editor.selectionHint");
  const cursorContext = useMemo(
    () => activeSkill === "builtin:continue" ? editorBridge.getCursorContext() : null,
    [activeSkill, liveSelection, editorBridge],
  );
  const continueReady = (cursorContext?.precedingText.trim().length ?? 0) > 0;
  const instructionHint = activeSkill === "builtin:continue"
    ? continueReady
      ? t("panel.ai.continueContextLength", { count: cursorContext?.precedingText.length ?? 0 })
      : t("messages.continueContextEmpty")
    : selectionHint;
  const frameStyle = {
    "--left-resizer-width": sidebarCollapsed ? "0px" : "8px",
    "--left-sidebar-width": sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
    "--right-panel-width": rightPanelCollapsed ? "0px" : `${rightPanelWidth}px`,
    "--right-resizer-width": rightPanelCollapsed ? "0px" : "8px",
  } as CSSProperties;

  const previewBannerLabel = versionPreviewSnapshot === null
    ? null
    : t("versionHistory.previewingVersion", {
        timestamp: formatTimestamp(versionPreviewSnapshot.createdAt),
      });

  const renderSidebarContent = () => {
    if (activeLeftPanel === "files") {
      return <>
        <div className="sidebar-header">
          <div>
            <h1 className="screen-title">{project?.name ?? t("project.defaultName")}</h1>
            <p className="panel-subtitle">{t("sidebar.files.subtitle")}</p>
          </div>
          <Button tone="ghost" onClick={() => void handleCreateDocument()}>{t("sidebar.newDocument")}</Button>
        </div>
        <div className="sidebar-list">
          {documents.length === 0 ? <p className="panel-meta">{t("sidebar.empty")}</p> : null}
          {documents.map((document) => (
            <Button
              key={document.documentId}
              tone="ghost"
              className={document.documentId === activeDocument?.documentId ? "sidebar-item sidebar-item--active" : "sidebar-item"}
              onClick={() => void handleOpenDocument(document.documentId)}
            >
              <span className="sidebar-item__title">{document.title}</span>
              <span className="sidebar-item__meta">{formatTimestamp(document.updatedAt)}</span>
            </Button>
          ))}
        </div>
      </>;
    }

    if (activeLeftPanel === "versionHistory") {
      return <VersionHistoryPanel
        errorMessage={versionHistory.errorMessage}
        items={versionHistory.items}
        onRefresh={() => {
          void versionHistory.refresh();
        }}
        onSelectVersion={(versionId) => {
          void versionHistory.selectVersion(versionId).then((snapshot) => {
            if (snapshot !== null) {
              startVersionPreview(snapshot);
            }
          });
        }}
        previewStatus={versionHistory.previewStatus}
        selectedSnapshot={versionHistory.selectedSnapshot}
        selectedVersionId={versionHistory.selectedVersionId}
        status={versionHistory.status}
      />;
    }

    const surfaceKey = `sidebar.${activeLeftPanel}`;
    return <div className="sidebar-surface">
      <div className="panel-section">
        <h1 className="screen-title">{t(`${surfaceKey}.title`)}</h1>
        <p className="panel-subtitle">{t(`${surfaceKey}.subtitle`)}</p>
      </div>
      <dl className="details-grid">
        <div className="details-row">
          <dt>{t("panel.info.document")}</dt>
          <dd>{activeDocument?.title ?? t("document.defaultTitle")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.info.wordCount")}</dt>
          <dd>{t("status.wordCount", { count: wordCount })}</dd>
        </div>
        <div className="details-row">
          <dt>{t("sidebar.surfaceState")}</dt>
          <dd>{t(`${surfaceKey}.state`)}</dd>
        </div>
      </dl>
    </div>;
  };

  const renderRightPanelContent = () => {
    if (activeRightPanel === "ai") {
      return <AiPreviewSurface
        activeSkill={activeSkill}
        busy={busy || isVersionPreviewActive}
        errorMessage={errorMessage}
        generateDisabled={activeSkill === "builtin:continue" ? continueReady === false : stickySelection === null}
        instruction={instruction}
        instructionHint={instructionHint}
        model={model}
        onAccept={() => void handleAcceptPreview()}
        onClearReference={clearReference}
        onGenerate={() => void handleGeneratePreview()}
        onInstructionChange={setInstruction}
        onModelChange={setModel}
        onReject={() => void handleRejectPreview()}
        onSkillChange={selectAiSkill}
        preview={preview}
        reference={stickySelection}
      />;
    }

    if (activeRightPanel === "info") {
      return <InfoPanelSurface
        documentTitle={activeDocument?.title ?? null}
        errorMessage={errorMessage}
        loading={bootstrapStatus !== "ready"}
        projectName={project?.name ?? null}
        statusLabel={saveLabel}
        updatedAt={formatTimestamp(lastSavedAt)}
        wordCount={wordCount}
      />;
    }

    return <section className="panel-surface" aria-label={t("tabs.quality")}>
      <header className="panel-section">
        <div>
          <h2 className="panel-title">{t("tabs.quality")}</h2>
          <p className="panel-subtitle">{t("panel.quality.subtitle")}</p>
        </div>
      </header>
      <dl className="details-grid">
        <div className="details-row">
          <dt>{t("panel.quality.selection")}</dt>
          <dd>{stickySelection ? truncateReference(stickySelection.text) : t("panel.quality.selectionEmpty")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.preview")}</dt>
          <dd>{preview ? t("panel.quality.previewReady") : t("panel.quality.previewIdle")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.saveState")}</dt>
          <dd>{saveLabel}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.wordCount")}</dt>
          <dd>{t("status.wordCount", { count: wordCount })}</dd>
        </div>
      </dl>
    </section>;
  };

  if (bootstrapStatus === "loading") {
    return <>
      <ToastIntegrationBridge autosaveEvent={autosaveToastEvent} retryLastAutosave={retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">{t("bootstrap.loading")}</main>
    </>;
  }

  if (bootstrapStatus === "error") {
    return <>
      <ToastIntegrationBridge autosaveEvent={autosaveToastEvent} retryLastAutosave={retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">
        <h1 className="screen-title">{t("bootstrap.errorTitle")}</h1>
        {errorMessage ? <p className="panel-error">{errorMessage}</p> : null}
        <Button tone="primary" onClick={() => window.location.reload()}>{t("actions.reload")}</Button>
      </main>
    </>;
  }

  return <>
    <ToastIntegrationBridge autosaveEvent={autosaveToastEvent} retryLastAutosave={retryLastAutosave} />
    <main className="workbench-shell">
    <div
      className={dragState === null ? "workbench-frame" : "workbench-frame workbench-frame--resizing"}
      data-testid="workbench-frame"
      data-export-active={exportProgress.isExporting ? "true" : undefined}
      style={frameStyle}
    >
      <aside className="icon-rail" aria-label={t("app.title")}>
        <div className="icon-rail__group">
          {LEFT_PANEL_ITEMS.filter((item) => item.placement === "top").map((item) => {
            const Icon = item.icon;
            return <Button
              key={item.id}
              className={activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
              tone="ghost"
              aria-label={t(item.labelKey)}
              aria-pressed={activeLeftPanel === item.id && sidebarCollapsed === false}
              onClick={() => handleLeftPanelSelect(item.id)}
            >
              <Icon size={18} />
            </Button>;
          })}
        </div>
        <div className="icon-rail__group icon-rail__group--bottom">
          {LEFT_PANEL_ITEMS.filter((item) => item.placement === "bottom").map((item) => {
            const Icon = item.icon;
            return <Button
              key={item.id}
              className={activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
              tone="ghost"
              aria-label={t(item.labelKey)}
              aria-pressed={activeLeftPanel === item.id && sidebarCollapsed === false}
              onClick={() => handleLeftPanelSelect(item.id)}
            >
              <Icon size={18} />
            </Button>;
          })}
        </div>
      </aside>

      {sidebarCollapsed ? null : <aside className="sidebar" aria-label={t("sidebar.title")}>
        {renderSidebarContent()}
      </aside>}

      {sidebarCollapsed ? null : <div
        className={dragState?.panel === "left" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        role="separator"
        aria-label={t("sidebar.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => setSidebarWidth(LEFT_SIDEBAR_BOUNDS.defaultWidth)}
        onMouseDown={startResize("left")}
      />}

      <section className="editor-column">
        <header className="editor-header">
          <div>
            <h2 className="screen-title">{activeDocument?.title ?? t("document.defaultTitle")}</h2>
            <p className="panel-meta">{selectionHint}</p>
          </div>
          {rightPanelCollapsed ? (
            <Button tone="ghost" disabled={isVersionPreviewActive} onClick={() => handleRightPanelSelect("ai")}>{t("panel.actions.openAi")}</Button>
          ) : null}
        </header>
        {versionPreviewSnapshot !== null && previewBannerLabel !== null ? <div className="version-preview-banner" role="status" aria-live="polite">
          <div className="version-preview-banner__copy">
            <p className="version-preview-banner__title">{previewBannerLabel}</p>
            <p className="version-preview-banner__subtitle">{t("versionHistory.previewReadonlyHint")}</p>
          </div>
          <div className="panel-actions">
            <Button
              tone="primary"
              disabled={versionHistory.action !== null}
              onClick={handleRequestVersionRestore}
            >
              {versionHistory.action === "restore" ? t("versionHistory.restoring") : t("versionHistory.restoreToThisVersion")}
            </Button>
            <Button tone="ghost" onClick={handleReturnToCurrentVersion}>{t("versionHistory.returnToCurrentVersion")}</Button>
          </div>
        </div> : null}
        <div className="editor-scroll">
          <div ref={containerRef} className={versionPreviewSnapshot === null ? "editor-host" : "editor-host editor-host--readonly"} />
        </div>
      </section>

      {rightPanelCollapsed ? null : <div
        className={dragState?.panel === "right" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        role="separator"
        aria-label={t("panel.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => setRightPanelWidth(RIGHT_PANEL_BOUNDS.defaultWidth)}
        onMouseDown={startResize("right")}
      />}

      {rightPanelCollapsed ? null : <aside className="right-panel" aria-label={t("panel.title")}>
        <div className="right-tabs">
          <div className="right-tabs__list" role="tablist" aria-label={t("panel.tabs")}>
            {RIGHT_PANEL_IDS.map((panelId) => (
              <Button
                key={panelId}
                tone="ghost"
                role="tab"
                className={activeRightPanel === panelId ? "right-tab right-tab--active" : "right-tab"}
                aria-selected={activeRightPanel === panelId}
                onClick={() => handleRightPanelSelect(panelId)}
              >
                {t(`tabs.${panelId}`)}
              </Button>
            ))}
          </div>
          <div className="right-tabs__actions">
            {activeRightPanel === "ai" ? <>
              <Button tone="ghost" className="right-action" onClick={() => undefined}>{t("panel.ai.history")}</Button>
              <Button tone="ghost" className="right-action" onClick={resetAiConversation}>{t("panel.ai.newChat")}</Button>
            </> : null}
            <Button tone="ghost" className="right-action" aria-label={t("panel.actions.collapse")} onClick={handleToggleRightPanel}>
              <ChevronLeft size={16} />
            </Button>
          </div>
        </div>
        {renderRightPanelContent()}
      </aside>}
    </div>

    {restoreDialogSnapshot === null ? null : <div className="version-restore-dialog-backdrop">
      <section className="version-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="version-restore-dialog-title">
        <div className="panel-section">
          <h2 id="version-restore-dialog-title" className="panel-title">{t("versionHistory.restoreDialogTitle")}</h2>
          <p className="panel-subtitle">{t("versionHistory.restoreDialogDescription", {
            timestamp: formatTimestamp(restoreDialogSnapshot.createdAt),
          })}</p>
        </div>
        <div className="panel-actions">
          <Button tone="ghost" onClick={() => setRestoreDialogSnapshot(null)}>{t("actions.cancel")}</Button>
          <Button tone="danger" onClick={() => void handleVersionHistoryRestore()}>{t("versionHistory.confirmRestore")}</Button>
        </div>
      </section>
    </div>}

    <footer className="status-bar">
      <span className="status-bar__group">
        {t("status.projectDocument", {
          project: project?.name ?? t("project.defaultName"),
          document: activeDocument?.title ?? t("document.defaultTitle"),
        })}
      </span>
      <span className="status-bar__group">{t("status.wordCount", { count: wordCount })}</span>
      <Button className="status-bar__group status-bar__action" tone="ghost" onClick={handleStatusBarAction}>
        {saveLabel}
      </Button>
      <span className="status-bar__group">{formatTimestamp(lastSavedAt)}</span>
    </footer>
    </main>
  </>;
}
