import React from "react";

import { Button, Text } from "../../components/primitives";
import {
  applyHunkDecisions,
  computeDiffHunks,
  type DiffHunkDecision,
} from "../../lib/diff/unifiedDiff";

type InlineDiffDecorationsProps = {
  originalText: string;
  suggestedText: string;
  onApplyAcceptedText: (nextText: string) => void;
};

type InlineDiffDecoration = {
  hunkIndex: number;
  removedLines: string[];
  addedLines: string[];
};

function createPendingDecisions(length: number): DiffHunkDecision[] {
  return Array.from({ length }, () => "pending");
}

function buildDecorations(args: {
  originalText: string;
  suggestedText: string;
}): InlineDiffDecoration[] {
  return computeDiffHunks({
    oldText: args.originalText,
    newText: args.suggestedText,
  }).map((hunk) => ({
    hunkIndex: hunk.index,
    removedLines: hunk.oldLines,
    addedLines: hunk.newLines,
  }));
}

/**
 * Render inline diff hunks with per-hunk accept/reject controls.
 *
 * Why: AI changes must stay non-destructive until user explicitly accepts.
 */
export function InlineDiffDecorations(
  props: InlineDiffDecorationsProps,
): JSX.Element {
  const decorations = React.useMemo(
    () =>
      buildDecorations({
        originalText: props.originalText,
        suggestedText: props.suggestedText,
      }),
    [props.originalText, props.suggestedText],
  );

  const [decisions, setDecisions] = React.useState<DiffHunkDecision[]>(() =>
    createPendingDecisions(decorations.length),
  );
  const [currentText, setCurrentText] = React.useState(props.originalText);

  React.useEffect(() => {
    setDecisions(createPendingDecisions(decorations.length));
    setCurrentText(props.originalText);
  }, [decorations.length, props.originalText]);

  const resolveAcceptedText = React.useCallback(
    (nextDecisions: DiffHunkDecision[]): string =>
      applyHunkDecisions({
        oldText: props.originalText,
        newText: props.suggestedText,
        decisions: nextDecisions,
      }),
    [props.originalText, props.suggestedText],
  );

  const onAcceptHunk = React.useCallback(
    (hunkIndex: number): void => {
      setDecisions((prev) => {
        if (prev[hunkIndex] !== "pending") {
          return prev;
        }
        const next = [...prev];
        next[hunkIndex] = "accepted";
        const nextText = resolveAcceptedText(next);
        setCurrentText(nextText);
        props.onApplyAcceptedText(nextText);
        return next;
      });
    },
    [props.onApplyAcceptedText, resolveAcceptedText],
  );

  const onRejectHunk = React.useCallback((hunkIndex: number): void => {
    setDecisions((prev) => {
      if (prev[hunkIndex] !== "pending") {
        return prev;
      }
      const next = [...prev];
      next[hunkIndex] = "rejected";
      return next;
    });
  }, []);

  return (
    <section
      data-testid="inline-diff-decoration-layer"
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-raised)] p-3"
    >
      {decorations.length === 0 ? (
        <Text size="small" color="muted">
          No inline diff changes
        </Text>
      ) : null}

      {decorations.map((item) => {
        const decision = decisions[item.hunkIndex] ?? "pending";
        return (
          <article
            key={item.hunkIndex}
            data-testid={`inline-diff-hunk-${item.hunkIndex}`}
            className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2"
          >
            {item.removedLines.map((line, idx) => (
              <div
                key={`remove-${item.hunkIndex}-${idx}`}
                data-testid={`inline-diff-remove-${item.hunkIndex}-${idx}`}
                className="rounded-[var(--radius-xs)] bg-[var(--color-error-subtle)] px-2 py-1 text-[var(--color-error)] line-through"
              >
                {line}
              </div>
            ))}

            {item.addedLines.map((line, idx) => (
              <div
                key={`add-${item.hunkIndex}-${idx}`}
                data-testid={`inline-diff-add-${item.hunkIndex}-${idx}`}
                className="rounded-[var(--radius-xs)] bg-[var(--color-success-subtle)] px-2 py-1 text-[var(--color-success)]"
              >
                {line}
              </div>
            ))}

            {decision === "pending" ? (
              <div
                data-testid={`inline-diff-controls-${item.hunkIndex}`}
                className="flex items-center gap-2 pt-1"
              >
                <Button
                  data-testid={`inline-diff-accept-${item.hunkIndex}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => onAcceptHunk(item.hunkIndex)}
                >
                  Accept
                </Button>
                <Button
                  data-testid={`inline-diff-reject-${item.hunkIndex}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => onRejectHunk(item.hunkIndex)}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </article>
        );
      })}

      <pre data-testid="inline-diff-current-text" className="hidden">
        {currentText}
      </pre>
    </section>
  );
}
