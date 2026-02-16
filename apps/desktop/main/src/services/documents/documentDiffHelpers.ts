import type { VersionDiffStats } from "@shared/types/version-diff";

type DiffOp =
  | { kind: "equal"; text: string }
  | { kind: "remove"; text: string }
  | { kind: "add"; text: string };

export type DiffHunk = {
  oldStart: number;
  newStart: number;
  oldLines: string[];
  newLines: string[];
};

function normalizeNewlines(text: string): string {
  return text.replaceAll("\r\n", "\n");
}

function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  return normalizeNewlines(text).split("\n");
}

function diffLines(oldLines: string[], newLines: string[]): DiffOp[] {
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  const lcs: number[][] = Array.from({ length: oldLen + 1 }, () =>
    Array.from({ length: newLen + 1 }, () => 0),
  );

  for (let i = oldLen - 1; i >= 0; i -= 1) {
    for (let j = newLen - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLen && j < newLen) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: "equal", text: oldLines[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "remove", text: oldLines[i] });
      i += 1;
    } else {
      ops.push({ kind: "add", text: newLines[j] });
      j += 1;
    }
  }

  while (i < oldLen) {
    ops.push({ kind: "remove", text: oldLines[i] });
    i += 1;
  }
  while (j < newLen) {
    ops.push({ kind: "add", text: newLines[j] });
    j += 1;
  }

  return ops;
}

export function computeDiffHunks(args: {
  oldText: string;
  newText: string;
}): DiffHunk[] {
  const oldLines = splitLines(args.oldText);
  const newLines = splitLines(args.newText);
  const ops = diffLines(oldLines, newLines);

  const hunks: DiffHunk[] = [];
  let oldLine = 1;
  let newLine = 1;
  let cursor = 0;

  while (cursor < ops.length) {
    const op = ops[cursor];
    if (op.kind === "equal") {
      oldLine += 1;
      newLine += 1;
      cursor += 1;
      continue;
    }

    const oldStart = oldLine;
    const newStart = newLine;
    const oldChunk: string[] = [];
    const newChunk: string[] = [];

    while (cursor < ops.length && ops[cursor]?.kind !== "equal") {
      const chunkOp = ops[cursor];
      if (chunkOp.kind === "remove") {
        oldChunk.push(chunkOp.text);
        oldLine += 1;
      } else if (chunkOp.kind === "add") {
        newChunk.push(chunkOp.text);
        newLine += 1;
      }
      cursor += 1;
    }

    hunks.push({
      oldStart,
      newStart,
      oldLines: oldChunk,
      newLines: newChunk,
    });
  }

  return hunks;
}

export function buildUnifiedDiff(args: {
  oldText: string;
  newText: string;
  oldLabel: string;
  newLabel: string;
}): { diffText: string; stats: VersionDiffStats } {
  if (args.oldText === args.newText) {
    return {
      diffText: "",
      stats: { addedLines: 0, removedLines: 0, changedHunks: 0 },
    };
  }

  const hunks = computeDiffHunks({
    oldText: args.oldText,
    newText: args.newText,
  });

  const lines: string[] = [];
  lines.push(`--- ${args.oldLabel}`);
  lines.push(`+++ ${args.newLabel}`);

  let addedLines = 0;
  let removedLines = 0;
  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines.length} +${hunk.newStart},${hunk.newLines.length} @@`,
    );
    for (const oldLine of hunk.oldLines) {
      lines.push(`-${oldLine}`);
      removedLines += 1;
    }
    for (const newLine of hunk.newLines) {
      lines.push(`+${newLine}`);
      addedLines += 1;
    }
  }

  return {
    diffText: `${lines.join("\n")}\n`,
    stats: {
      addedLines,
      removedLines,
      changedHunks: hunks.length,
    },
  };
}
