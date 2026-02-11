import assert from "node:assert/strict";

import {
  applyHunkDecisions,
  computeDiffHunks,
  unifiedDiff,
} from "../../renderer/src/lib/diff/unifiedDiff";

const diff = unifiedDiff({ oldText: "Hello\r\nWorld", newText: "Hi\nWorld" });

assert.equal(
  diff,
  unifiedDiff({ oldText: "Hello\r\nWorld", newText: "Hi\nWorld" }),
);
assert.ok(diff.startsWith("--- old\n+++ new\n"));
assert.ok(diff.includes("@@ -1,1 +1,1 @@\n"));
assert.ok(diff.includes("-Hello\n"));
assert.ok(diff.includes("+Hi\n"));

assert.equal(unifiedDiff({ oldText: "same", newText: "same" }), "");

const multiHunksOld = "line-1\nkeep\nline-3\nkeep-2\nline-5";
const multiHunksNew = "line-1-edit\nkeep\nline-3\nkeep-2\nline-5-edit";

const hunks = computeDiffHunks({
  oldText: multiHunksOld,
  newText: multiHunksNew,
});
assert.equal(hunks.length, 2);
assert.equal(hunks[0]?.oldStart, 1);
assert.equal(hunks[1]?.oldStart, 5);

const partiallyApplied = applyHunkDecisions({
  oldText: multiHunksOld,
  newText: multiHunksNew,
  decisions: ["accepted", "rejected"],
});
assert.equal(partiallyApplied, "line-1-edit\nkeep\nline-3\nkeep-2\nline-5");
