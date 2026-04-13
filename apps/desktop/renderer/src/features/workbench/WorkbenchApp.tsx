import {
  Brain,
  Calendar,
  ChevronLeft,
  FolderTree,
  History,
  Layers,
  LayoutDashboard,
  ListTree,
  Maximize2,
  Minimize2,
  Network,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { createEditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";
import type { VersionHistorySnapshotDetail } from "@/features/version-history/types";
import { useVersionHistoryController } from "@/features/version-history/useVersionHistoryController";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";
import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";
import {
  bootstrapWorkspace,
  createDocumentAndOpen,
  openDocument,
  type AiPreview,
  type DocumentListItem,
  type DocumentRead,
  type ProjectListItem,
  type WorkbenchContextToken,
} from "@/features/workbench/runtime";
import { AppToastProvider, useAppToast } from "@/lib/appToast";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { GlobalErrorToastBridge } from "@/lib/globalErrorToastBridge";
import { getPreloadApi } from "@/lib/preloadApi";
import { useExportProgress } from "@/lib/useExportProgress";

import {
  BlockedAutosaveError,
  useAutosaveController,
  useAiSkillController,
  usePanelLayout,
  LEFT_SIDEBAR_BOUNDS,
  RIGHT_PANEL_BOUNDS,
  RIGHT_PANEL_IDS,
  type AutosaveToastEvent,
  type LeftPanelId,
} from "./hooks";

const MAX_REFERENCE_LENGTH = 120;

type BootstrapStatus = "loading" | "ready" | "error";

type VersionPreviewState = {
  currentContentJson: string;
  snapshot: VersionHistorySnapshotDetail;
};

/** @why 20px matches golden design source icon size (figma_design/layout.tsx line 150). */
const ICON_SIZE = 20;

const LEFT_PANEL_ITEMS: Array<{
  icon: typeof FolderTree;
  id: LeftPanelId;
  labelKey: string;
  placement: "top" | "bottom";
}> = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "iconBar.dashboard", placement: "top" },
  { id: "files", icon: FolderTree, labelKey: "iconBar.files", placement: "top" },
  { id: "search", icon: Search, labelKey: "iconBar.search", placement: "top" },
  { id: "calendar", icon: Calendar, labelKey: "iconBar.calendar", placement: "top" },
  { id: "outline", icon: ListTree, labelKey: "iconBar.outline", placement: "top" },
  { id: "scenarios", icon: Layers, labelKey: "iconBar.scenarios", placement: "top" },
  { id: "versionHistory", icon: History, labelKey: "iconBar.versionHistory", placement: "top" },
  { id: "memory", icon: Brain, labelKey: "iconBar.memory", placement: "top" },
  { id: "characters", icon: Users, labelKey: "iconBar.characters", placement: "top" },
  { id: "knowledgeGraph", icon: Network, labelKey: "iconBar.knowledgeGraph", placement: "top" },
  { id: "settings", icon: Settings, labelKey: "iconBar.settings", placement: "bottom" },
];

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
  const userEditRevisionRef = useRef(0);
  const editorContextRevisionRef = useRef(0);
  const activeContextTokenRef = useRef<WorkbenchContextToken | null>(null);
  const bootstrapStatusRef = useRef<BootstrapStatus>("loading");

  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("loading");
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRead | null>(null);
  const [liveSelection, setLiveSelection] = useState<SelectionRef | null>(null);
  const [stickySelection, setStickySelection] = useState<SelectionRef | null>(null);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [versionPreviewState, setVersionPreviewState] = useState<VersionPreviewState | null>(null);
  const [restoreDialogSnapshot, setRestoreDialogSnapshot] = useState<VersionHistorySnapshotDetail | null>(null);

  const autosave = useAutosaveController({ api, activeContextTokenRef, userEditRevisionRef });
  const layout = usePanelLayout();

  useEffect(() => {
    bootstrapStatusRef.current = bootstrapStatus;
  }, [bootstrapStatus]);

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
          autosave.clearAcceptSaveFailure();
          autosave.setWorkbenchError(null, null);
        },
        onDocumentChange: autosave.scheduleAutosave,
      }),
    [autosave.clearAcceptSaveFailure, autosave.setWorkbenchError, autosave.scheduleAutosave],
  );

  const aiSkill = useAiSkillController({
    api,
    activeContextTokenRef,
    editorBridge,
    autosave,
    stickySelection,
    setStickySelection,
    setPreview,
    preview,
    userEditRevisionRef,
    editorContextRevisionRef,
  });

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
    enabled: layout.activeLeftPanel === "versionHistory" && layout.sidebarCollapsed === false,
  });
  const versionPreviewSnapshot = versionPreviewState?.snapshot ?? null;
  const isVersionPreviewActive = versionPreviewSnapshot !== null;

  const replaceEditorContextContent = useCallback((nextContext: {
    contentJson: string;
    documentId: string;
    projectId: string;
  }) => {
    autosave.clearPendingAutosaveTimer();
    autosave.pendingAutosaveDraftRef.current = null;
    autosave.clearSavedStateDecayTimer();
    autosave.clearAutosaveController();
    autosave.clearAcceptSaveFailure();
    editorContextRevisionRef.current += 1;
    activeContextTokenRef.current = {
      documentId: nextContext.documentId,
      projectId: nextContext.projectId,
      revision: editorContextRevisionRef.current,
    };
    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    autosave.runWithoutAutosave(() => {
      editorBridge.setEditable(true);
      editorBridge.setContent(JSON.parse(nextContext.contentJson));
    });
  }, [
    autosave.clearPendingAutosaveTimer,
    autosave.pendingAutosaveDraftRef,
    autosave.clearSavedStateDecayTimer,
    autosave.clearAutosaveController,
    autosave.clearAcceptSaveFailure,
    autosave.runWithoutAutosave,
    editorBridge,
  ]);

  const startVersionPreview = useCallback((snapshot: VersionHistorySnapshotDetail) => {
    autosave.setWorkbenchError(null, null);
    setRestoreDialogSnapshot(null);
    setVersionPreviewState((currentPreview) => ({
      currentContentJson: currentPreview?.currentContentJson ?? JSON.stringify(editorBridge.getContent()),
      snapshot,
    }));
    autosave.runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(snapshot.contentJson));
      editorBridge.setEditable(false);
    });
  }, [autosave.setWorkbenchError, autosave.runWithoutAutosave, editorBridge]);

  const handleReturnToCurrentVersion = useCallback(() => {
    if (versionPreviewState === null) {
      return;
    }

    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    autosave.runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(versionPreviewState.currentContentJson));
      editorBridge.setEditable(true);
    });
  }, [autosave.runWithoutAutosave, editorBridge, versionPreviewState]);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    editorBridge.mount(containerRef.current);
    editorBridge.focus();

    return () => {
      autosave.clearPendingAutosaveTimer();
      autosave.clearSavedStateDecayTimer();
      editorBridge.destroy();
    };
  }, [autosave.clearPendingAutosaveTimer, autosave.clearSavedStateDecayTimer, editorBridge]);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      try {
        autosave.clearPendingAutosaveTimer();
        autosave.clearSavedStateDecayTimer();
        setBootstrapStatus("loading");
        autosave.setWorkbenchError(null, null);
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
        autosave.setSaveUiState("idle");
        autosave.setLastSavedAt(workspace.activeDocument.updatedAt);
        setPreview(null);
        setStickySelection(null);
        setLiveSelection(null);
        setBootstrapStatus("ready");
      } catch (error) {
        if (disposed === false) {
          autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
          setBootstrapStatus("error");
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [api, autosave.clearPendingAutosaveTimer, autosave.clearSavedStateDecayTimer, autosave.setWorkbenchError, autosave.setSaveUiState, autosave.setLastSavedAt, replaceEditorContextContent, t]);

  const handleCreateDocument = async () => {
    if (project === null) {
      return;
    }

    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      await autosave.flushDirtyDraftBeforeContextSwitch();
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
      autosave.setSaveUiState("idle");
      autosave.setLastSavedAt(result.activeDocument.updatedAt);
      autosave.setWorkbenchError(null, null);
      layout.setActiveLeftPanel("files");
      layout.setSidebarCollapsed(false);
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
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

    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      await autosave.flushDirtyDraftBeforeContextSwitch();
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
      autosave.setWorkbenchError(null, null);
      autosave.setSaveUiState("idle");
      autosave.setLastSavedAt(readDocument.updatedAt);
      layout.setActiveLeftPanel("files");
      layout.setSidebarCollapsed(false);
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
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
    autosave.setSaveUiState("idle");
    autosave.setLastSavedAt(readDocument.data.updatedAt);
    return readDocument.data;
  }, [activeDocument, api.file, autosave.setSaveUiState, autosave.setLastSavedAt, replaceEditorContextContent]);

  const handleVersionHistoryRestore = useCallback(async () => {
    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      autosave.setWorkbenchError(null, null);
      setRestoreDialogSnapshot(null);
      await autosave.flushDirtyDraftBeforeContextSwitch();
      const result = await versionHistory.restoreSelected();
      if (result === null) {
        return;
      }
      await refreshActiveDocumentFromDisk();
      await versionHistory.refresh();
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
      }
    }
  }, [
    aiSkill.reserveBusyOperation,
    aiSkill.setBusy,
    aiSkill.isLatestBusyOperation,
    autosave.setWorkbenchError,
    autosave.flushDirtyDraftBeforeContextSwitch,
    refreshActiveDocumentFromDisk,
    t,
    versionHistory,
  ]);

  const handleRequestVersionRestore = useCallback(() => {
    if (versionHistory.selectedSnapshot === null) {
      return;
    }

    setRestoreDialogSnapshot(versionHistory.selectedSnapshot);
  }, [versionHistory.selectedSnapshot]);

  const clearReference = () => {
    setStickySelection(null);
  };

  const handleStatusBarAction = () => {
    if (autosave.saveState !== "error") {
      return;
    }

    if (autosave.saveErrorSourceRef.current === "autosave") {
      autosave.retryLastAutosave();
      return;
    }

    if (autosave.saveErrorSourceRef.current === "accept") {
      aiSkill.retryLastAcceptSave();
    }
  };

  const saveLabel =
    autosave.saveState === "saving"
      ? t("status.saving")
      : autosave.saveState === "saved"
        ? t("status.saved")
        : autosave.saveState === "error"
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
    () => aiSkill.activeSkill === "builtin:continue" ? editorBridge.getCursorContext() : null,
    [aiSkill.activeSkill, liveSelection, editorBridge],
  );
  const continueReady = (cursorContext?.precedingText.trim().length ?? 0) > 0;
  const instructionHint = aiSkill.activeSkill === "builtin:continue"
    ? continueReady
      ? t("panel.ai.continueContextLength", { count: cursorContext?.precedingText.length ?? 0 })
      : t("messages.continueContextEmpty")
    : selectionHint;
  const frameStyle = {
    "--left-resizer-width": (layout.zenMode || layout.sidebarCollapsed) ? "0px" : "8px",
    "--left-sidebar-width": (layout.zenMode || layout.sidebarCollapsed) ? "0px" : `${layout.sidebarWidth}px`,
    "--right-panel-width": (layout.zenMode || layout.rightPanelCollapsed) ? "0px" : `${layout.rightPanelWidth}px`,
    "--right-resizer-width": (layout.zenMode || layout.rightPanelCollapsed) ? "0px" : "8px",
    "--icon-rail-width": layout.zenMode ? "0px" : "48px",
  } as CSSProperties;

  const previewBannerLabel = versionPreviewSnapshot === null
    ? null
    : t("versionHistory.previewingVersion", {
        timestamp: formatTimestamp(versionPreviewSnapshot.createdAt),
      });

  const renderSidebarContent = () => {
    if (layout.activeLeftPanel === "files") {
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

    if (layout.activeLeftPanel === "versionHistory") {
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

    if (layout.activeLeftPanel === "settings") {
      return <SettingsPage />;
    }

    const surfaceKey = `sidebar.${layout.activeLeftPanel}`;
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
    if (layout.activeRightPanel === "ai") {
      return <AiPreviewSurface
        activeSkill={aiSkill.activeSkill}
        busy={aiSkill.busy || isVersionPreviewActive}
        errorMessage={autosave.errorMessage}
        generateDisabled={aiSkill.activeSkill === "builtin:continue" ? continueReady === false : stickySelection === null}
        instruction={aiSkill.instruction}
        instructionHint={instructionHint}
        model={aiSkill.model}
        onAccept={() => void aiSkill.handleAcceptPreview()}
        onClearReference={clearReference}
        onGenerate={() => void aiSkill.handleGeneratePreview()}
        onInstructionChange={aiSkill.setInstruction}
        onModelChange={aiSkill.setModel}
        onReject={() => void aiSkill.handleRejectPreview()}
        onSkillChange={aiSkill.selectAiSkill}
        preview={preview}
        reference={stickySelection}
      />;
    }

    if (layout.activeRightPanel === "info") {
      return <InfoPanelSurface
        documentTitle={activeDocument?.title ?? null}
        errorMessage={autosave.errorMessage}
        loading={bootstrapStatus !== "ready"}
        projectName={project?.name ?? null}
        statusLabel={saveLabel}
        updatedAt={formatTimestamp(autosave.lastSavedAt)}
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
      <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">{t("bootstrap.loading")}</main>
    </>;
  }

  if (bootstrapStatus === "error") {
    return <>
      <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">
        <h1 className="screen-title">{t("bootstrap.errorTitle")}</h1>
        {autosave.errorMessage ? <p className="panel-error">{autosave.errorMessage}</p> : null}
        <Button tone="primary" onClick={() => window.location.reload()}>{t("actions.reload")}</Button>
      </main>
    </>;
  }

  return <>
    <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
    <main className="workbench-shell">
    <div
      className={[
        "workbench-frame",
        layout.dragState !== null && "workbench-frame--resizing",
        layout.zenMode && "workbench-frame--zen",
      ].filter(Boolean).join(" ")}
      data-testid="workbench-frame"
      data-export-active={exportProgress.isExporting ? "true" : undefined}
      style={frameStyle}
    >
      {/* @why Zen mode uses hidden+inert instead of unmounting (F-01 R3) to
          preserve component state (e.g. SettingsPage draft edits).
          • `hidden` is the PRIMARY mechanism — it removes elements from visual
            flow and is fully supported in all browsers and React versions.
          • `inert` is a FORWARD-COMPATIBLE annotation that will work properly
            in React 19+ (preventing keyboard/focus interaction). On React 18
            (including 18.3.1), the boolean `inert` attribute is NOT properly
            forwarded to the DOM — React warns about an unrecognised prop and
            omits it entirely. Therefore `hidden` alone provides the effective
            behaviour today.
          • When upgrading to React 19, `inert` will be natively supported and
            the `hidden` fallback can be reconsidered.
          Remove this note after upgrading to React 19. */}
      <aside className="icon-rail" hidden={layout.zenMode} inert={layout.zenMode || undefined} aria-label={t("app.title")}>
        <div className="icon-rail__group">
          {LEFT_PANEL_ITEMS.filter((item) => item.placement === "top").map((item) => {
            const Icon = item.icon;
            return <Button
              key={item.id}
              className={layout.activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
              tone="ghost"
              aria-label={t(item.labelKey)}
              aria-pressed={layout.activeLeftPanel === item.id && layout.sidebarCollapsed === false}
              onClick={() => layout.handleLeftPanelSelect(item.id)}
            >
              <Icon size={ICON_SIZE} />
              <span className="rail-button__tooltip">{t(item.labelKey)}</span>
            </Button>;
          })}
        </div>
        <div className="icon-rail__group icon-rail__group--bottom">
          {LEFT_PANEL_ITEMS.filter((item) => item.placement === "bottom").map((item) => {
            const Icon = item.icon;
            return <Button
              key={item.id}
              className={layout.activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
              tone="ghost"
              aria-label={t(item.labelKey)}
              aria-pressed={layout.activeLeftPanel === item.id && layout.sidebarCollapsed === false}
              onClick={() => layout.handleLeftPanelSelect(item.id)}
            >
              <Icon size={ICON_SIZE} />
              <span className="rail-button__tooltip">{t(item.labelKey)}</span>
            </Button>;
          })}
        </div>
      </aside>

      {layout.sidebarCollapsed ? null : <aside className="sidebar" hidden={layout.zenMode} inert={layout.zenMode || undefined} aria-label={t("sidebar.title")}>
        {renderSidebarContent()}
      </aside>}

      {layout.sidebarCollapsed ? null : <div
        className={layout.dragState?.panel === "left" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        hidden={layout.zenMode}
        inert={layout.zenMode || undefined}
        role="separator"
        aria-label={t("sidebar.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => layout.setSidebarWidth(LEFT_SIDEBAR_BOUNDS.defaultWidth)}
        onMouseDown={layout.startResize("left")}
      />}

      <section className="editor-column">
        <header className="editor-header">
          <div>
            <h2 className="screen-title">{activeDocument?.title ?? t("document.defaultTitle")}</h2>
            <p className="panel-meta">{selectionHint}</p>
          </div>
          <div className="editor-header__actions">
            <Button
              tone="ghost"
              className="zen-toggle"
              aria-label={layout.zenMode ? t("zenMode.exit") : t("zenMode.enter")}
              aria-pressed={layout.zenMode}
              onClick={layout.toggleZenMode}
              title={`${layout.zenMode ? t("zenMode.exit") : t("zenMode.enter")} (Shift+Z)`}
            >
              {layout.zenMode ? <Minimize2 size={ICON_SIZE} /> : <Maximize2 size={ICON_SIZE} />}
            </Button>
            {layout.rightPanelCollapsed ? (
              <Button tone="ghost" disabled={isVersionPreviewActive} onClick={() => layout.handleRightPanelSelect("ai")}>{t("panel.actions.openAi")}</Button>
            ) : null}
          </div>
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

      {layout.rightPanelCollapsed ? null : <div
        className={layout.dragState?.panel === "right" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        hidden={layout.zenMode}
        inert={layout.zenMode || undefined}
        role="separator"
        aria-label={t("panel.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => layout.setRightPanelWidth(RIGHT_PANEL_BOUNDS.defaultWidth)}
        onMouseDown={layout.startResize("right")}
      />}

      {layout.rightPanelCollapsed ? null : <aside className="right-panel" hidden={layout.zenMode} inert={layout.zenMode || undefined} aria-label={t("panel.title")}>
        <div className="right-tabs">
          <div className="right-tabs__list" role="tablist" aria-label={t("panel.tabs")}>
            {RIGHT_PANEL_IDS.map((panelId) => (
              <Button
                key={panelId}
                tone="ghost"
                role="tab"
                className={layout.activeRightPanel === panelId ? "right-tab right-tab--active" : "right-tab"}
                aria-selected={layout.activeRightPanel === panelId}
                onClick={() => layout.handleRightPanelSelect(panelId)}
              >
                {t(`tabs.${panelId}`)}
              </Button>
            ))}
          </div>
          <div className="right-tabs__actions">
            {layout.activeRightPanel === "ai" ? <>
              <Button tone="ghost" className="right-action" onClick={() => undefined}>{t("panel.ai.history")}</Button>
              <Button tone="ghost" className="right-action" onClick={aiSkill.resetAiConversation}>{t("panel.ai.newChat")}</Button>
            </> : null}
            <Button tone="ghost" className="right-action" aria-label={t("panel.actions.collapse")} onClick={layout.handleToggleRightPanel}>
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

    <footer className="status-bar" hidden={layout.zenMode} inert={layout.zenMode || undefined}>
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
      <span className="status-bar__group">{formatTimestamp(autosave.lastSavedAt)}</span>
    </footer>
    </main>
  </>;
}
