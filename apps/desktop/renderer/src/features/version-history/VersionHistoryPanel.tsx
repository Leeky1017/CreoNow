import { Brain, Clock, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import type { PreloadApi } from "@/lib/preloadApi";
import type { IpcResponseData } from "@shared/types/ipc-generated";

export type SnapshotListItem = IpcResponseData<"version:snapshot:list">["items"][number];
export type SnapshotDetail = IpcResponseData<"version:snapshot:read">;

export interface VersionHistoryPanelProps {
  documentId: string;
  projectId: string;
  versionApi: PreloadApi["version"];
  /** The versionId currently being previewed in the main editor (lifted to parent). */
  activePreviewVersionId: string | null;
  /** Parent calls this when user clicks "预览" — panel has fetched the full snapshot detail. */
  onPreviewVersion: (snapshot: SnapshotDetail) => void;
}

type PanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "idle"; items: SnapshotListItem[] }
  | { kind: "loading-snapshot"; items: SnapshotListItem[]; targetVersionId: string };

function formatTimestamp(ms: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

function ActorIcon({ actor }: { actor: "user" | "auto" | "ai" }) {
  if (actor === "ai") {
    return <Brain size={14} className="version-actor-icon version-actor-icon--ai" aria-hidden="true" />;
  }
  if (actor === "auto") {
    return <Clock size={14} className="version-actor-icon version-actor-icon--auto" aria-hidden="true" />;
  }
  return <User size={14} className="version-actor-icon version-actor-icon--user" aria-hidden="true" />;
}

function WordCountDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="version-word-delta version-word-delta--neutral">±0</span>;
  }
  if (delta > 0) {
    return <span className="version-word-delta version-word-delta--added" aria-label={`+${delta}`}>+{delta}</span>;
  }
  if (delta < 0) {
    return <span className="version-word-delta version-word-delta--removed" aria-label={String(delta)}>{delta}</span>;
  }
  return <span className="version-word-delta version-word-delta--neutral">±0</span>;
}

/**
 * Computes word-count deltas for a time-descending list of snapshots.
 * delta[i] = items[i].wordCount - items[i+1].wordCount  (items[i+1] is the older snapshot).
 * The oldest item (last position) gets delta=null (no predecessor in list to compare).
 */
function computeWordCountDeltas(items: SnapshotListItem[]): (number | null)[] {
  return items.map((item, i) => {
    if (i === items.length - 1) {
      return null;
    }
    return item.wordCount - items[i + 1].wordCount;
  });
}

export function VersionHistoryPanel({
  documentId,
  projectId,
  versionApi,
  activePreviewVersionId,
  onPreviewVersion,
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

  const handlePreviewClick = async (versionId: string) => {
    const items = state.kind === "idle" || state.kind === "loading-snapshot" ? state.items : [];
    setState({ kind: "loading-snapshot", items, targetVersionId: versionId });
    const result = await versionApi.readSnapshot({ documentId, projectId, versionId });
    if (!result.ok) {
      setState({ kind: "idle", items });
      return;
    }
    setState({ kind: "idle", items });
    onPreviewVersion(result.data);
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
  const loadingSnapshotId = state.kind === "loading-snapshot" ? state.targetVersionId : null;
  const wordCountDeltas = computeWordCountDeltas(items);

  return (
    <section className="version-history-panel" aria-label={t("sidebar.versionHistory.title")}>
      <div className="panel-section">
        <h2 className="panel-title">{t("sidebar.versionHistory.title")}</h2>
        <p className="panel-subtitle">{t("sidebar.versionHistory.subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <p className="panel-meta">{t("versionHistory.empty")}</p>
      ) : (
        <ul className="version-timeline" aria-label={t("sidebar.versionHistory.title")}>
          {items.map((item, index) => {
            const isActivePreviewing = item.versionId === activePreviewVersionId;
            const isLoading = item.versionId === loadingSnapshotId;
            const delta = wordCountDeltas[index] ?? null;
            return (
              <li
                key={item.versionId}
                className={
                  isActivePreviewing
                    ? "version-timeline-item version-timeline-item--active"
                    : "version-timeline-item"
                }
                aria-current={isActivePreviewing ? "true" : undefined}
              >
                <div className="version-item-header">
                  <span className="version-item-actor" title={t(`versionHistory.actor.${item.actor}`)}>
                    <ActorIcon actor={item.actor} />
                    <span className="version-item-actor-label">{t(`versionHistory.actor.${item.actor}`)}</span>
                  </span>
                  <span className="version-item-time">{formatTimestamp(item.createdAt)}</span>
                </div>
                <div className="version-item-meta">
                  <span className="version-item-reason">{t(`versionHistory.reason.${item.reason}`)}</span>
                  <span className="version-item-words">{t("versionHistory.wordCount", { count: item.wordCount })}</span>
                  <WordCountDelta delta={delta} />
                </div>
                <Button
                  tone="ghost"
                  className="version-item-preview-btn"
                  onClick={() => void handlePreviewClick(item.versionId)}
                  disabled={isLoading}
                  aria-label={t("versionHistory.previewAriaLabel", { time: formatTimestamp(item.createdAt) })}
                >
                  {isLoading ? t("versionHistory.loadingSnapshot") : t("versionHistory.preview")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
