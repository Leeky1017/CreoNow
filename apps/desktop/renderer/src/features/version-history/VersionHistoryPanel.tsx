import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import type { PreloadApi } from "@/lib/preloadApi";
import type { IpcResponseData } from "@shared/types/ipc-generated";

type SnapshotListItem = IpcResponseData<"version:snapshot:list">["items"][number];
type SnapshotDetail = IpcResponseData<"version:snapshot:read">;

export interface VersionHistoryPanelProps {
  documentId: string;
  projectId: string;
  versionApi: PreloadApi["version"];
  onRestored: () => void;
}

type PanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "idle"; items: SnapshotListItem[] }
  | { kind: "previewing"; items: SnapshotListItem[]; selected: SnapshotDetail; busy: boolean };

function formatTimestamp(ms: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

export function VersionHistoryPanel({
  documentId,
  projectId,
  versionApi,
  onRestored,
}: VersionHistoryPanelProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<PanelState>({ kind: "loading" });

  // Load snapshots on first render
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    setLoaded(true);
    void (async () => {
      const result = await versionApi.listSnapshots({ documentId, projectId });
      if (!result.ok) {
        setState({ kind: "error", message: t("versionHistory.errorLoading") });
        return;
      }
      setState({ kind: "idle", items: result.data.items });
    })();
  }

  const handlePreview = async (versionId: string) => {
    const items = state.kind === "idle" || state.kind === "previewing" ? state.items : [];
    const result = await versionApi.readSnapshot({ documentId, projectId, versionId });
    if (!result.ok) {
      return;
    }
    setState({ kind: "previewing", items, selected: result.data, busy: false });
  };

  const handleBackToCurrent = () => {
    if (state.kind !== "previewing") {
      return;
    }
    setState({ kind: "idle", items: state.items });
  };

  const handleRestore = async () => {
    if (state.kind !== "previewing") {
      return;
    }
    setState({ ...state, busy: true });
    const result = await versionApi.restoreSnapshot({
      documentId,
      projectId,
      versionId: state.selected.versionId,
    });
    if (result.ok) {
      setState({ kind: "idle", items: state.items });
      onRestored();
    } else {
      setState({ ...state, busy: false });
    }
  };

  const handleRollback = async () => {
    if (state.kind !== "previewing") {
      return;
    }
    setState({ ...state, busy: true });
    const result = await versionApi.rollbackSnapshot({
      documentId,
      projectId,
      versionId: state.selected.versionId,
    });
    if (result.ok) {
      setState({ kind: "idle", items: state.items });
      onRestored();
    } else {
      setState({ ...state, busy: false });
    }
  };

  if (state.kind === "loading") {
    return (
      <section className="version-history-panel" aria-label={t("sidebar.versionHistory.title")}>
        <p className="panel-meta">{t("versionHistory.loading")}</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="version-history-panel" aria-label={t("sidebar.versionHistory.title")}>
        <p role="alert" className="panel-meta panel-meta--error">{state.message}</p>
      </section>
    );
  }

  const items = state.items;
  const previewing = state.kind === "previewing" ? state : null;

  return (
    <section className="version-history-panel" aria-label={t("sidebar.versionHistory.title")}>
      <div className="panel-section">
        <h2 className="panel-title">{t("sidebar.versionHistory.title")}</h2>
        <p className="panel-subtitle">{t("sidebar.versionHistory.subtitle")}</p>
      </div>

      {previewing !== null && (
        <section className="version-history-preview" aria-label={t("versionHistory.previewLabel")}>
          <div className="preview-meta panel-section">
            <p className="panel-meta">{t(`versionHistory.reason.${previewing.selected.reason}`)}</p>
            <p className="panel-meta">{formatTimestamp(previewing.selected.createdAt)}</p>
            <p className="panel-meta">{t("versionHistory.wordCount", { count: previewing.selected.wordCount })}</p>
          </div>
          <pre className="version-preview-text">{previewing.selected.contentText}</pre>
          <div className="preview-actions">
            <Button tone="ghost" onClick={handleBackToCurrent} disabled={previewing.busy}>
              {t("versionHistory.backToCurrent")}
            </Button>
            <Button tone="secondary" onClick={() => void handleRestore()} disabled={previewing.busy}>
              {t("versionHistory.restore")}
            </Button>
            <Button tone="primary" onClick={() => void handleRollback()} disabled={previewing.busy}>
              {t("versionHistory.rollback")}
            </Button>
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <p className="panel-meta">{t("versionHistory.empty")}</p>
      ) : (
        <ul className="version-timeline" aria-label={t("sidebar.versionHistory.title")}>
          {items.map((item) => (
            <li key={item.versionId} className="version-timeline-item">
              <div className="version-item-meta">
                <span className="version-item-reason">{t(`versionHistory.reason.${item.reason}`)}</span>
                <span className="version-item-actor">{t(`versionHistory.actor.${item.actor}`)}</span>
                <span className="version-item-time">{formatTimestamp(item.createdAt)}</span>
                <span className="version-item-words">{t("versionHistory.wordCount", { count: item.wordCount })}</span>
              </div>
              <Button
                tone="ghost"
                className="version-item-preview"
                onClick={() => void handlePreview(item.versionId)}
              >
                {t("versionHistory.preview")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
