import type {
  DiffError,
  DiffStats,
  DiffStep,
  ProseMirrorTransactionSpec,
} from "./types";
import { DIFF_MAX_CHARS } from "./types";

type DiffOp =
  | { type: "equal"; value: string }
  | { type: "delete"; value: string }
  | { type: "insert"; value: string };

type InternalStep = DiffStep & {
  afterFrom: number;
  afterTo: number;
};

export function makeDiffError(
  code: DiffError["code"],
  message: string,
): DiffError {
  const err = new Error(message) as DiffError;
  Object.defineProperty(err, "code", {
    value: code,
    enumerable: true,
    configurable: true,
  });
  return err;
}

function toUnits(text: string): string[] {
  return Array.from(text);
}

function buildOps(before: readonly string[], after: readonly string[]): DiffOp[] {
  const n = before.length;
  const m = after.length;
  const max = n + m;
  let frontier = new Map<number, number>();
  frontier.set(1, 0);
  const trace: Map<number, number>[] = [];

  for (let d = 0; d <= max; d += 1) {
    trace.push(new Map(frontier));
    const nextFrontier = new Map<number, number>();

    for (let k = -d; k <= d; k += 2) {
      const down = frontier.get(k + 1);
      const right = frontier.get(k - 1);
      const moveDown =
        k === -d || (k !== d && (right ?? Number.NEGATIVE_INFINITY) < (down ?? Number.NEGATIVE_INFINITY));
      let x = moveDown ? (down ?? 0) : (right ?? 0) + 1;
      let y = x - k;

      while (x < n && y < m && before[x] === after[y]) {
        x += 1;
        y += 1;
      }

      nextFrontier.set(k, x);
      if (x >= n && y >= m) {
        trace.push(new Map(nextFrontier));
        return backtrack(trace, before, after);
      }
    }

    frontier = nextFrontier;
  }

  return [];
}

function backtrack(
  trace: readonly Map<number, number>[],
  before: readonly string[],
  after: readonly string[],
): DiffOp[] {
  const operations: DiffOp[] = [];
  let x = before.length;
  let y = after.length;

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const frontier = trace[d - 1];
    const k = x - y;
    const down = frontier.get(k + 1);
    const right = frontier.get(k - 1);
    const moveDown =
      k === -(d - 1) ||
      (k !== d - 1 &&
        (right ?? Number.NEGATIVE_INFINITY) < (down ?? Number.NEGATIVE_INFINITY));
    const prevK = moveDown ? k + 1 : k - 1;
    const prevX = frontier.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      operations.push({ type: "equal", value: before[x - 1] ?? "" });
      x -= 1;
      y -= 1;
    }

    if (d === 1) {
      continue;
    }

    if (x === prevX) {
      operations.push({ type: "insert", value: after[y - 1] ?? "" });
      y -= 1;
    } else {
      operations.push({ type: "delete", value: before[x - 1] ?? "" });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    operations.push({ type: "equal", value: before[x - 1] ?? "" });
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    operations.push({ type: "delete", value: before[x - 1] ?? "" });
    x -= 1;
  }
  while (y > 0) {
    operations.push({ type: "insert", value: after[y - 1] ?? "" });
    y -= 1;
  }

  return operations.reverse();
}

function buildSteps(ops: readonly DiffOp[], after: string): DiffStep[] {
  const steps: InternalStep[] = [];
  let beforeOffset = 0;
  let afterOffset = 0;
  let index = 0;

  while (index < ops.length) {
    const op = ops[index];
    if (op.type === "equal") {
      beforeOffset += op.value.length;
      afterOffset += op.value.length;
      index += 1;
      continue;
    }

    const start = beforeOffset;
    const afterStart = afterOffset;
    let insertedText = "";
    let deletedChars = 0;

    while (index < ops.length && ops[index]?.type !== "equal") {
      const current = ops[index];
      if (current.type === "insert") {
        insertedText += current.value;
      } else if (current.type === "delete") {
        deletedChars += current.value.length;
        beforeOffset += current.value.length;
      }
      index += 1;
    }

    const end = start + deletedChars;
    const afterEnd = afterStart + insertedText.length;
    afterOffset = afterEnd;
    if (deletedChars === 0) {
      steps.push({
        type: "insert",
        from: start,
        to: start,
        text: insertedText,
        afterFrom: afterStart,
        afterTo: afterEnd,
      });
      continue;
    }
    if (insertedText.length === 0) {
      steps.push({
        type: "delete",
        from: start,
        to: end,
        afterFrom: afterStart,
        afterTo: afterEnd,
      });
      continue;
    }
    steps.push({
      type: "replace",
      from: start,
      to: end,
      text: insertedText,
      afterFrom: afterStart,
      afterTo: afterEnd,
    });
  }

  return mergeNearbySteps(steps, after).map(
    ({ afterFrom: _afterFrom, afterTo: _afterTo, ...step }) => step,
  );
}

function mergeNearbySteps(
  steps: readonly InternalStep[],
  after: string,
): InternalStep[] {
  if (steps.length <= 1) {
    return [...steps];
  }

  const merged: InternalStep[] = [];
  let current = { ...steps[0] };

  for (let index = 1; index < steps.length; index += 1) {
    const next = steps[index];
    const gap = next.from - current.to;
    if (gap > 1) {
      merged.push(current);
      current = { ...next };
      continue;
    }

    const from = current.from;
    const to = next.to;
    const afterFrom = current.afterFrom;
    const afterTo = next.afterTo;
    const insertedText = after.slice(afterFrom, afterTo);
    current =
      to === from
        ? {
            type: "insert",
            from,
            to,
            text: insertedText,
            afterFrom,
            afterTo,
          }
        : insertedText.length === 0
          ? {
              type: "delete",
              from,
              to,
              afterFrom,
              afterTo,
            }
          : {
              type: "replace",
              from,
              to,
              text: insertedText,
              afterFrom,
              afterTo,
            };
  }

  merged.push(current);
  return merged;
}

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

  if (before === after) {
    return buildResult([], before, after);
  }

  const steps = buildSteps(buildOps(toUnits(before), toUnits(after)), after);
  return buildResult(steps, before, after);
}

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
        insertions += 1;
        insertedChars += step.text?.length ?? 0;
        break;
      case "delete":
        deletions += 1;
        deletedChars += step.to - step.from;
        break;
      case "replace":
        replacements += 1;
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
