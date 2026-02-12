import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { useEditorStore } from "../../stores/editorStore";

/**
 * StatusBar is the fixed 28px bottom bar. P0 keeps it minimal but stable for
 * layout E2E selectors.
 *
 * Design spec §5.4: Status bar height is 28px.
 */
export function StatusBar(): JSX.Element {
  const autosaveStatus = useEditorStore((s) => s.autosaveStatus);
  const capacityWarning = useEditorStore((s) => s.capacityWarning);
  const retryLastAutosave = useEditorStore((s) => s.retryLastAutosave);

  const isError = autosaveStatus === "error";

  return (
    <div
      data-testid="layout-statusbar"
      className="flex items-center px-3 text-[11px] text-[var(--color-fg-muted)] bg-[var(--color-bg-surface)] border-t border-[var(--color-separator)]"
      style={{ height: LAYOUT_DEFAULTS.statusBarHeight }}
    >
      <span
        data-testid="editor-autosave-status"
        data-status={autosaveStatus}
        onClick={() => {
          if (isError) {
            void retryLastAutosave();
          }
        }}
        className={isError ? "cursor-pointer underline" : "cursor-default"}
      >
        {autosaveStatus}
      </span>
      {capacityWarning ? (
        <span
          data-testid="editor-capacity-warning"
          className="ml-3 text-[var(--color-warning)]"
          role="status"
        >
          {capacityWarning}
        </span>
      ) : null}
    </div>
  );
}
