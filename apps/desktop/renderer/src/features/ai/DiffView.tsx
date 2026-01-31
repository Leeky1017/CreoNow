/**
 * DiffView renders a unified diff text block.
 *
 * Why: AI Apply must show a reviewable preview before mutating the editor SSOT.
 */
export function DiffView(props: { diffText: string }): JSX.Element {
  return (
    <div
      data-testid="ai-diff"
      style={{
        border: "1px solid var(--color-separator)",
        borderRadius: 8,
        background: "var(--color-bg-base)",
        padding: 10,
        overflow: "auto",
      }}
    >
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          lineHeight: "18px",
          color: "var(--color-fg-base)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {props.diffText}
      </pre>
    </div>
  );
}
