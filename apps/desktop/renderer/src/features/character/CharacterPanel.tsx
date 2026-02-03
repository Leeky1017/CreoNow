import React from "react";
import { CharacterCard } from "./CharacterCard";
import { CharacterDetailDialog } from "./CharacterDetailDialog";
import type { Character, CharacterGroup } from "./types";

export interface CharacterPanelProps {
  /** List of characters */
  characters: Character[];
  /** Currently selected character ID */
  selectedId?: string | null;
  /** Callback when a character is selected */
  onSelect?: (characterId: string) => void;
  /** Callback when a character is created */
  onCreate?: () => void;
  /** Callback when a character is updated */
  onUpdate?: (character: Character) => void;
  /** Callback when a character is deleted */
  onDelete?: (characterId: string) => void;
  /** Callback when navigating to a chapter */
  onNavigateToChapter?: (chapterId: string) => void;
  /** Panel width in pixels */
  width?: number;
}

/**
 * Group characters by their group property
 */
function groupCharacters(
  characters: Character[],
): Record<CharacterGroup, Character[]> {
  return characters.reduce(
    (acc, char) => {
      acc[char.group].push(char);
      return acc;
    },
    {
      main: [] as Character[],
      supporting: [] as Character[],
      others: [] as Character[],
    },
  );
}

/**
 * Group configuration for display
 */
const GROUP_CONFIG: Record<CharacterGroup, { label: string }> = {
  main: { label: "Main Characters" },
  supporting: { label: "Supporting" },
  others: { label: "Others" },
};

/**
 * Plus icon for add button
 */
function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Empty state for a group with no characters
 */
function EmptyGroupState({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full",
        "px-4",
        "py-8",
        "border",
        "border-dashed",
        "border-[var(--color-border-default)]",
        "rounded-[var(--radius-md)]",
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "gap-2",
        "text-[var(--color-fg-placeholder)]",
        "hover:text-[var(--color-fg-muted)]",
        "hover:border-[var(--color-border-hover)]",
        "hover:bg-[#111]",
        "cursor-pointer",
        "transition-all",
      ].join(" ")}
    >
      <span className="text-[11px]">No characters</span>
    </button>
  );
}

/**
 * Character group section
 */
function CharacterGroupSection({
  group,
  characters,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
}: {
  group: CharacterGroup;
  characters: Character[];
  selectedId?: string | null;
  onSelect?: (characterId: string) => void;
  onEdit?: (character: Character) => void;
  onDelete?: (characterId: string) => void;
  onCreate?: () => void;
}) {
  const config = GROUP_CONFIG[group];

  return (
    <div>
      {/* Group header */}
      <div className="px-2 mb-3 flex items-center justify-between group">
        <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-placeholder)] font-semibold">
          {config.label}
        </div>
        <span className="text-[10px] text-[var(--color-fg-placeholder)] group-hover:text-[var(--color-fg-muted)] transition-colors">
          {characters.length}
        </span>
      </div>

      {/* Character list */}
      <div className="space-y-1">
        {characters.length > 0 ? (
          characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              selected={selectedId === character.id}
              onClick={() => onSelect?.(character.id)}
              onEdit={() => onEdit?.(character)}
              onDelete={() => onDelete?.(character.id)}
            />
          ))
        ) : (
          <EmptyGroupState onClick={onCreate} />
        )}
      </div>
    </div>
  );
}

/**
 * CharacterPanel - A sidebar panel for managing story characters
 *
 * Features:
 * - Grouped character list (Main/Supporting/Others)
 * - Character cards with avatar, name, and role
 * - Selection state with detail dialog
 * - Add new character button
 * - Hover states with edit/delete actions
 *
 * @example
 * ```tsx
 * <CharacterPanel
 *   characters={characters}
 *   selectedId={selectedCharacterId}
 *   onSelect={setSelectedCharacterId}
 *   onUpdate={handleUpdateCharacter}
 *   onDelete={handleDeleteCharacter}
 * />
 * ```
 */
export function CharacterPanel({
  characters,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onNavigateToChapter,
  width = 300,
}: CharacterPanelProps): JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCharacter, setEditingCharacter] = React.useState<Character | null>(null);

  const grouped = groupCharacters(characters);

  const handleCharacterSelect = (characterId: string) => {
    onSelect?.(characterId);
    const character = characters.find((c) => c.id === characterId);
    if (character) {
      setEditingCharacter(character);
      setDialogOpen(true);
    }
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCharacter(null);
    }
  };

  return (
    <>
      <aside
        className="h-full flex flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shrink-0"
        style={{ width }}
        data-testid="character-panel"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border-default)] shrink-0">
          <span className="font-medium text-sm tracking-wide text-[var(--color-fg-default)]">
            CHARACTERS
          </span>
          <button
            type="button"
            onClick={onCreate}
            className={[
              "flex",
              "items-center",
              "justify-center",
              "w-7",
              "h-7",
              "hover:bg-[var(--color-bg-hover)]",
              "rounded",
              "text-[var(--color-fg-default)]",
              "transition-colors",
              "border",
              "border-transparent",
              "hover:border-[var(--color-border-hover)]",
            ].join(" ")}
            aria-label="Add new character"
          >
            <PlusIcon />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-8">
          <CharacterGroupSection
            group="main"
            characters={grouped.main}
            selectedId={selectedId}
            onSelect={handleCharacterSelect}
            onEdit={handleEdit}
            onDelete={onDelete}
            onCreate={onCreate}
          />
          <CharacterGroupSection
            group="supporting"
            characters={grouped.supporting}
            selectedId={selectedId}
            onSelect={handleCharacterSelect}
            onEdit={handleEdit}
            onDelete={onDelete}
            onCreate={onCreate}
          />
          <CharacterGroupSection
            group="others"
            characters={grouped.others}
            selectedId={selectedId}
            onSelect={handleCharacterSelect}
            onEdit={handleEdit}
            onDelete={onDelete}
            onCreate={onCreate}
          />
        </div>
      </aside>

      {/* Detail Dialog */}
      <CharacterDetailDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        character={editingCharacter}
        onSave={onUpdate}
        onDelete={onDelete}
        onNavigateToChapter={onNavigateToChapter}
        availableCharacters={characters}
      />
    </>
  );
}
