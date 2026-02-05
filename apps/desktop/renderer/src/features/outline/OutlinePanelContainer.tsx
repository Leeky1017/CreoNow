import React from "react";
import { OutlinePanel } from "./OutlinePanel";
import {
  deriveOutline,
  findActiveOutlineItem,
  findHeadingPosition,
} from "./deriveOutline";
import { useEditorStore } from "../../stores/editorStore";

/**
 * Debounce helper to avoid excessive re-derivation on rapid editor updates.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * OutlinePanelContainer connects the OutlinePanel to the editorStore.
 *
 * Responsibilities:
 * - Derive outline items from the current editor document
 * - Track active item based on cursor position
 * - Handle navigation (scroll to heading in editor)
 * - Debounce updates for performance
 *
 * This container pattern keeps OutlinePanel pure and testable.
 */
export function OutlinePanelContainer(): JSX.Element {
  const editor = useEditorStore((s) => s.editor);
  const documentId = useEditorStore((s) => s.documentId);
  const bootstrapStatus = useEditorStore((s) => s.bootstrapStatus);

  // Track document content changes
  const [docJson, setDocJson] = React.useState<ReturnType<
    NonNullable<typeof editor>["getJSON"]
  > | null>(null);
  const [cursorPos, setCursorPos] = React.useState<number>(0);

  // Subscribe to editor updates
  React.useEffect(() => {
    if (!editor) {
      setDocJson(null);
      return;
    }

    // Initial state
    setDocJson(editor.getJSON());
    setCursorPos(editor.state.selection.anchor);

    // Listen for document changes
    const updateHandler = () => {
      setDocJson(editor.getJSON());
      setCursorPos(editor.state.selection.anchor);
    };

    editor.on("update", updateHandler);
    editor.on("selectionUpdate", updateHandler);

    return () => {
      editor.off("update", updateHandler);
      editor.off("selectionUpdate", updateHandler);
    };
  }, [editor]);

  // Reset on document change
  React.useEffect(() => {
    if (editor) {
      setDocJson(editor.getJSON());
      setCursorPos(editor.state.selection.anchor);
    }
  }, [documentId, editor]);

  // Debounce outline derivation for performance (50ms)
  const debouncedDocJson = useDebouncedValue(docJson, 50);

  // Derive outline items from document
  const outlineItems = React.useMemo(() => {
    return deriveOutline(debouncedDocJson);
  }, [debouncedDocJson]);

  // Find active item based on cursor position
  const activeId = React.useMemo(() => {
    return findActiveOutlineItem(debouncedDocJson, cursorPos);
  }, [debouncedDocJson, cursorPos]);

  /**
   * Navigate to a heading in the editor.
   *
   * Finds the heading position and sets the editor selection there,
   * which also scrolls the heading into view.
   */
  const handleNavigate = React.useCallback(
    (itemId: string) => {
      if (!editor || !debouncedDocJson) {
        return;
      }

      const position = findHeadingPosition(
        debouncedDocJson,
        outlineItems,
        itemId,
      );
      if (position === null) {
        return;
      }

      try {
        // Set selection to the heading position and focus editor
        // Add 1 to position to move cursor inside the heading
        const targetPos = Math.min(position + 1, editor.state.doc.content.size);
        editor.chain().focus().setTextSelection(targetPos).run();

        // Scroll the selection into view
        // TipTap's scrollIntoView is automatic with setTextSelection + focus
      } catch (err) {
        // Position calculation might be slightly off - log but don't crash
        console.warn("[OutlinePanelContainer] Navigation error:", err);
      }
    },
    [editor, debouncedDocJson, outlineItems],
  );

  // Show empty state if no editor or document
  if (bootstrapStatus !== "ready" || !editor) {
    return <OutlinePanel items={[]} activeId={null} onNavigate={() => {}} />;
  }

  return (
    <OutlinePanel
      items={outlineItems}
      activeId={activeId}
      onNavigate={handleNavigate}
      // Disable features that require IPC (rename/delete/reorder headings)
      // These would need IPC to persist changes to the document
      draggable={false}
    />
  );
}
