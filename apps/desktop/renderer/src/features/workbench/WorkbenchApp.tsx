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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { createEditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";
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
} from "@/features/workbench/runtime";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { getPreloadApi } from "@/lib/preloadApi";

const DEFAULT_MODEL = "gpt-4.1-mini";
const AUTOSAVE_DELAY_MS = 800;
const DEFAULT_SIDEBAR_WIDTH = 240;
const DEFAULT_RIGHT_PANEL_WIDTH = 320;
const MAX_REFERENCE_LENGTH = 120;

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

export function WorkbenchApp() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const suppressAutosaveRef = useRef(true);
  const projectRef = useRef<ProjectListItem | null>(null);
  const activeDocumentRef = useRef<DocumentRead | null>(null);
  const bootstrapStatusRef = useRef<BootstrapStatus>("loading");

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
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelId>("files");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelId>("ai");
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  useEffect(() => {
    bootstrapStatusRef.current = bootstrapStatus;
  }, [bootstrapStatus]);

  const clearReference = () => {
    setStickySelection(null);
  };

  const resetAiConversation = () => {
    setInstruction("");
    setPreview(null);
    setErrorMessage(null);
    clearReference();
  };

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
          setErrorMessage(null);
        },
        onDocumentChange: (content) => {
          const currentProject = projectRef.current;
          const currentDocument = activeDocumentRef.current;
          if (suppressAutosaveRef.current || currentProject === null || currentDocument === null) {
            return;
          }

          if (autosaveTimerRef.current !== null) {
            window.clearTimeout(autosaveTimerRef.current);
          }

          setSaveState("idle");
          autosaveTimerRef.current = window.setTimeout(async () => {
            setSaveState("saving");
            const result = await api.file.saveDocument({
              projectId: currentProject.projectId,
              documentId: currentDocument.documentId,
              actor: "auto",
              reason: "autosave",
              contentJson: JSON.stringify(content),
            });

            if (result.ok === false) {
              setSaveState("error");
              setErrorMessage(getHumanErrorMessage(result.error, t));
              return;
            }

            setSaveState("saved");
            setLastSavedAt(result.data.updatedAt);
          }, AUTOSAVE_DELAY_MS);
        },
      }),
    [api.file, t],
  );

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    editorBridge.mount(containerRef.current);
    editorBridge.focus();

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      editorBridge.destroy();
    };
  }, [editorBridge]);

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
        setBootstrapStatus("loading");
        setErrorMessage(null);
        const workspace = await bootstrapWorkspace(api, {
          defaultProjectName: t("project.defaultName"),
          defaultDocumentTitle: t("document.defaultTitle"),
        });
        if (disposed) {
          return;
        }

        suppressAutosaveRef.current = true;
        editorBridge.setContent(JSON.parse(workspace.activeDocument.contentJson));
        suppressAutosaveRef.current = false;
        setProject(workspace.project);
        setDocuments(workspace.documents);
        setActiveDocument(workspace.activeDocument);
        setLastSavedAt(workspace.activeDocument.updatedAt);
        setPreview(null);
        setStickySelection(null);
        setLiveSelection(null);
        setBootstrapStatus("ready");
      } catch (error) {
        if (disposed === false) {
          setErrorMessage(getHumanErrorMessage(error as Error, t));
          setBootstrapStatus("error");
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [api, editorBridge, t]);

  const handleCreateDocument = async () => {
    if (project === null) {
      return;
    }

    try {
      const result = await createDocumentAndOpen({
        api,
        projectId: project.projectId,
        defaultDocumentTitle: t("document.defaultTitle"),
      });
      suppressAutosaveRef.current = true;
      editorBridge.setContent(JSON.parse(result.activeDocument.contentJson));
      suppressAutosaveRef.current = false;
      setDocuments(result.documents);
      setActiveDocument(result.activeDocument);
      setPreview(null);
      setStickySelection(null);
      setLiveSelection(null);
      setLastSavedAt(result.activeDocument.updatedAt);
      setErrorMessage(null);
      setActiveLeftPanel("files");
      setSidebarCollapsed(false);
    } catch (error) {
      setErrorMessage(getHumanErrorMessage(error as Error, t));
    }
  };

  const handleOpenDocument = async (documentId: string) => {
    if (project === null) {
      return;
    }

    if (activeDocument !== null && documentId === activeDocument.documentId) {
      return;
    }

    try {
      const readDocument = await openDocument({
        api,
        projectId: project.projectId,
        documentId,
      });
      suppressAutosaveRef.current = true;
      editorBridge.setContent(JSON.parse(readDocument.contentJson));
      suppressAutosaveRef.current = false;
      setActiveDocument(readDocument);
      setPreview(null);
      setStickySelection(null);
      setLiveSelection(null);
      setErrorMessage(null);
      setLastSavedAt(readDocument.updatedAt);
      setActiveLeftPanel("files");
      setSidebarCollapsed(false);
    } catch (error) {
      setErrorMessage(getHumanErrorMessage(error as Error, t));
    }
  };

  const handleGeneratePreview = async () => {
    if (project === null || activeDocument === null || stickySelection === null) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const nextPreview = await requestAiPreview({
        api,
        projectId: project.projectId,
        documentId: activeDocument.documentId,
        selection: stickySelection,
        instruction,
        model,
      });
      setPreview(nextPreview);
      setStickySelection(null);
    } catch (error) {
      const normalizedError = error instanceof Error && error.message === "preview-unavailable"
        ? new Error(t("messages.previewUnavailable"))
        : (error as Error);
      setErrorMessage(getHumanErrorMessage(normalizedError, t));
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptPreview = async () => {
    if (project === null || activeDocument === null || preview === null) {
      return;
    }

    try {
      setBusy(true);
      await acceptAiPreview({
        api,
        bridge: editorBridge,
        projectId: project.projectId,
        documentId: activeDocument.documentId,
        preview,
      });
      setPreview(null);
      setErrorMessage(null);
      setSaveState("saved");
      setLastSavedAt(Date.now());
    } catch (error) {
      const normalizedError = error instanceof SelectionChangedError
        ? new Error(t("messages.selectionChanged"))
        : (error as Error);
      setErrorMessage(getHumanErrorMessage(normalizedError, t));
      setSaveState("error");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectPreview = async () => {
    if (preview === null) {
      return;
    }

    try {
      setBusy(true);
      await rejectAiPreview(api, preview);
      setPreview(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getHumanErrorMessage(error as Error, t));
    } finally {
      setBusy(false);
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
    "--left-sidebar-width": sidebarCollapsed ? "0px" : `${DEFAULT_SIDEBAR_WIDTH}px`,
    "--right-panel-width": rightPanelCollapsed ? "0px" : `${DEFAULT_RIGHT_PANEL_WIDTH}px`,
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
      return <section className="panel-surface" aria-label={t("tabs.info")}>
        <header className="panel-section">
          <div>
            <h2 className="panel-title">{t("tabs.info")}</h2>
            <p className="panel-subtitle">{t("panel.info.subtitle")}</p>
          </div>
        </header>
        <dl className="details-grid">
          <div className="details-row">
            <dt>{t("panel.info.project")}</dt>
            <dd>{project?.name ?? t("project.defaultName")}</dd>
          </div>
          <div className="details-row">
            <dt>{t("panel.info.document")}</dt>
            <dd>{activeDocument?.title ?? t("document.defaultTitle")}</dd>
          </div>
          <div className="details-row">
            <dt>{t("panel.info.wordCount")}</dt>
            <dd>{t("status.wordCount", { count: wordCount })}</dd>
          </div>
          <div className="details-row">
            <dt>{t("panel.info.updatedAt")}</dt>
            <dd>{formatTimestamp(lastSavedAt)}</dd>
          </div>
          <div className="details-row">
            <dt>{t("panel.info.status")}</dt>
            <dd>{saveLabel}</dd>
          </div>
        </dl>
      </section>;
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
    return <main className="workbench-shell workbench-shell--state">{t("bootstrap.loading")}</main>;
  }

  if (bootstrapStatus === "error") {
    return <main className="workbench-shell workbench-shell--state">
      <h1 className="screen-title">{t("bootstrap.errorTitle")}</h1>
      {errorMessage ? <p className="panel-error">{errorMessage}</p> : null}
      <Button tone="primary" onClick={() => window.location.reload()}>{t("actions.reload")}</Button>
    </main>;
  }

  return <main className="workbench-shell">
    <div className="workbench-frame" style={frameStyle}>
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

      {rightPanelCollapsed ? null : <aside className="right-panel" aria-label={t("panel.title")}>
        <div className="right-tabs">
          <div className="right-tabs__list" role="tablist" aria-label={t("panel.tabs")}>
            {(["ai", "info", "quality"] as RightPanelId[]).map((panelId) => (
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
      <Button className="status-bar__group status-bar__action" tone="ghost" onClick={() => setErrorMessage(null)}>
        {saveLabel}
      </Button>
      <span className="status-bar__group">{formatTimestamp(lastSavedAt)}</span>
    </footer>
  </main>;
}
