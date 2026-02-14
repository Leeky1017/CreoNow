export interface SlashCommandCandidate {
  id: string;
  title: string;
  description: string;
  keywords: string[];
}

export const DEFAULT_SLASH_COMMAND_CANDIDATES: SlashCommandCandidate[] = [
  {
    id: "outline",
    title: "Insert Outline Block",
    description: "Framework placeholder candidate for outline templates.",
    keywords: ["outline", "structure", "章节"],
  },
  {
    id: "summary",
    title: "Insert Summary Block",
    description: "Framework placeholder candidate for summary templates.",
    keywords: ["summary", "recap", "总结"],
  },
  {
    id: "note",
    title: "Insert Note Block",
    description: "Framework placeholder candidate for notes.",
    keywords: ["note", "memo", "备注"],
  },
];

export function filterSlashCommandCandidates(
  candidates: SlashCommandCandidate[],
  query: string,
): SlashCommandCandidate[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    if (candidate.title.toLowerCase().includes(normalized)) {
      return true;
    }
    if (candidate.description.toLowerCase().includes(normalized)) {
      return true;
    }
    return candidate.keywords.some((keyword) =>
      keyword.toLowerCase().includes(normalized),
    );
  });
}

interface SlashCommandPanelProps {
  open: boolean;
  query: string;
  candidates: SlashCommandCandidate[];
  onQueryChange: (query: string) => void;
  onRequestClose: () => void;
}

export function SlashCommandPanel(
  props: SlashCommandPanelProps,
): JSX.Element | null {
  if (!props.open) {
    return null;
  }

  const filteredCandidates = filterSlashCommandCandidates(
    props.candidates,
    props.query,
  );

  return (
    <div
      data-testid="slash-command-panel"
      className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-raised)] px-3 py-2"
    >
      <input
        data-testid="slash-command-search-input"
        type="text"
        value={props.query}
        placeholder="Search slash commands..."
        onChange={(event) => props.onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") {
            return;
          }
          event.preventDefault();
          props.onRequestClose();
        }}
        className="mb-2 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm text-[var(--color-fg-default)] outline-none"
      />

      {filteredCandidates.length === 0 ? (
        <div
          data-testid="slash-command-empty-state"
          className="rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] px-2 py-2 text-sm text-[var(--color-fg-muted)]"
        >
          No commands found.
        </div>
      ) : (
        <ul className="space-y-1">
          {filteredCandidates.map((candidate) => (
            <li
              key={candidate.id}
              data-testid={`slash-command-item-${candidate.id}`}
              className="rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] px-2 py-2"
            >
              <p className="text-sm text-[var(--color-fg-default)]">
                {candidate.title}
              </p>
              <p className="text-xs text-[var(--color-fg-muted)]">
                {candidate.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
