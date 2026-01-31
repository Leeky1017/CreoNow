type UnifiedDiffArgs = {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
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

/**
 * Generate a deterministic unified diff for display purposes.
 *
 * Why: the AI Apply UI must show a stable preview (same input -> same diff)
 * without depending on external diff tooling.
 */
export function unifiedDiff(args: UnifiedDiffArgs): string {
  if (args.oldText === args.newText) {
    return "";
  }

  const oldLabel = args.oldLabel ?? "old";
  const newLabel = args.newLabel ?? "new";

  const oldLines = splitLines(args.oldText);
  const newLines = splitLines(args.newText);

  const lines: string[] = [];
  lines.push(`--- ${oldLabel}`);
  lines.push(`+++ ${newLabel}`);
  lines.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
  for (const line of oldLines) {
    lines.push(`-${line}`);
  }
  for (const line of newLines) {
    lines.push(`+${line}`);
  }

  return `${lines.join("\n")}\n`;
}

