/**
 * DiffEngine types — ProseMirror Transaction Spec
 */

export type DiffStepType = "insert" | "delete" | "replace";

export interface DiffStep {
  readonly type: DiffStepType;
  readonly from: number;
  readonly to: number;
  readonly text?: string;
}

export interface ProseMirrorTransactionSpec {
  readonly steps: ReadonlyArray<DiffStep>;
  readonly before: string;
  readonly after: string;
  readonly stats: DiffStats;
}

export interface DiffStats {
  readonly insertions: number;
  readonly deletions: number;
  readonly replacements: number;
  readonly totalChanges: number;
  readonly insertedChars: number;
  readonly deletedChars: number;
}

export interface DiffError extends Error {
  readonly code: DiffErrorCode;
}

export type DiffErrorCode = "DIFF_INPUT_TOO_LARGE" | "DIFF_COMPUTE_FAILED";

export const DIFF_MAX_CHARS = 50_000;
