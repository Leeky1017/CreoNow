import React from "react";

// =============================================================================
// Types
// =============================================================================

export interface CommandItemProps {
  /** Optional icon displayed before the label */
  icon?: React.ReactNode;
  /** Command label text */
  label: string;
  /** Optional keyboard shortcut hint */
  hint?: string;
  /** Callback when the command is selected */
  onSelect?: () => void;
  /** Whether this item is in active/highlighted state */
  active?: boolean;
  /** Additional CSS class */
  className?: string;
  /** data-testid for testing */
  "data-testid"?: string;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = [
  "relative",
  "h-10",
  "flex",
  "items-center",
  "px-3",
  "rounded-[var(--radius-sm)]",
  "cursor-pointer",
  "mb-0.5",
  "transition-colors",
  "duration-[var(--duration-fast)]",
].join(" ");

const activeStyles = [
  "bg-[color:var(--color-bg-hover)]",
  "text-[color:var(--color-fg-default)]",
].join(" ");

const inactiveStyles = [
  "text-[color:var(--color-fg-muted)]",
  "hover:bg-[rgba(255,255,255,0.03)]",
  "hover:text-[color:var(--color-fg-default)]",
].join(" ");

// =============================================================================
// Component
// =============================================================================

/**
 * CommandItem — a reusable command palette item composite.
 *
 * Provides a consistent command entry with:
 * - Icon (optional)
 * - Label text
 * - Keyboard shortcut hint (optional)
 * - Active/highlighted visual state
 * - Active indicator bar
 *
 * Used by CommandPalette for rendering individual command options.
 */
export function CommandItem({
  icon,
  label,
  hint,
  onSelect,
  active = false,
  className = "",
  "data-testid": testId,
}: CommandItemProps): JSX.Element {
  return (
    <div
      role="option"
      aria-selected={active}
      data-testid={testId}
      className={`${baseStyles} ${active ? activeStyles : inactiveStyles} ${className}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      tabIndex={0}
    >
      {/* Active indicator bar */}
      {active && (
        <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-[color:var(--color-accent-blue)] rounded-r-sm" />
      )}

      {/* Icon */}
      {icon && (
        <div className="w-4 h-4 mr-3 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}

      {/* Label */}
      <span className="flex-1 text-[13px] truncate">{label}</span>

      {/* Shortcut hint */}
      {hint && (
        <div
          className={`ml-2 px-1.5 py-0.5 text-[11px] rounded bg-[color:var(--color-bg-selected)] border border-[rgba(255,255,255,0.05)] ${
            active
              ? "text-[color:var(--color-fg-default)] border-[rgba(255,255,255,0.1)]"
              : "text-[color:var(--color-fg-muted)]"
          }`}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
