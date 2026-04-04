/**
 * DiffEngine — pure text-to-text diff producing ProseMirror TransactionSpec
 *
 * Algorithm: find longest common prefix & suffix, then treat the
 * differing middle as a single change (insert / delete / replace).
 */

import type {
  DiffError,
  DiffStats,
  DiffStep,
  ProseMirrorTransactionSpec,
} from "./types";
import { DIFF_MAX_CHARS } from "./types";

// ─── Error helper ───────────────────────────────────────────────────

export function makeDiffError(
  code: DiffError["code"],
  message: string,
): DiffError {
  const err = new Error(message) as DiffError;
  (err as { code: DiffError["code"] }).code = code;
  return err;
}

// ─── Core ───────────────────────────────────────────────────────────

export function computeTransaction(
  before: string,
  after: string,
): ProseMirrorTransactionSpec {
  if (before.length > DIFF_MAX_CHARS || after.length > DIFF_MAX_CHARS) {
    throw makeDiffError(
      "DIFF_INPUT_TOO_LARGE",
      `Input exceeds ${DIFF_MAX_CHARS} characters`,
    );
  }

  const steps: DiffStep[] = [];

  if (before === after) {
    return buildResult(steps, before, after);
  }

  // Find common prefix length
  const minLen = Math.min(before.length, after.length);
  let prefixLen = 0;
  while (prefixLen < minLen && before[prefixLen] === after[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix length (not overlapping with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    before[before.length - 1 - suffixLen] === after[after.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const beforeMiddle = before.slice(prefixLen, before.length - suffixLen);
  const afterMiddle = after.slice(prefixLen, after.length - suffixLen);

  if (beforeMiddle.length === 0 && afterMiddle.length > 0) {
    // Pure insertion
    steps.push({
      type: "insert",
      from: prefixLen,
      to: prefixLen,
      text: afterMiddle,
    });
  } else if (beforeMiddle.length > 0 && afterMiddle.length === 0) {
    // Pure deletion
    steps.push({
      type: "delete",
      from: prefixLen,
      to: prefixLen + beforeMiddle.length,
    });
  } else if (beforeMiddle.length > 0 && afterMiddle.length > 0) {
    // Replacement
    steps.push({
      type: "replace",
      from: prefixLen,
      to: prefixLen + beforeMiddle.length,
      text: afterMiddle,
    });
  }

  return buildResult(steps, before, after);
}

// ─── Internals ──────────────────────────────────────────────────────

function buildResult(
  steps: ReadonlyArray<DiffStep>,
  before: string,
  after: string,
): ProseMirrorTransactionSpec {
  return { steps, before, after, stats: computeStats(steps) };
}

function computeStats(steps: ReadonlyArray<DiffStep>): DiffStats {
  let insertions = 0;
  let deletions = 0;
  let replacements = 0;
  let insertedChars = 0;
  let deletedChars = 0;

  for (const step of steps) {
    switch (step.type) {
      case "insert":
        insertions++;
        insertedChars += step.text?.length ?? 0;
        break;
      case "delete":
        deletions++;
        deletedChars += step.to - step.from;
        break;
      case "replace":
        replacements++;
        insertedChars += step.text?.length ?? 0;
        deletedChars += step.to - step.from;
        break;
    }
  }

  return {
    insertions,
    deletions,
    replacements,
    totalChanges: insertions + deletions + replacements,
    insertedChars,
    deletedChars,
  };
}
