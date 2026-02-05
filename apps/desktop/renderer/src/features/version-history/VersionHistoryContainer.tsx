import React from "react";
import {
  VersionHistoryPanelContent,
  type TimeGroup,
  type VersionEntry,
  type VersionAuthorType,
} from "./VersionHistoryPanel";
import { useVersionCompare } from "./useVersionCompare";
import { useEditorStore } from "../../stores/editorStore";
import { invoke } from "../../lib/ipcClient";

type VersionListItem = {
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentHash: string;
  createdAt: number;
};

/**
 * Map backend actor to UI author type.
 */
function mapActorToAuthorType(actor: "user" | "auto" | "ai"): VersionAuthorType {
  switch (actor) {
    case "user":
      return "user";
    case "ai":
      return "ai";
    case "auto":
      return "auto-save";
    default:
      return "user";
  }
}

/**
 * Get display name for actor type.
 */
function getAuthorName(actor: "user" | "auto" | "ai"): string {
  switch (actor) {
    case "user":
      return "You";
    case "ai":
      return "AI";
    case "auto":
      return "Auto";
    default:
      return "Unknown";
  }
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(createdAt: number): string {
  const now = Date.now();
  const diff = now - createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    const date = new Date(createdAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const date = new Date(createdAt);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Get time group label for a timestamp.
 */
function getTimeGroupLabel(createdAt: number): string {
  const now = new Date();
  const date = new Date(createdAt);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return "Today";
  }
  if (isYesterday) {
    return "Yesterday";
  }
  return "Earlier";
}

/**
 * Get description for a version based on reason.
 */
function getDescription(reason: string): string {
  if (reason === "autosave") {
    return "自动保存";
  }
  if (reason === "manual-save") {
    return "手动保存";
  }
  if (reason === "restore") {
    return "恢复版本";
  }
  if (reason.startsWith("ai-apply:")) {
    return "AI 修改";
  }
  return reason || "版本快照";
}

/**
 * Convert backend version list to UI timeGroups format.
 */
function convertToTimeGroups(
  items: VersionListItem[],
  currentHash: string | null,
): TimeGroup[] {
  if (items.length === 0) {
    return [];
  }

  const groupMap = new Map<string, VersionEntry[]>();

  for (const item of items) {
    const label = getTimeGroupLabel(item.createdAt);
    const isCurrent = item.contentHash === currentHash;

    const entry: VersionEntry = {
      id: item.versionId,
      timestamp: formatTimestamp(item.createdAt),
      authorType: mapActorToAuthorType(item.actor),
      authorName: getAuthorName(item.actor),
      description: getDescription(item.reason),
      wordChange: { type: "none", count: 0 }, // TODO: calculate actual word diff
      isCurrent,
      reason: item.reason,
    };

    const existing = groupMap.get(label) ?? [];
    existing.push(entry);
    groupMap.set(label, existing);
  }

  // Sort groups: Today first, then Yesterday, then Earlier
  const order = ["Today", "Yesterday", "Earlier"];
  const groups: TimeGroup[] = [];

  for (const label of order) {
    const versions = groupMap.get(label);
    if (versions && versions.length > 0) {
      groups.push({ label, versions });
    }
  }

  return groups;
}

type VersionHistoryContainerProps = {
  projectId: string;
};

/**
 * Container component for VersionHistoryPanel.
 *
 * Manages:
 * - Fetching version list from backend
 * - Converting to timeGroups format
 * - Compare and restore actions
 */
export function VersionHistoryContainer(
  props: VersionHistoryContainerProps,
): JSX.Element {
  const documentId = useEditorStore((s) => s.documentId);
  const { startCompare } = useVersionCompare();

  const [items, setItems] = React.useState<VersionListItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [currentHash, setCurrentHash] = React.useState<string | null>(null);

  // Fetch version list when documentId changes
  React.useEffect(() => {
    if (!documentId) {
      setItems([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;

    async function fetchVersions(): Promise<void> {
      setStatus("loading");

      // Get current document hash
      const docRes = await invoke("file:document:read", {
        projectId: props.projectId,
        documentId: documentId!,
      });
      if (!cancelled && docRes.ok) {
        setCurrentHash(docRes.data.contentHash);
      }

      // Get version list
      const res = await invoke("version:list", { documentId: documentId! });
      if (cancelled) return;

      if (res.ok) {
        setItems(res.data.items);
        setStatus("ready");
      } else {
        setItems([]);
        setStatus("error");
      }
    }

    void fetchVersions();

    return () => {
      cancelled = true;
    };
  }, [documentId, props.projectId]);

  const timeGroups = React.useMemo(
    () => convertToTimeGroups(items, currentHash),
    [items, currentHash],
  );

  const handleCompare = React.useCallback(
    (versionId: string) => {
      if (!documentId) return;
      void startCompare(documentId, versionId);
    },
    [documentId, startCompare],
  );

  const handleRestore = React.useCallback(
    async (versionId: string) => {
      if (!documentId) return;

      // TODO: Show SystemDialog confirmation before restore
      // For now, call restore directly
      const res = await invoke("version:restore", { documentId, versionId });
      if (res.ok) {
        // Refresh version list
        const listRes = await invoke("version:list", { documentId });
        if (listRes.ok) {
          setItems(listRes.data.items);
        }
        // TODO: Refresh editor content
      }
    },
    [documentId],
  );

  const handlePreview = React.useCallback((versionId: string) => {
    // TODO: Implement preview (read-only view of version)
    console.log("Preview version:", versionId);
  }, []);

  if (!documentId) {
    return (
      <div className="p-3 text-xs text-[var(--color-fg-muted)]">
        Open a document to view history
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="p-3 text-xs text-[var(--color-fg-muted)]">
        Loading versions...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-3 text-xs text-[var(--color-error)]">
        Failed to load version history
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-3 text-xs text-[var(--color-fg-muted)]">
        No versions yet. Save your document to create versions.
      </div>
    );
  }

  return (
    <VersionHistoryPanelContent
      timeGroups={timeGroups}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCompare={handleCompare}
      onRestore={handleRestore}
      onPreview={handlePreview}
      showCloseButton={false}
    />
  );
}
