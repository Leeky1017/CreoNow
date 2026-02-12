export type ConflictResolution = "ours" | "theirs" | "manual";

export type ConflictResolutionInput = {
  conflictId: string;
  resolution: ConflictResolution;
  manualText?: string;
};

export type ThreeWayMergeConflict = {
  conflictId: string;
  index: number;
  baseText: string;
  oursText: string;
  theirsText: string;
  token: string;
};

export type ThreeWayMergeResult = {
  mergedText: string;
  conflicts: ThreeWayMergeConflict[];
};

export type ApplyConflictResolutionResult =
  | { ok: true; mergedText: string }
  | {
      ok: false;
      code: "MISSING_RESOLUTION" | "INVALID_MANUAL_TEXT" | "UNRESOLVED_TOKEN";
      message: string;
    };

/**
 * Build a deterministic placeholder token for one conflict block.
 *
 * Why: conflict sessions persist a template string that is later resolved.
 */
export function buildConflictToken(conflictId: string): string {
  return `<<CN_CONFLICT_${conflictId}>>`;
}

/**
 * Execute line-level three-way merge and materialize unresolved blocks as tokens.
 *
 * Why: merge conflict review must keep non-conflicting lines and isolate conflicts.
 */
export function runThreeWayMerge(args: {
  baseText: string;
  oursText: string;
  theirsText: string;
  createConflictId?: (index: number) => string;
}): ThreeWayMergeResult {
  const createConflictId =
    args.createConflictId ??
    ((index: number): string => {
      return `conflict-${index.toString(10)}`;
    });

  const baseLines = splitLines(args.baseText);
  const oursLines = splitLines(args.oursText);
  const theirsLines = splitLines(args.theirsText);
  const maxLen = Math.max(baseLines.length, oursLines.length, theirsLines.length);

  const mergedLines: string[] = [];
  const conflicts: ThreeWayMergeConflict[] = [];

  for (let index = 0; index < maxLen; index += 1) {
    const baseLine = baseLines[index] ?? "";
    const oursLine = oursLines[index] ?? "";
    const theirsLine = theirsLines[index] ?? "";

    if (oursLine === theirsLine) {
      mergedLines.push(oursLine);
      continue;
    }

    if (oursLine === baseLine) {
      mergedLines.push(theirsLine);
      continue;
    }

    if (theirsLine === baseLine) {
      mergedLines.push(oursLine);
      continue;
    }

    const conflictId = createConflictId(index);
    const token = buildConflictToken(conflictId);

    conflicts.push({
      conflictId,
      index,
      baseText: baseLine,
      oursText: oursLine,
      theirsText: theirsLine,
      token,
    });
    mergedLines.push(token);
  }

  return {
    mergedText: mergedLines.join("\n"),
    conflicts,
  };
}

/**
 * Resolve a merge template using user decisions for each conflict token.
 *
 * Why: resolver must deterministically produce one final merged text before persist.
 */
export function applyConflictResolutions(args: {
  templateText: string;
  conflicts: Array<Pick<ThreeWayMergeConflict, "conflictId" | "oursText" | "theirsText">>;
  resolutions: ConflictResolutionInput[];
}): ApplyConflictResolutionResult {
  const resolutionMap = new Map<string, ConflictResolutionInput>();
  for (const resolution of args.resolutions) {
    resolutionMap.set(resolution.conflictId, resolution);
  }

  let mergedText = args.templateText;

  for (const conflict of args.conflicts) {
    const chosen = resolutionMap.get(conflict.conflictId);
    if (!chosen) {
      return {
        ok: false,
        code: "MISSING_RESOLUTION",
        message: `missing resolution for ${conflict.conflictId}`,
      };
    }

    let replacement = "";
    if (chosen.resolution === "ours") {
      replacement = conflict.oursText;
    } else if (chosen.resolution === "theirs") {
      replacement = conflict.theirsText;
    } else {
      replacement = chosen.manualText ?? "";
      if (replacement.trim().length === 0) {
        return {
          ok: false,
          code: "INVALID_MANUAL_TEXT",
          message: `manual text is required for ${conflict.conflictId}`,
        };
      }
    }

    const token = buildConflictToken(conflict.conflictId);
    mergedText = mergedText.replace(token, replacement);
  }

  if (/<<CN_CONFLICT_[^>]+>>/u.test(mergedText)) {
    return {
      ok: false,
      code: "UNRESOLVED_TOKEN",
      message: "unresolved conflict token remains in merged text",
    };
  }

  return { ok: true, mergedText };
}

/**
 * Normalize line endings and split text by line.
 *
 * Why: merge behavior must be stable across Windows and POSIX inputs.
 */
function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  return text.replaceAll("\r\n", "\n").split("\n");
}
