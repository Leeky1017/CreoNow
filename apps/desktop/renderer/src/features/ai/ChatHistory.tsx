import { Text } from "../../components/primitives";

type ChatHistoryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChat: (chatId: string) => void;
};

/**
 * ChatHistory renders a dropdown list of past conversations.
 *
 * Currently shows an empty state because chat persistence is not yet
 * implemented (P1 scope). When a chat store / IPC source becomes available,
 * this component will render grouped history items via ChatHistoryItemRow.
 */
export function ChatHistory(props: ChatHistoryProps): JSX.Element | null {
  if (!props.open) {
    return null;
  }

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        role="presentation"
        onClick={() => props.onOpenChange(false)}
        className="fixed inset-0 z-[var(--z-dropdown)]"
      />

      {/* Dropdown panel */}
      <div
        role="dialog"
        aria-label="Chat History"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-full right-0 mt-1 w-64 z-[var(--z-popover)] bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-[var(--color-separator)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              disabled
              className="flex-1 bg-transparent border-none text-[12px] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-muted)] focus:outline-none opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Empty state — chat persistence not yet available */}
        <div className="px-4 py-8 text-center">
          <Text size="tiny" color="muted">
            No conversation history yet.
          </Text>
          <Text size="tiny" color="muted" className="mt-1 block">
            Chat history will appear here once chat persistence is available.
          </Text>
        </div>
      </div>
    </>
  );
}
