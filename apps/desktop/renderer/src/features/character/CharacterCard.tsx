import React from "react";
import { Avatar } from "../../components/primitives";
import type { Character, CharacterRole } from "./types";
import { ROLE_DISPLAY } from "./types";

export interface CharacterCardProps {
  /** Character data */
  character: Character;
  /** Whether this character is selected */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
}

/**
 * Get role color class
 */
function getRoleColorClass(role: CharacterRole): string {
  return ROLE_DISPLAY[role]?.color ?? "text-[var(--color-fg-muted)]";
}

/**
 * Edit icon SVG
 */
function EditIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/**
 * Delete icon SVG
 */
function DeleteIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * CharacterCard - A list item for displaying a character in the sidebar
 *
 * Features:
 * - Avatar with fallback to initials
 * - Role badge with color coding
 * - Hover state with edit/delete actions
 * - Selected state with left border indicator
 *
 * @example
 * ```tsx
 * <CharacterCard
 *   character={elara}
 *   selected={selectedId === elara.id}
 *   onClick={() => setSelectedId(elara.id)}
 *   onEdit={() => openEditDialog(elara)}
 *   onDelete={() => confirmDelete(elara)}
 * />
 * ```
 */
export function CharacterCard({
  character,
  selected = false,
  onClick,
  onEdit,
  onDelete,
}: CharacterCardProps): JSX.Element {
  const roleLabel = ROLE_DISPLAY[character.role]?.label ?? character.role;
  const roleColorClass = getRoleColorClass(character.role);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={[
        "group",
        "flex",
        "items-center",
        "gap-3",
        "p-2",
        "rounded-[var(--radius-md)]",
        "border",
        "cursor-pointer",
        "relative",
        "transition-all",
        "duration-[var(--duration-normal)]",
        // Focus visible
        "focus-visible:outline",
        "focus-visible:outline-[length:var(--ring-focus-width)]",
        "focus-visible:outline-offset-[var(--ring-focus-offset)]",
        "focus-visible:outline-[var(--color-ring-focus)]",
        // Selected vs default state
        selected
          ? [
              "bg-[var(--color-bg-hover)]",
              "border-[var(--color-border-hover)]",
            ].join(" ")
          : [
              "border-transparent",
              "hover:bg-[#161616]",
              "hover:border-[var(--color-border-default)]",
            ].join(" "),
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="character-card"
      aria-selected={selected}
    >
      {/* Selected indicator (blue left border) */}
      {selected && (
        <div
          className="absolute left-[-1px] top-1 bottom-1 w-[3px] bg-[var(--color-info)] rounded-r-sm"
          data-testid="character-card-selected-indicator"
        />
      )}

      {/* Avatar */}
      <Avatar
        src={character.avatarUrl}
        fallback={character.name}
        size="sm"
        className={[
          "border",
          "border-[var(--color-border-default)]",
          selected
            ? "opacity-90"
            : "opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100",
          "transition-all",
        ].join(" ")}
      />

      {/* Name and Role */}
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={[
            "text-sm",
            "font-medium",
            "leading-none",
            "truncate",
            "transition-colors",
            selected
              ? "text-[var(--color-fg-default)]"
              : "text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)]",
          ].join(" ")}
        >
          {character.name}
        </span>
        <span
          className={[
            "text-[11px]",
            "mt-1.5",
            "truncate",
            "transition-colors",
            selected ? roleColorClass : "text-[#555] group-hover:text-[#777]",
          ].join(" ")}
        >
          {roleLabel}
        </span>
      </div>

      {/* Action buttons (shown on hover or when selected) */}
      <div
        className={[
          "absolute",
          "right-2",
          "flex",
          "gap-1",
          "transition-opacity",
          "pl-2",
          selected
            ? "opacity-100 bg-[var(--color-bg-hover)]"
            : "opacity-0 group-hover:opacity-100 bg-[#161616]",
          "shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.5)]",
        ].join(" ")}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEditClick}
            className={[
              "p-1.5",
              "rounded",
              "text-[var(--color-fg-placeholder)]",
              "hover:text-[var(--color-fg-default)]",
              "hover:bg-[var(--color-bg-hover)]",
              "transition-colors",
            ].join(" ")}
            aria-label={`Edit ${character.name}`}
          >
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className={[
              "p-1.5",
              "rounded",
              "text-[var(--color-fg-placeholder)]",
              "hover:text-[var(--color-error)]",
              "hover:bg-[var(--color-bg-hover)]",
              "transition-colors",
            ].join(" ")}
            aria-label={`Delete ${character.name}`}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
}
