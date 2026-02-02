import { Button } from "../../components/primitives";
import type { DiffStats } from "./DiffView";

type DiffFooterProps = {
  /** Diff statistics */
  stats: DiffStats;
  /** Callback for close action */
  onClose: () => void;
  /** Callback for restore action */
  onRestore: () => void;
  /** Whether restore is in progress */
  restoreInProgress?: boolean;
};

/**
 * DiffFooter displays statistics and action buttons.
 */
export function DiffFooter(props: DiffFooterProps): JSX.Element {
  return (
    <footer className="h-16 flex items-center justify-between px-6 border-t border-[var(--color-separator)] bg-[var(--color-bg-raised)] shrink-0">
      {/* Left: Statistics */}
      <div className="flex items-center gap-4 text-xs">
        {/* Added */}
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-success)]">+{props.stats.addedLines} lines</span>
        </div>

        {/* Separator dot */}
        <div className="w-1 h-1 rounded-full bg-[var(--color-fg-subtle)]" />

        {/* Removed */}
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-error)]">-{props.stats.removedLines} lines</span>
        </div>

        {/* Separator dot */}
        <div className="w-1 h-1 rounded-full bg-[var(--color-fg-subtle)]" />

        {/* Hunks */}
        <div className="text-[var(--color-fg-muted)]">
          {props.stats.changedHunks} {props.stats.changedHunks === 1 ? "change" : "changes"}
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onClose}
        >
          Close
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={props.onRestore}
          disabled={props.restoreInProgress}
          className="flex items-center gap-2"
        >
          {/* Restore icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {props.restoreInProgress ? "Restoring..." : "Restore Before Version"}
        </Button>
      </div>
    </footer>
  );
}
