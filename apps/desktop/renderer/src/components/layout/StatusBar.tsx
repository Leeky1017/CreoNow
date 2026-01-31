import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { useEditorStore } from "../../stores/editorStore";

/**
 * StatusBar is the fixed 28px bottom bar. P0 keeps it minimal but stable for
 * layout E2E selectors.
 */
export function StatusBar(): JSX.Element {
  const autosaveStatus = useEditorStore((s) => s.autosaveStatus);
  const retryLastAutosave = useEditorStore((s) => s.retryLastAutosave);
  return (
    <div
      data-testid="layout-statusbar"
      style={{
        height: LAYOUT_DEFAULTS.statusBarHeight,
        background: "var(--color-bg-surface)",
        borderTop: "1px solid var(--color-separator)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontSize: 11,
        color: "var(--color-fg-muted)",
      }}
    >
      <span
        data-testid="editor-autosave-status"
        data-status={autosaveStatus}
        onClick={() => {
          if (autosaveStatus === "error") {
            void retryLastAutosave();
          }
        }}
        style={{
          cursor: autosaveStatus === "error" ? "pointer" : "default",
          textDecoration: autosaveStatus === "error" ? "underline" : "none",
        }}
      >
        {autosaveStatus}
      </span>
    </div>
  );
}
