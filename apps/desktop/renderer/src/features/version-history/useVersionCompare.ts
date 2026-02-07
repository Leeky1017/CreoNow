/**
 * Hook for comparing versions using real version:snapshot:read IPC.
 */

import { useCallback, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { unifiedDiff } from "../../lib/diff/unifiedDiff";
import { invoke } from "../../lib/ipcClient";

export type CompareState = {
  status: "idle" | "loading" | "ready" | "error";
  diffText: string;
  error?: string;
  /** The historical version's text content for display */
  historicalText?: string;
  /** The current document's text content for display */
  currentText?: string;
};

/**
 * Hook to manage version comparison state and trigger compare mode.
 *
 * Uses version:snapshot:read IPC to fetch actual historical version content
 * and generates a unified diff against the current editor content.
 *
 * Usage:
 * ```tsx
 * const { compareState, startCompare, closeCompare } = useVersionCompare();
 *
 * // In VersionHistoryPanel:
 * onCompare={(versionId) => startCompare(documentId, versionId)}
 *
 * // In AppShell when compareMode is true:
 * <DiffViewPanel
 *   diffText={compareState.diffText}
 *   onClose={closeCompare}
 * />
 * ```
 */
export function useVersionCompare() {
  const setCompareMode = useEditorStore((s) => s.setCompareMode);
  const editor = useEditorStore((s) => s.editor);
  const documentId = useEditorStore((s) => s.documentId);

  const [compareState, setCompareState] = useState<CompareState>({
    status: "idle",
    diffText: "",
  });

  /**
   * Start comparing a version against the current document.
   *
   * Fetches the historical version content via version:snapshot:read IPC,
   * then generates a unified diff against the current editor content.
   */
  const startCompare = useCallback(
    async (docId: string, versionId: string) => {
      setCompareState({ status: "loading", diffText: "" });
      setCompareMode(true, versionId);

      try {
        // Get current editor content as the "after" version
        const currentText = editor?.getText() ?? "";

        // Fetch historical version content via version:snapshot:read IPC
        const res = await invoke("version:snapshot:read", {
          documentId: docId,
          versionId,
        });

        if (!res.ok) {
          setCompareState({
            status: "error",
            diffText: "",
            error: `${res.error.code}: ${res.error.message}`,
          });
          return;
        }

        const historicalText = res.data.contentText;

        // Generate unified diff
        const diffText = unifiedDiff({
          oldText: historicalText,
          newText: currentText || "",
          oldLabel: `版本 (${new Date(res.data.createdAt).toLocaleString()})`,
          newLabel: "当前",
        });

        setCompareState({
          status: "ready",
          diffText: diffText || "No differences found.",
          historicalText,
          currentText,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setCompareState({
          status: "error",
          diffText: "",
          error: message,
        });
      }
    },
    [editor, setCompareMode],
  );

  /**
   * Close compare mode and return to the editor.
   */
  const closeCompare = useCallback(() => {
    setCompareMode(false);
    setCompareState({ status: "idle", diffText: "" });
  }, [setCompareMode]);

  return {
    compareState,
    startCompare,
    closeCompare,
    documentId,
  };
}
