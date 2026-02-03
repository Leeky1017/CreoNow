/**
 * Hook for comparing versions
 *
 * TODO: When `version:diff` or `version:read` IPC is available, this should
 * fetch actual version content from the backend. For now, it provides a
 * placeholder implementation.
 */

import { useCallback, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { unifiedDiff } from "../../lib/diff/unifiedDiff";

export type CompareState = {
  status: "idle" | "loading" | "ready" | "error";
  diffText: string;
  error?: string;
};

/**
 * Hook to manage version comparison state and trigger compare mode.
 *
 * Usage:
 * ```tsx
 * const { compareState, startCompare, closeCompare } = useVersionCompare();
 *
 * // In VersionHistoryPanel:
 * onCompare={(versionId) => startCompare(versionId)}
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

  const [compareState, setCompareState] = useState<CompareState>({
    status: "idle",
    diffText: "",
  });

  /**
   * Start comparing a version against the current document.
   *
   * TODO: Implement proper version:read IPC to fetch historical content.
   * For now, generates a placeholder diff showing the comparison is active.
   */
  const startCompare = useCallback(
    async (versionId: string) => {
      setCompareState({ status: "loading", diffText: "" });
      setCompareMode(true, versionId);

      try {
        // Get current editor content as the "after" version
        const currentText = editor?.getText() ?? "";

        // TODO: Fetch historical version content via version:read IPC
        // For now, use a placeholder that demonstrates the diff is working
        const historicalText = `[版本 ${versionId} 的内容将在 version:read IPC 实现后显示]

当前功能状态：
- ✓ Compare 模式已激活
- ✓ DiffView 面板已显示
- ⏳ 等待 version:read IPC 实现

点击 Close 返回编辑器。`;

        // Generate unified diff
        const diffText = unifiedDiff({
          oldText: historicalText,
          newText: currentText || "[当前文档为空]",
        });

        setCompareState({
          status: "ready",
          diffText: diffText || "No differences found.",
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
  };
}
