import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
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

type BootstrapStatus = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

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

export function WorkbenchApp() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const suppressAutosaveRef = useRef(true);
  const projectRef = useRef<ProjectListItem | null>(null);
  const activeDocumentRef = useRef<DocumentRead | null>(null);

  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("loading");
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRead | null>(null);
  const [selection, setSelection] = useState<SelectionRef | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  const editorBridge = useMemo(
    () =>
      createEditorBridge({
        onSelectionChange: (nextSelection) => {
          setSelection(nextSelection);
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
      setLastSavedAt(result.activeDocument.updatedAt);
      setErrorMessage(null);
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
      setErrorMessage(null);
      setLastSavedAt(readDocument.updatedAt);
    } catch (error) {
      setErrorMessage(getHumanErrorMessage(error as Error, t));
    }
  };

  const handleGeneratePreview = async () => {
    if (project === null || activeDocument === null || selection === null) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const nextPreview = await requestAiPreview({
        api,
        projectId: project.projectId,
        documentId: activeDocument.documentId,
        selection,
        instruction,
        model,
      });
      setPreview(nextPreview);
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

  const saveLabel =
    saveState === "saving"
      ? t("status.saving")
      : saveState === "saved"
        ? t("status.saved")
        : saveState === "error"
          ? t("status.error")
          : t("status.ready");

  const wordCount = editorBridge.getTextContent().trim().length;

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
    <div className="workbench-frame">
      <aside className="icon-rail" aria-label={t("app.title")}>
        <Button className="rail-button rail-button--active" tone="ghost" aria-label={t("sidebar.documents")}>
          <FileText size={16} />
        </Button>
        <Button className="rail-button" tone="ghost" aria-label={t("tabs.ai")}>
          <Sparkles size={16} />
        </Button>
      </aside>

      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="screen-title">{project?.name ?? t("project.defaultName")}</h1>
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
      </aside>

      <section className="editor-column">
        <header className="editor-header">
          <h2 className="screen-title">{activeDocument?.title ?? t("document.defaultTitle")}</h2>
          <p className="panel-meta">{t("editor.selectionHint")}</p>
        </header>
        <div className="editor-scroll">
          <div ref={containerRef} className="editor-host" />
        </div>
      </section>

      <aside className="right-panel">
        <div className="right-tabs">
          <span className="right-tab right-tab--active">{t("tabs.ai")}</span>
          <span className="right-tab">{t("tabs.info")}</span>
        </div>
        <AiPreviewSurface
          busy={busy}
          errorMessage={errorMessage}
          instruction={instruction}
          model={model}
          onAccept={() => void handleAcceptPreview()}
          onGenerate={() => void handleGeneratePreview()}
          onInstructionChange={setInstruction}
          onModelChange={setModel}
          onReject={() => void handleRejectPreview()}
          preview={preview}
          selection={selection}
        />
      </aside>
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
