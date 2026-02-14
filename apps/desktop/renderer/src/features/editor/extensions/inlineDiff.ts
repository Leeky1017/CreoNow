import {
  applyHunkDecisions,
  computeDiffHunks,
  type DiffHunkDecision,
} from "../../../lib/diff/unifiedDiff";

export type InlineDiffDecision = DiffHunkDecision;

export type InlineDiffDecoration = {
  hunkIndex: number;
  removedLines: string[];
  addedLines: string[];
};

export function createPendingInlineDiffDecisions(
  length: number,
): InlineDiffDecision[] {
  return Array.from({ length }, () => "pending");
}

export function createInlineDiffDecorations(args: {
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

export function resolveInlineDiffText(args: {
  originalText: string;
  suggestedText: string;
  decisions: InlineDiffDecision[];
}): string {
  return applyHunkDecisions({
    oldText: args.originalText,
    newText: args.suggestedText,
    decisions: args.decisions,
  });
}

export type InlineDiffExtensionContract = {
  name: "inlineDiff";
  decorations: InlineDiffDecoration[];
};

// Keep a stable extension contract shape until TipTap integration lands.
export const InlineDiffExtension: InlineDiffExtensionContract = {
  name: "inlineDiff",
  decorations: [],
};
