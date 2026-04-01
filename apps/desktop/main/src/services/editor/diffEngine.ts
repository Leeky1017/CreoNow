/**
 * DiffEngine — Diff Preview Engine
 *
 * Creates suggestion transactions, manages accept/reject of changes,
 * Step.map() rebase after operations, DecorationSet with .find() API,
 * snapshot integration, input blocking during suggestion mode.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ChangeKind = "insertion" | "deletion" | "replacement";

interface DiffStep {
  type: "insert" | "delete" | "replace";
  from: number;
  to?: number;
  text?: string;
}

export interface DiffChange {
  changeId: string;
  kind: ChangeKind;
  from: number;
  to: number;
  step: DiffStep;
  oldContent?: string;
  newContent?: string;
}

interface SuggestionDecoration {
  from: number;
  to: number;
  className: string;
}

interface DecorationSet {
  find: (
    start: number,
    end: number,
  ) => Array<{ from: number; to: number; className: string }>;
}

export interface DiffStats {
  insertions: number;
  deletions: number;
  replacements: number;
  totalChanges: number;
  insertedChars: number;
  deletedChars: number;
}

export interface DiffResult {
  changes: DiffChange[];
  decorations: SuggestionDecoration[];
  decorationSet: DecorationSet;
  preWriteSnapshotId: string;
  requestId: string;
  stats: DiffStats;
}

interface EditorState {
  doc: { textContent: string; nodeSize: number };
  selection: { from: number; to: number };
  tr: Transaction;
}

interface Transaction {
  steps: unknown[];
  doc: { textContent: string };
  replaceWith: (...args: unknown[]) => Transaction;
  delete: (...args: unknown[]) => Transaction;
  insert: (...args: unknown[]) => Transaction;
  setMeta: (...args: unknown[]) => Transaction;
  getMeta: (...args: unknown[]) => unknown;
}

interface SnapshotStore {
  getSnapshot: (id: string) => unknown;
  createSnapshot: (opts: { reason: string }) => unknown;
}

interface DiffEngineConfig {
  snapshotStore: SnapshotStore;
}

interface DiffError extends Error {
  code: string;
}

function makeError(code: string, message: string): DiffError {
  const err = new Error(message) as DiffError;
  err.code = code;
  return err;
}

export interface DiffEngine {
  createSuggestionTransaction(
    state: EditorState,
    aiOutput: string,
    selection: { from: number; to: number },
    preWriteSnapshotId: string,
    requestId: string,
  ): DiffResult;

  acceptChange(state: EditorState, changeId: string): Transaction;
  rejectChange(state: EditorState, changeId: string): Transaction;
  acceptAll(state: EditorState): Transaction;
  rejectAll(state: EditorState): Transaction;
  getPendingChanges(): DiffChange[];
  getDecorations(): DecorationSet;
  getStats(): DiffStats;
  isInputBlocked(range: { from: number; to: number }): boolean;
  dispose(): void;
}

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function generateChangeId(): string {
  return `change-${++idCounter}-${Date.now()}`;
}

function computeDiff(
  original: string,
  modified: string,
  baseOffset: number,
): DiffChange[] {
  if (original === modified) return [];

  // Find common prefix
  let prefixLen = 0;
  while (
    prefixLen < original.length &&
    prefixLen < modified.length &&
    original[prefixLen] === modified[prefixLen]
  ) {
    prefixLen++;
  }

  // Find common suffix
  let suffixLen = 0;
  while (
    suffixLen < original.length - prefixLen &&
    suffixLen < modified.length - prefixLen &&
    original[original.length - 1 - suffixLen] ===
      modified[modified.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const origMiddle = original.slice(prefixLen, original.length - suffixLen);
  const modMiddle = modified.slice(prefixLen, modified.length - suffixLen);

  if (origMiddle === "" && modMiddle === "") return [];

  const changes: DiffChange[] = [];
  const middleStart = baseOffset + prefixLen;

  if (origMiddle !== "" && modMiddle !== "") {
    // Both non-empty: emit a single replacement change (D20)
    changes.push({
      changeId: generateChangeId(),
      kind: "replacement",
      from: middleStart,
      to: middleStart + origMiddle.length,
      oldContent: origMiddle,
      newContent: modMiddle,
      step: { type: "replace", from: middleStart, to: middleStart + origMiddle.length, text: modMiddle },
    });
  } else if (origMiddle === "") {
    changes.push({
      changeId: generateChangeId(),
      kind: "insertion",
      from: middleStart,
      to: middleStart,
      newContent: modMiddle,
      step: { type: "insert", from: middleStart, text: modMiddle },
    });
  } else {
    changes.push({
      changeId: generateChangeId(),
      kind: "deletion",
      from: middleStart,
      to: middleStart + origMiddle.length,
      oldContent: origMiddle,
      step: { type: "delete", from: middleStart, to: middleStart + origMiddle.length },
    });
  }

  return changes;
}

function computeStats(changes: DiffChange[]): DiffStats {
  let insertions = 0;
  let deletions = 0;
  let replacements = 0;
  let insertedChars = 0;
  let deletedChars = 0;

  for (const c of changes) {
    if (c.kind === "insertion") {
      insertions++;
      insertedChars += c.newContent?.length ?? 0;
    } else if (c.kind === "deletion") {
      deletions++;
      deletedChars += (c.to - c.from);
    } else {
      replacements++;
      insertedChars += c.newContent?.length ?? 0;
      deletedChars += (c.to - c.from);
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

function buildDecorations(changes: DiffChange[]): SuggestionDecoration[] {
  const decs: SuggestionDecoration[] = [];
  for (const c of changes) {
    if (c.kind === "insertion") {
      decs.push({
        from: c.from,
        to: c.from + (c.newContent?.length ?? 1),
        className: "cn-diff-insertion",
      });
    } else if (c.kind === "deletion") {
      decs.push({ from: c.from, to: c.to, className: "cn-diff-deletion" });
    } else {
      decs.push({
        from: c.from,
        to: c.to,
        className: "cn-diff-replacement-old",
      });
      decs.push({
        from: c.from,
        to: c.from + (c.newContent?.length ?? 0),
        className: "cn-diff-replacement-new",
      });
    }
  }
  return decs;
}

function createDecorationSetFrom(
  decorations: SuggestionDecoration[],
): DecorationSet {
  return {
    find: (start: number, end: number) =>
      decorations.filter((d) => d.from < end && d.to > start),
  };
}

// ─── Implementation ─────────────────────────────────────────────────

export function createDiffEngine(config: DiffEngineConfig): DiffEngine {
  const { snapshotStore } = config;

  let pendingChanges: DiffChange[] = [];
  let currentDecorations: SuggestionDecoration[] = [];
  let currentStats: DiffStats = {
    insertions: 0,
    deletions: 0,
    replacements: 0,
    totalChanges: 0,
    insertedChars: 0,
    deletedChars: 0,
  };
  let storedDocText: string | null = null;
  let storedSnapshotId: string | null = null;
  let disposed = false;

  function rebaseChangesAfterAccept(
    acceptedChange: DiffChange,
  ): void {
    // Calculate position shift
    let shift = 0;
    if (acceptedChange.kind === "insertion") {
      shift = acceptedChange.newContent?.length ?? 0;
    } else if (acceptedChange.kind === "deletion") {
      shift = -(acceptedChange.to - acceptedChange.from);
    } else if (acceptedChange.kind === "replacement") {
      const oldLen = acceptedChange.to - acceptedChange.from;
      const newLen = acceptedChange.newContent?.length ?? 0;
      shift = newLen - oldLen;
    }

    if (shift === 0) return;

    const changePos = acceptedChange.from;
    for (const c of pendingChanges) {
      if (c.from >= changePos) {
        c.from += shift;
        c.to += shift;
        if (c.step.from !== undefined) {
          c.step = { ...c.step, from: c.from };
          if (c.step.to !== undefined) {
            c.step = { ...c.step, to: c.to };
          }
        }
      }
    }
  }

  function rebaseChangesAfterReject(
    rejectedChange: DiffChange,
  ): void {
    let shift = 0;
    if (rejectedChange.kind === "deletion") {
      // Restoring deleted text inserts characters
      shift = rejectedChange.to - rejectedChange.from;
    } else if (rejectedChange.kind === "insertion") {
      // Nothing was ever inserted, so no shift needed
      shift = 0;
    } else if (rejectedChange.kind === "replacement") {
      // Rejecting replacement restores old content and removes new content
      const oldLen = rejectedChange.oldContent?.length ?? 0;
      const newLen = rejectedChange.to - rejectedChange.from;
      shift = oldLen - newLen;
    }

    if (shift === 0) return;

    const changePos = rejectedChange.from;
    for (const c of pendingChanges) {
      if (c.from >= changePos) {
        c.from += shift;
        c.to += shift;
        if (c.step.from !== undefined) {
          c.step = { ...c.step, from: c.from };
          if (c.step.to !== undefined) {
            c.step = { ...c.step, to: c.to };
          }
        }
      }
    }
  }

  function refreshDecorations(): void {
    currentDecorations = buildDecorations(pendingChanges);
  }

  const engine: DiffEngine = {
    createSuggestionTransaction(
      state: EditorState,
      aiOutput: string,
      selection: { from: number; to: number },
      preWriteSnapshotId: string,
      requestId: string,
    ): DiffResult {
      try {
        if (!state || !state.doc) {
          throw makeError(
            "DIFF_COMPUTE_FAILED",
            "Invalid editor state: missing doc",
          );
        }

        const originalText = state.doc.textContent;
        storedDocText = originalText;
        storedSnapshotId = preWriteSnapshotId;

        // Compute diff
        const changes = computeDiff(originalText, aiOutput, 0);
        pendingChanges = changes;

        const stats = computeStats(changes);
        currentStats = stats;

        const decorations = buildDecorations(changes);
        currentDecorations = decorations;

        return {
          changes: changes.map((c) => ({ ...c })),
          decorations: [...decorations],
          decorationSet: createDecorationSetFrom(decorations),
          preWriteSnapshotId,
          requestId,
          stats,
        };
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code) throw err;
        throw makeError(
          "DIFF_COMPUTE_FAILED",
          `Diff computation failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },

    acceptChange(state: EditorState, changeId: string): Transaction {
      const idx = pendingChanges.findIndex((c) => c.changeId === changeId);
      if (idx === -1) {
        throw makeError(
          "DIFF_CHANGE_NOT_FOUND",
          `Change "${changeId}" not found in pending changes`,
        );
      }

      const change = pendingChanges[idx];
      const tr = state.tr;

      // Stale document check BEFORE applying (D21 — fail-fast)
      if (
        storedDocText !== null &&
        state.doc.textContent !== storedDocText &&
        state.doc.textContent.length > 0
      ) {
        throw makeError(
          "DIFF_STALE_DOCUMENT",
          "Document has been modified since diff was created",
        );
      }

      // Try to apply the step
      try {
        if (change.kind === "insertion" && change.newContent) {
          tr.replaceWith(change.from, change.from, change.newContent);
        } else if (change.kind === "deletion") {
          tr.replaceWith(change.from, change.to, "");
        } else if (change.kind === "replacement" && change.newContent) {
          tr.replaceWith(change.from, change.to, change.newContent);
        }
        tr.steps.push(change.step);
      } catch (err: unknown) {
        throw makeError(
          "DIFF_APPLY_FAILED",
          `Failed to apply change "${changeId}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Remove accepted change
      pendingChanges.splice(idx, 1);

      // Rebase remaining changes
      rebaseChangesAfterAccept(change);

      // Update decorations
      refreshDecorations();

      // Update stored doc text for future stale checks
      storedDocText = state.doc.textContent;

      return tr;
    },

    rejectChange(state: EditorState, changeId: string): Transaction {
      const idx = pendingChanges.findIndex((c) => c.changeId === changeId);
      if (idx === -1) {
        throw makeError(
          "DIFF_CHANGE_NOT_FOUND",
          `Change "${changeId}" not found in pending changes`,
        );
      }

      const change = pendingChanges[idx];
      const tr = state.tr;

      try {
        if (change.kind === "deletion" && change.oldContent) {
          tr.replaceWith(change.from, change.from, change.oldContent);
          tr.steps.push({
            type: "insert",
            from: change.from,
            text: change.oldContent,
          });
        } else if (change.kind === "insertion") {
          tr.replaceWith(change.from, change.from, "");
          tr.steps.push({ type: "reject-insertion", changeId });
        } else if (change.kind === "replacement" && change.oldContent) {
          tr.replaceWith(change.from, change.to, change.oldContent);
          tr.steps.push({
            type: "replace",
            from: change.from,
            to: change.to,
            text: change.oldContent,
          });
        }
      } catch (err: unknown) {
        throw makeError(
          "DIFF_REJECT_FAILED",
          `Failed to reject change "${changeId}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Remove rejected change
      pendingChanges.splice(idx, 1);

      // Rebase remaining changes
      rebaseChangesAfterReject(change);

      // Update decorations
      refreshDecorations();

      // Update stored doc text after reject (D26)
      storedDocText = state.doc.textContent;

      return tr;
    },

    acceptAll(state: EditorState): Transaction {
      const tr = state.tr;

      // Process changes in order, rebasing after each (D25)
      while (pendingChanges.length > 0) {
        const change = pendingChanges[0];
        try {
          if (change.kind === "insertion" && change.newContent) {
            tr.insert(change.from, change.newContent);
          } else if (change.kind === "deletion") {
            tr.delete(change.from, change.to);
          } else if (change.kind === "replacement" && change.newContent) {
            tr.replaceWith(change.from, change.to, change.newContent);
          }
          tr.steps.push(change.step);
        } catch {
          // Continue with remaining changes
        }

        // Remove accepted change and rebase remaining
        pendingChanges.splice(0, 1);
        rebaseChangesAfterAccept(change);
      }

      pendingChanges = [];
      currentDecorations = [];
      currentStats = {
        insertions: 0,
        deletions: 0,
        replacements: 0,
        totalChanges: 0,
        insertedChars: 0,
        deletedChars: 0,
      };

      // Create post-accept snapshot
      snapshotStore.createSnapshot({ reason: "ai-accept" });

      return tr;
    },

    rejectAll(state: EditorState): Transaction {
      const tr = state.tr;

      // Validate snapshot with proper null check (D22)
      if (storedSnapshotId) {
        const snapshot = snapshotStore.getSnapshot(storedSnapshotId);
        if (snapshot == null) {
          throw makeError(
            "DIFF_SNAPSHOT_MISSING",
            `Pre-write snapshot "${storedSnapshotId}" not found`,
          );
        }
      }

      // Restore original content
      for (const change of [...pendingChanges].reverse()) {
        if (change.kind === "deletion" && change.oldContent) {
          tr.insert(change.from, change.oldContent);
          tr.steps.push({
            type: "insert",
            from: change.from,
            text: change.oldContent,
          });
        } else if (change.kind === "insertion") {
          tr.setMeta("rejected-insertion", change.changeId);
          tr.steps.push({ type: "reject-insertion", changeId: change.changeId });
        } else if (change.kind === "replacement" && change.oldContent) {
          tr.replaceWith(change.from, change.to, change.oldContent);
          tr.steps.push({
            type: "replace",
            from: change.from,
            to: change.to,
            text: change.oldContent,
          });
        }
      }

      pendingChanges = [];
      currentDecorations = [];

      return tr;
    },

    getPendingChanges(): DiffChange[] {
      return pendingChanges.map((c) => ({ ...c }));
    },

    getDecorations(): DecorationSet {
      return createDecorationSetFrom(currentDecorations);
    },

    getStats(): DiffStats {
      return { ...currentStats };
    },

    isInputBlocked(range: { from: number; to: number }): boolean {
      return pendingChanges.some(
        (c) =>
          (c.from < range.to && c.to > range.from) ||
          (c.from === c.to && c.from >= range.from && c.from < range.to),
      );
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      pendingChanges = [];
      currentDecorations = [];
      storedDocText = null;
      storedSnapshotId = null;
      currentStats = {
        insertions: 0,
        deletions: 0,
        replacements: 0,
        totalChanges: 0,
        insertedChars: 0,
        deletedChars: 0,
      };
    },
  };

  return engine;
}
