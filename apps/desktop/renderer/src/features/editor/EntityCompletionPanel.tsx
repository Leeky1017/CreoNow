import type { EntityCompletionSession } from "../../stores/editorStore";

type EntityCompletionPanelProps = {
  session: EntityCompletionSession;
  onSelectCandidate: (index: number) => void;
};

export function EntityCompletionPanel(
  props: EntityCompletionPanelProps,
): JSX.Element | null {
  const { session } = props;

  if (!session.open) {
    return null;
  }

  return (
    <div
      data-testid="entity-completion-panel"
      role="listbox"
      aria-label="Entity completion candidates"
      className="min-w-[240px] rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-raised)] p-1 shadow-[var(--shadow-lg)]"
      style={{
        position: "fixed",
        top: `${session.anchorTop}px`,
        left: `${session.anchorLeft}px`,
        zIndex: "var(--z-dropdown)",
      }}
    >
      {session.status === "loading" ? (
        <div
          className="px-2 py-1 text-xs text-[var(--color-fg-muted)]"
          data-testid="entity-completion-loading-state"
        >
          Loading entities...
        </div>
      ) : null}

      {session.status === "ready" ? (
        <ul className="space-y-1">
          {session.candidates.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                type="button"
                role="option"
                aria-selected={session.selectedIndex === index}
                data-testid={`entity-completion-item-${index}`}
                className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)]"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => props.onSelectCandidate(index)}
              >
                <span>{candidate.name}</span>
                <span className="ml-2 text-xs text-[var(--color-fg-muted)]">
                  {candidate.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {session.status === "empty" ? (
        <div
          className="px-2 py-1 text-xs text-[var(--color-fg-muted)]"
          data-testid="entity-completion-empty-state"
        >
          No matching entities.
        </div>
      ) : null}

      {session.status === "error" ? (
        <div
          className="px-2 py-1 text-xs text-[var(--color-status-error)]"
          data-testid="entity-completion-error-state"
        >
          {session.message ?? "Entity suggestions unavailable."}
        </div>
      ) : null}
    </div>
  );
}
