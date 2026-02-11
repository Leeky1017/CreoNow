import React from "react";

import { useLayoutStore, LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { IconBar } from "./IconBar";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { Resizer } from "./Resizer";
import { CommandPalette } from "../../features/commandPalette/CommandPalette";
import type {
  CommandPaletteLayoutActions,
  CommandPaletteDialogActions,
  CommandPaletteDocumentActions,
} from "../../features/commandPalette/CommandPalette";
import { DashboardPage } from "../../features/dashboard";
import { DiffViewPanel } from "../../features/diff/DiffViewPanel";
import { EditorPane } from "../../features/editor/EditorPane";
import { WelcomeScreen } from "../../features/welcome/WelcomeScreen";
import { SettingsDialog } from "../../features/settings-dialog/SettingsDialog";
import { ExportDialog } from "../../features/export/ExportDialog";
import { CreateProjectDialog } from "../../features/projects/CreateProjectDialog";
import { ZenMode } from "../../features/zen-mode/ZenMode";
import { SystemDialog } from "../../components/features/AiDialogs/SystemDialog";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { RESTORE_VERSION_CONFIRM_COPY } from "../../features/version-history/restoreConfirmCopy";
import { useVersionCompare } from "../../features/version-history/useVersionCompare";
import { useProjectStore } from "../../stores/projectStore";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";
import { useAiStore } from "../../stores/aiStore";
import { useVersionPreferencesStore } from "../../stores/versionPreferencesStore";
import { applySelection } from "../../features/ai/applySelection";
import {
  applyHunkDecisions,
  computeDiffHunks,
  unifiedDiff,
  type DiffHunkDecision,
} from "../../lib/diff/unifiedDiff";
import { invoke } from "../../lib/ipcClient";

/**
 * Clamp a value between min/max bounds.
 */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Extract title and paragraphs from TipTap JSON content.
 *
 * Why: ZenMode needs document content in a simplified format (title + paragraphs).
 */
function extractZenModeContent(contentJson: string | null): {
  title: string;
  paragraphs: string[];
  wordCount: number;
} {
  if (!contentJson) {
    return { title: "Untitled", paragraphs: [], wordCount: 0 };
  }

  try {
    const doc = JSON.parse(contentJson) as {
      content?: Array<{
        type: string;
        attrs?: { level?: number };
        content?: Array<{ type: string; text?: string }>;
      }>;
    };

    let title = "Untitled";
    const paragraphs: string[] = [];
    let wordCount = 0;

    if (doc.content) {
      for (const node of doc.content) {
        const text =
          node.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("") ?? "";

        if (!text.trim()) continue;

        // First heading becomes title
        if (node.type === "heading" && title === "Untitled") {
          title = text;
          wordCount += text.split(/\s+/).filter(Boolean).length;
        } else if (node.type === "paragraph" || node.type === "heading") {
          paragraphs.push(text);
          wordCount += text.split(/\s+/).filter(Boolean).length;
        }
      }
    }

    return { title, paragraphs, wordCount };
  } catch {
    return { title: "Untitled", paragraphs: [], wordCount: 0 };
  }
}

/**
 * ZenModeOverlay - Connects ZenMode to editor state.
 *
 * Why: Separates overlay wiring from AppShell complexity; pulls content from
 * editorStore and autosaveStatus for the status bar.
 */
function ZenModeOverlay(props: {
  open: boolean;
  onExit: () => void;
}): JSX.Element | null {
  const editor = useEditorStore((s) => s.editor);
  const autosaveStatus = useEditorStore((s) => s.autosaveStatus);
  const documentContentJson = useEditorStore((s) => s.documentContentJson);

  // Get current time for status bar
  const [currentTime, setCurrentTime] = React.useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  React.useEffect(() => {
    if (!props.open) return;

    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [props.open]);

  // Extract content from editor or fallback to stored JSON
  const content = React.useMemo(() => {
    if (editor) {
      const json = JSON.stringify(editor.getJSON());
      return extractZenModeContent(json);
    }
    return extractZenModeContent(documentContentJson);
  }, [editor, documentContentJson]);

  // Map autosave status to display text
  const saveStatus = React.useMemo(() => {
    switch (autosaveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved";
      case "error":
        return "Save failed";
      default:
        return "Saved";
    }
  }, [autosaveStatus]);

  // Calculate read time (average 200 words per minute)
  const readTimeMinutes = Math.max(1, Math.ceil(content.wordCount / 200));

  return (
    <ZenMode
      open={props.open}
      onExit={props.onExit}
      content={{
        title: content.title,
        paragraphs: content.paragraphs,
        showCursor: true,
      }}
      stats={{
        wordCount: content.wordCount,
        saveStatus,
        readTimeMinutes,
      }}
      currentTime={currentTime}
    />
  );
}

/**
 * Compute maximum available sidebar width given current window width.
 *
 * Why: we must keep main content usable (min 400px) even on small windows.
 */
function computeSidebarMax(
  windowWidth: number,
  panelWidth: number,
  panelCollapsed: boolean,
): number {
  const panel = panelCollapsed ? 0 : panelWidth;
  const max =
    windowWidth -
    LAYOUT_DEFAULTS.iconBarWidth -
    panel -
    LAYOUT_DEFAULTS.mainMinWidth;
  return Math.max(
    LAYOUT_DEFAULTS.sidebar.min,
    Math.min(LAYOUT_DEFAULTS.sidebar.max, max),
  );
}

/**
 * Compute maximum available panel width given current window width.
 */
function computePanelMax(
  windowWidth: number,
  sidebarWidth: number,
  sidebarCollapsed: boolean,
): number {
  const sidebar = sidebarCollapsed ? 0 : sidebarWidth;
  const max =
    windowWidth -
    LAYOUT_DEFAULTS.iconBarWidth -
    sidebar -
    LAYOUT_DEFAULTS.mainMinWidth;
  return Math.max(
    LAYOUT_DEFAULTS.panel.min,
    Math.min(LAYOUT_DEFAULTS.panel.max, max),
  );
}

/**
 * AppShell renders the Workbench three-column layout (IconBar + Sidebar + Main
 * + RightPanel) and wires resizing, persistence, and P0 keyboard shortcuts.
 */
export function AppShell(): JSX.Element {
  const currentProject = useProjectStore((s) => s.current);
  const currentProjectId = currentProject?.projectId ?? null;
  const projectItems = useProjectStore((s) => s.items);
  const bootstrapStatus = useProjectStore((s) => s.bootstrapStatus);
  const bootstrapProjects = useProjectStore((s) => s.bootstrap);
  const bootstrapFiles = useFileStore((s) => s.bootstrapForProject);
  const bootstrapEditor = useEditorStore((s) => s.bootstrapForProject);
  const editor = useEditorStore((s) => s.editor);
  const compareMode = useEditorStore((s) => s.compareMode);
  const compareVersionId = useEditorStore((s) => s.compareVersionId);
  const documentId = useEditorStore((s) => s.documentId);
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const panelWidth = useLayoutStore((s) => s.panelWidth);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const panelCollapsed = useLayoutStore((s) => s.panelCollapsed);
  const zenMode = useLayoutStore((s) => s.zenMode);
  const activeLeftPanel = useLayoutStore((s) => s.activeLeftPanel);

  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const setPanelWidth = useLayoutStore((s) => s.setPanelWidth);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const setPanelCollapsed = useLayoutStore((s) => s.setPanelCollapsed);
  const setZenMode = useLayoutStore((s) => s.setZenMode);
  const setActiveLeftPanel = useLayoutStore((s) => s.setActiveLeftPanel);
  const resetSidebarWidth = useLayoutStore((s) => s.resetSidebarWidth);
  const resetPanelWidth = useLayoutStore((s) => s.resetPanelWidth);
  const setCompareMode = useEditorStore((s) => s.setCompareMode);

  const aiProposal = useAiStore((s) => s.proposal);
  const setAiProposal = useAiStore((s) => s.setProposal);
  const setAiSelectionSnapshot = useAiStore((s) => s.setSelectionSnapshot);
  const persistAiApply = useAiStore((s) => s.persistAiApply);
  const setAiError = useAiStore((s) => s.setError);
  const logAiApplyConflict = useAiStore((s) => s.logAiApplyConflict);
  const showAiMarks = useVersionPreferencesStore((s) => s.showAiMarks);

  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  // Counter to force CommandPalette remount on each open (ensures fresh state)
  const [commandPaletteKey, setCommandPaletteKey] = React.useState(0);
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] =
    React.useState(false);
  const lastMountedEditorRef = React.useRef<typeof editor>(null);

  // File store for creating documents
  const createDocument = useFileStore((s) => s.createAndSetCurrent);
  const setCurrentDocument = useFileStore((s) => s.setCurrent);
  const openEditorDocument = useEditorStore((s) => s.openDocument);

  // Version compare hook
  const { compareState, closeCompare } = useVersionCompare();
  const { confirm, dialogProps } = useConfirmDialog();
  const [aiHunkDecisions, setAiHunkDecisions] = React.useState<
    DiffHunkDecision[]
  >([]);

  const aiDiffText = React.useMemo(() => {
    if (!aiProposal) {
      return "";
    }
    return unifiedDiff({
      oldText: aiProposal.selectionText,
      newText: aiProposal.replacementText,
    });
  }, [aiProposal]);

  const aiHunks = React.useMemo(() => {
    if (!aiProposal) {
      return [];
    }
    return computeDiffHunks({
      oldText: aiProposal.selectionText,
      newText: aiProposal.replacementText,
    });
  }, [aiProposal]);

  React.useEffect(() => {
    if (editor) {
      lastMountedEditorRef.current = editor;
    }
  }, [editor]);

  React.useEffect(() => {
    if (!compareMode || compareVersionId) {
      if (aiHunkDecisions.length > 0) {
        setAiHunkDecisions([]);
      }
      return;
    }
    if (!aiProposal) {
      setCompareMode(false);
      return;
    }
    setAiHunkDecisions((prev) =>
      prev.length === aiHunks.length
        ? prev
        : Array.from({ length: aiHunks.length }, () => "pending"),
    );
  }, [
    aiHunkDecisions.length,
    aiHunks.length,
    aiProposal,
    compareMode,
    compareVersionId,
    setCompareMode,
  ]);

  const handleRejectAiSuggestion = React.useCallback(() => {
    setAiProposal(null);
    setAiSelectionSnapshot(null);
    setAiHunkDecisions([]);
    setCompareMode(false);
  }, [setAiProposal, setAiSelectionSnapshot, setCompareMode]);

  const handleAcceptAiSuggestion = React.useCallback(async () => {
    const effectiveEditor = editor ?? lastMountedEditorRef.current;
    if (!effectiveEditor || !documentId || !currentProjectId || !aiProposal) {
      return;
    }

    const normalizedDecisions = aiHunks.map((_, idx) => {
      const decision = aiHunkDecisions[idx] ?? "pending";
      return decision === "rejected" ? "rejected" : "accepted";
    });
    const replacementText = applyHunkDecisions({
      oldText: aiProposal.selectionText,
      newText: aiProposal.replacementText,
      decisions: normalizedDecisions,
    });

    const applied = applySelection({
      editor: effectiveEditor,
      selectionRef: aiProposal.selectionRef,
      replacementText,
    });
    if (!applied.ok) {
      setAiError(applied.error);
      if (applied.error.code === "CONFLICT") {
        await logAiApplyConflict({ documentId, runId: aiProposal.runId });
      }
      return;
    }

    await persistAiApply({
      projectId: currentProjectId,
      documentId,
      contentJson: JSON.stringify(effectiveEditor.getJSON()),
      runId: aiProposal.runId,
    });
    setCompareMode(false);
    setAiHunkDecisions([]);
  }, [
    aiHunkDecisions,
    aiHunks,
    aiProposal,
    currentProjectId,
    documentId,
    editor,
    logAiApplyConflict,
    persistAiApply,
    setAiError,
    setCompareMode,
  ]);

  const openVersionHistoryPanel = React.useCallback(() => {
    setActiveLeftPanel("versionHistory");
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [setActiveLeftPanel, setSidebarCollapsed, sidebarCollapsed]);

  const openVersionHistoryForDocument = React.useCallback(
    (documentId: string) => {
      if (!currentProjectId) {
        openVersionHistoryPanel();
        return;
      }

      void (async () => {
        await setCurrentDocument({ projectId: currentProjectId, documentId });
        await openEditorDocument({ projectId: currentProjectId, documentId });
      })();

      openVersionHistoryPanel();
    },
    [
      currentProjectId,
      openEditorDocument,
      openVersionHistoryPanel,
      setCurrentDocument,
    ],
  );

  // Bootstrap projects on mount
  React.useEffect(() => {
    if (bootstrapStatus === "idle") {
      void bootstrapProjects();
    }
  }, [bootstrapProjects, bootstrapStatus]);

  // Bootstrap files/editor when a project is selected
  React.useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    void (async () => {
      await bootstrapFiles(currentProjectId);
      await bootstrapEditor(currentProjectId);
    })();
  }, [bootstrapEditor, bootstrapFiles, currentProjectId]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // F11: Toggle Zen Mode
      if (e.key === "F11") {
        e.preventDefault();
        setZenMode(!zenMode);
        return;
      }

      // ESC in zen mode: Exit zen mode
      if (zenMode && e.key === "Escape") {
        e.preventDefault();
        setZenMode(false);
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }

      // Cmd/Ctrl+P: Command Palette
      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteKey((k) => k + 1); // Force remount for fresh state
        setCommandPaletteOpen(true);
        return;
      }

      // Cmd/Ctrl+\: Toggle Sidebar (NOT Cmd+B per DESIGN_DECISIONS.md)
      if (e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
        return;
      }

      // Cmd/Ctrl+L: Toggle Right Panel
      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        setPanelCollapsed(!panelCollapsed);
        return;
      }

      // Cmd/Ctrl+,: Open Settings
      if (e.key === ",") {
        e.preventDefault();
        setSettingsDialogOpen(true);
        return;
      }

      // Cmd/Ctrl+Shift+N: Create New Project
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCreateProjectDialogOpen(true);
        return;
      }

      // Cmd/Ctrl+N: Create New Document (only if project is open)
      if (e.key.toLowerCase() === "n" && !e.shiftKey && currentProjectId) {
        e.preventDefault();
        void createDocument({ projectId: currentProjectId });
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    createDocument,
    currentProjectId,
    panelCollapsed,
    setPanelCollapsed,
    setSidebarCollapsed,
    setZenMode,
    sidebarCollapsed,
    zenMode,
  ]);

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : sidebarWidth;
  const effectivePanelWidth = panelCollapsed ? 0 : panelWidth;

  // Callbacks for CommandPalette
  const layoutActions = React.useMemo<CommandPaletteLayoutActions>(
    () => ({
      onToggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      onToggleRightPanel: () => setPanelCollapsed(!panelCollapsed),
      onToggleZenMode: () => setZenMode(!zenMode),
      onOpenVersionHistory: openVersionHistoryPanel,
    }),
    [
      openVersionHistoryPanel,
      panelCollapsed,
      setPanelCollapsed,
      setSidebarCollapsed,
      setZenMode,
      sidebarCollapsed,
      zenMode,
    ],
  );

  const dialogActionCallbacks = React.useMemo<CommandPaletteDialogActions>(
    () => ({
      onOpenSettings: () => setSettingsDialogOpen(true),
      onOpenExport: () => setExportDialogOpen(true),
      onOpenCreateProject: () => setCreateProjectDialogOpen(true),
    }),
    [],
  );

  const documentActionCallbacks =
    React.useMemo<CommandPaletteDocumentActions>(() => {
      return {
        onCreateDocument: async () => {
          if (!currentProjectId) {
            throw new Error("No project selected");
          }
          const res = await createDocument({ projectId: currentProjectId });
          if (!res.ok) {
            throw new Error(`${res.error.code}: ${res.error.message}`);
          }
        },
      };
    }, [createDocument, currentProjectId]);

  /**
   * Determine which main content to render based on project state.
   *
   * Why: Different views for no projects, dashboard, and editor states.
   */
  function renderMainContent(): JSX.Element {
    // No projects at all - show welcome/create project screen
    if (projectItems.length === 0 && bootstrapStatus === "ready") {
      return <WelcomeScreen />;
    }

    // Projects exist but no current project - show dashboard
    if (!currentProject) {
      return <DashboardPage />;
    }

    // Current project in compare mode
    if (compareMode) {
      if (!compareVersionId && aiProposal) {
        return (
          <>
            <DiffViewPanel
              key={`ai-${aiProposal.runId}`}
              diffText={aiDiffText}
              mode="ai"
              onClose={handleRejectAiSuggestion}
              onRejectAll={handleRejectAiSuggestion}
              onAcceptAll={() => void handleAcceptAiSuggestion()}
              onAcceptHunk={(hunkIndex) =>
                setAiHunkDecisions((prev) =>
                  prev.map((item, idx) =>
                    idx === hunkIndex ? "accepted" : item,
                  ),
                )
              }
              onRejectHunk={(hunkIndex) =>
                setAiHunkDecisions((prev) =>
                  prev.map((item, idx) =>
                    idx === hunkIndex ? "rejected" : item,
                  ),
                )
              }
              hunkDecisions={aiHunkDecisions}
            />
            <SystemDialog {...dialogProps} />
          </>
        );
      }

      const handleRestore = async (): Promise<void> => {
        if (!documentId || !compareVersionId) return;

        const confirmed = await confirm(RESTORE_VERSION_CONFIRM_COPY);
        if (!confirmed) {
          return;
        }

        const res = await invoke("version:snapshot:rollback", {
          documentId,
          versionId: compareVersionId,
        });
        if (res.ok) {
          closeCompare();
          // Re-bootstrap editor to load restored content
          await bootstrapEditor(currentProject.projectId);
        }
      };

      return (
        <>
          <DiffViewPanel
            key={compareVersionId ?? "compare"}
            diffText={compareState.diffText}
            onClose={closeCompare}
            onRestore={() => void handleRestore()}
            restoreInProgress={compareState.status === "loading"}
            lineUnderlineStyle={
              showAiMarks
                ? compareState.aiMarked
                  ? "dashed"
                  : "solid"
                : "none"
            }
          />
          <SystemDialog {...dialogProps} />
        </>
      );
    }

    // Normal editor
    return <EditorPane projectId={currentProject.projectId} />;
  }

  return (
    <div
      data-testid="app-shell"
      className="flex h-full bg-[var(--color-bg-base)]"
    >
      <IconBar
        onOpenSettings={() => setSettingsDialogOpen(true)}
        settingsOpen={settingsDialogOpen}
      />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 min-w-0">
          <Sidebar
            width={effectiveSidebarWidth}
            collapsed={sidebarCollapsed}
            projectId={currentProjectId}
            activePanel={activeLeftPanel}
            onOpenVersionHistoryDocument={openVersionHistoryForDocument}
          />

          {!sidebarCollapsed ? (
            <Resizer
              testId="resize-handle-sidebar"
              onDrag={(deltaX, startWidth) => {
                const nextRaw = startWidth + deltaX;
                const max = computeSidebarMax(
                  window.innerWidth,
                  panelWidth,
                  panelCollapsed,
                );
                return clamp(nextRaw, LAYOUT_DEFAULTS.sidebar.min, max);
              }}
              onCommit={(nextWidth) => setSidebarWidth(nextWidth)}
              onDoubleClick={() => resetSidebarWidth()}
              getStartWidth={() => sidebarWidth}
            />
          ) : null}

          <main
            className={`flex flex-1 bg-[var(--color-bg-base)] text-[var(--color-fg-muted)] text-[13px] ${
              currentProject
                ? "items-stretch justify-stretch"
                : projectItems.length > 0
                  ? "items-stretch justify-stretch"
                  : "items-center justify-center"
            }`}
            style={{ minWidth: LAYOUT_DEFAULTS.mainMinWidth }}
          >
            {renderMainContent()}
          </main>

          {!panelCollapsed ? (
            <Resizer
              testId="resize-handle-panel"
              onDrag={(deltaX, startWidth) => {
                const nextRaw = startWidth - deltaX;
                const max = computePanelMax(
                  window.innerWidth,
                  sidebarWidth,
                  sidebarCollapsed,
                );
                return clamp(nextRaw, LAYOUT_DEFAULTS.panel.min, max);
              }}
              onCommit={(nextWidth) => setPanelWidth(nextWidth)}
              onDoubleClick={() => resetPanelWidth()}
              getStartWidth={() => panelWidth}
            />
          ) : null}

          <RightPanel
            width={effectivePanelWidth}
            collapsed={panelCollapsed}
            onOpenSettings={() => setSettingsDialogOpen(true)}
            onOpenVersionHistory={openVersionHistoryPanel}
          />
        </div>

        <StatusBar />
      </div>

      <CommandPalette
        key={commandPaletteKey}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        layoutActions={layoutActions}
        dialogActions={dialogActionCallbacks}
        documentActions={documentActionCallbacks}
      />

      {/* Dialogs */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        projectId={currentProjectId}
        documentId={documentId}
        documentTitle="Current Document"
      />

      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
      />

      {/* Zen Mode Overlay */}
      <ZenModeOverlay open={zenMode} onExit={() => setZenMode(false)} />
      {!compareMode ? <SystemDialog {...dialogProps} /> : null}
    </div>
  );
}
