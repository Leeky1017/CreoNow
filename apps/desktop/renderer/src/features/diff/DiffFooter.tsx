import { Button } from "../../components/primitives";
import type { DiffStats } from "./DiffView";
import type { DiffHunkDecision } from "../../lib/diff/unifiedDiff";

type DiffFooterProps = {
  /** Diff statistics */
  stats: DiffStats;
  /** Callback for close action */
  onClose: () => void;
  /** Callback for restore action */
  onRestore?: () => void;
  /** Whether restore is in progress */
  restoreInProgress?: boolean;
  /** Optional AI compare actions */
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAcceptHunk?: () => void;
  onRejectHunk?: () => void;
  currentChangeIndex?: number;
  totalChanges?: number;
  currentHunkDecision?: DiffHunkDecision;
};

/**
 * DiffFooter displays statistics and action buttons.
 */
export function DiffFooter(props: DiffFooterProps): JSX.Element {
  const hasAiActions = !!props.onAcceptAll || !!props.onRejectAll;
  const hasCurrentHunk =
    (props.totalChanges ?? 0) > 0 &&
    typeof props.currentChangeIndex === "number" &&
    props.currentChangeIndex >= 0;
  const currentHunkLabel =
    typeof props.currentChangeIndex === "number"
      ? props.currentChangeIndex + 1
      : 0;

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

      {/* Right: Action buttons */}
      {hasAiActions ? (
        <div className="flex items-center gap-2">
          {hasCurrentHunk ? (
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              Hunk {currentHunkLabel}/{props.totalChanges}{" "}
              {props.currentHunkDecision &&
              props.currentHunkDecision !== "pending"
                ? `(${props.currentHunkDecision})`
                : ""}
            </span>
          ) : null}

          {props.onRejectHunk ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onRejectHunk}
              disabled={!hasCurrentHunk}
            >
              Reject Hunk
            </Button>
          ) : null}

          {props.onAcceptHunk ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onAcceptHunk}
              disabled={!hasCurrentHunk}
            >
              Accept Hunk
            </Button>
          ) : null}

          {props.onRejectAll ? (
            <Button variant="ghost" size="sm" onClick={props.onRejectAll}>
              Reject All
            </Button>
          ) : null}

          {props.onAcceptAll ? (
            <Button variant="secondary" size="sm" onClick={props.onAcceptAll}>
              Accept All
            </Button>
          ) : null}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onRestore}
          disabled={props.restoreInProgress}
        >
          {props.restoreInProgress ? "Restoring..." : "Restore"}
        </Button>
      )}
    </footer>
  );
}
