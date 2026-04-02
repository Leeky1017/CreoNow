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
import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";
import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";
import {
  SelectionChangedError,
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
} from "@/features/workbench/runtime";
import { AppToastProvider, useAppToast } from "@/lib/appToast";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { GlobalErrorToastBridge } from "@/lib/globalErrorToastBridge";
import { getPreloadApi, type PreloadApi } from "@/lib/preloadApi";

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

type AutosaveToastEvent = {
  eventId: number;
  errorMessage?: string;
  kind: "error" | "success";
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
  const errorMessageSourceRef = useRef<"autosave" | "general" | null>(null);
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

  const setWorkbenchError = useCallback((message: string | null, source: "autosave" | "general" | null) => {
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
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<AiPreview | null>(null);
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

  const resetAiConversation = () => {
    setInstruction("");
    setPreview(null);
    setWorkbenchError(null, null);
    clearReference();
  };

  const persistAutosaveDraft = useCallback((draft: PendingAutosaveDraft) => {
    autosaveControllerRef.current = { draft, saveState: "saving" };

    const task = queueSaveRequest(async () => {
      if (isLatestSaveRequest(draft.request)) {
        setSaveState("saving");
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
          setSaveState("error");
          setWorkbenchError(humanErrorMessage, "autosave");
          publishAutosaveToast({ kind: "error", errorMessage: humanErrorMessage });
        }
        return result;
      }

      if (isLatestSaveRequest(draft.request)) {
        autosaveControllerRef.current = { draft, saveState: "saved" };
        setSaveState("saved");
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
  }, [api.file, armSavedStateDecayTimer, clearAutosaveError, isLatestSaveRequest, publishAutosaveToast, queueSaveRequest, setWorkbenchError, t]);

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
          setWorkbenchError(null, null);
        },
        onDocumentChange: (content) => {
          const currentContext = activeContextTokenRef.current;
          if (autosaveSuppressionDepthRef.current > 0 || currentContext === null) {
            return;
          }

          clearPendingAutosaveTimer();
          userEditRevisionRef.current += 1;

          setSaveState("idle");
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
    [clearPendingAutosaveTimer, flushPendingAutosaveDraft, reserveSaveRequest],
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
    editorContextRevisionRef.current += 1;
    activeContextTokenRef.current = {
      documentId: nextContext.documentId,
      projectId: nextContext.projectId,
      revision: editorContextRevisionRef.current,
    };
    runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(nextContext.contentJson));
    });
  }, [clearAutosaveController, clearPendingAutosaveTimer, clearSavedStateDecayTimer, editorBridge, runWithoutAutosave]);

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
        setSaveState("idle");
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
  }, [api, clearSavedStateDecayTimer, replaceEditorContextContent, t]);

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
      setSaveState("idle");
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
      setSaveState("idle");
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

  const handleGeneratePreview = async () => {
    if (stickySelection === null) {
      return;
    }

    const previewContext = activeContextTokenRef.current;
    if (previewContext === null) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      setWorkbenchError(null, null);
      const nextPreview = await requestAiPreview({
        api,
        context: previewContext,
        selection: stickySelection,
        instruction,
        model,
      });
      if (isCurrentContextToken(previewContext)) {
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

  const handleAcceptPreview = async () => {
    if (preview === null || isCurrentContextToken(preview.context) === false) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    clearPendingAutosaveTimer();
    pendingAutosaveDraftRef.current = null;
    clearAutosaveController();
    const saveRequestId = reserveSaveRequest();

    try {
      setBusy(true);
      setSaveState("saving");
      const result = await queueSaveRequest(() => acceptAiPreview({
        api,
        bridge: editorBridge,
        preview,
        runWithoutAutosave,
        getUserEditRevision: () => userEditRevisionRef.current,
        getEditorContextRevision: () => editorContextRevisionRef.current,
      }));
      if (isCurrentContextToken(preview.context)) {
        setPreview(null);
        setWorkbenchError(result.feedbackError ? getHumanErrorMessage(result.feedbackError, t) : null, result.feedbackError ? "general" : null);
      }
      if (isLatestSaveRequest(saveRequestId)) {
        setSaveState("saved");
        setLastSavedAt(result.updatedAt);
        armSavedStateDecayTimer(saveRequestId);
      }
    } catch (error) {
      if (isCurrentContextToken(preview.context)) {
        if (error instanceof SelectionChangedError) {
          setWorkbenchError(t("messages.selectionChanged"), "general");
        } else {
          setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
        }
      }
      if (isLatestSaveRequest(saveRequestId)) {
        setSaveState("error");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
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
    if (saveState === "error") {
      retryLastAutosave();
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
  const selectionHint = stickySelection
    ? t("panel.ai.selectionLength", { count: stickySelection.text.length })
    : liveSelection
      ? t("panel.ai.selectionLength", { count: liveSelection.text.length })
      : t("editor.selectionHint");
  const frameStyle = {
    "--left-resizer-width": sidebarCollapsed ? "0px" : "8px",
    "--left-sidebar-width": sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
    "--right-panel-width": rightPanelCollapsed ? "0px" : `${rightPanelWidth}px`,
    "--right-resizer-width": rightPanelCollapsed ? "0px" : "8px",
  } as CSSProperties;

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
        busy={busy}
        errorMessage={errorMessage}
        instruction={instruction}
        model={model}
        onAccept={() => void handleAcceptPreview()}
        onClearReference={clearReference}
        onGenerate={() => void handleGeneratePreview()}
        onInstructionChange={setInstruction}
        onModelChange={setModel}
        onReject={() => void handleRejectPreview()}
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
            <Button tone="ghost" onClick={() => handleRightPanelSelect("ai")}>{t("panel.actions.openAi")}</Button>
          ) : null}
        </header>
        <div className="editor-scroll">
          <div ref={containerRef} className="editor-host" />
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
