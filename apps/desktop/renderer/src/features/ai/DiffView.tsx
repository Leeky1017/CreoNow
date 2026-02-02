import { Text } from "../../components/primitives";

/**
 * Line type in a unified diff.
 */
type DiffLineType = "added" | "removed" | "context" | "header";

/**
 * Parse a unified diff text into typed lines.
 *
 * Why: We need to classify each line to apply the correct visual style.
 */
function parseDiffLines(diffText: string): Array<{ type: DiffLineType; content: string }> {
  if (!diffText) {
    return [];
  }

  return diffText.split("\n").map((line) => {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      return { type: "header" as const, content: line };
    }
    if (line.startsWith("+")) {
      return { type: "added" as const, content: line };
    }
    if (line.startsWith("-")) {
      return { type: "removed" as const, content: line };
    }
    return { type: "context" as const, content: line };
  });
}

/**
 * Style mapping for diff line types using design tokens.
 */
const lineStyles: Record<DiffLineType, string> = {
  added: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  removed: "bg-[var(--color-error-subtle)] text-[var(--color-error)] line-through",
  context: "text-[var(--color-fg-muted)]",
  header: "text-[var(--color-fg-subtle)] font-medium",
};

/**
 * DiffView renders a unified diff text block with syntax highlighting.
 *
 * Why: AI Apply must show a reviewable preview before mutating the editor SSOT.
 * Added lines are highlighted in green, removed lines in red with strikethrough.
 */
export function DiffView(props: { diffText: string }): JSX.Element {
  const lines = parseDiffLines(props.diffText);

  if (lines.length === 0) {
    return (
      <div
        data-testid="ai-diff"
        className="border border-[var(--color-separator)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] p-2.5"
      >
        <Text size="small" color="muted" className="text-center py-4">
          No changes to display
        </Text>
      </div>
    );
  }

  return (
    <div
      data-testid="ai-diff"
      className="border border-[var(--color-separator)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] overflow-auto max-h-[300px]"
    >
      <div className="font-[var(--font-family-mono)] text-[13px] leading-[20px]">
        {lines.map((line, index) => (
          <div
            key={index}
            className={`px-2.5 py-0.5 ${lineStyles[line.type]}`}
          >
            <span className="whitespace-pre-wrap break-words">
              {line.content || "\u00A0"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
