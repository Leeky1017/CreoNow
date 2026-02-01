import { Text } from "../../components/primitives";

/**
 * DiffView renders a unified diff text block.
 *
 * Why: AI Apply must show a reviewable preview before mutating the editor SSOT.
 */
export function DiffView(props: { diffText: string }): JSX.Element {
  return (
    <div
      data-testid="ai-diff"
      className="border border-[var(--color-separator)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] p-2.5 overflow-auto"
    >
      <Text
        as="div"
        size="code"
        className="whitespace-pre-wrap break-words leading-[18px]"
      >
        {props.diffText}
      </Text>
    </div>
  );
}
