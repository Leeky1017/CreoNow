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
          <span className="text-[var(--color-success)]">
            +{props.stats.addedLines} lines
          </span>
        </div>

        {/* Separator dot */}
        <div className="w-1 h-1 rounded-full bg-[var(--color-fg-subtle)]" />

        {/* Removed */}
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-error)]">
            -{props.stats.removedLines} lines
          </span>
        </div>

        {/* Separator dot */}
        <div className="w-1 h-1 rounded-full bg-[var(--color-fg-subtle)]" />

        {/* Hunks */}
        <div className="text-[var(--color-fg-muted)]">
          {props.stats.changedHunks}{" "}
          {props.stats.changedHunks === 1 ? "change" : "changes"}
        </div>
      </div>

      {/* Right: Action button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onRestore}
        disabled={props.restoreInProgress}
      >
        {props.restoreInProgress ? "Restoring..." : "Restore"}
      </Button>
    </footer>
  );
}
