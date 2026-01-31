/**
 * CommandPalette is a minimal placeholder surface opened by Cmd/Ctrl+P.
 */
export function CommandPalette(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  if (!props.open) {
    return null;
  }

  return (
    <div className="cn-overlay" onClick={() => props.onOpenChange(false)}>
      <div
        data-testid="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "90vw",
          background: "var(--color-bg-raised)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          color: "var(--color-fg-default)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Command Palette (placeholder)
        </div>
      </div>
    </div>
  );
}
