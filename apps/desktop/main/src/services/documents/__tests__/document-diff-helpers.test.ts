import assert from "node:assert/strict";

import {
  buildUnifiedDiff,
  computeDiffHunks,
} from "../documentDiffHelpers";

// Scenario Mapping: aud-h6b Core Path Stabilized
{
  const hunks = computeDiffHunks({
    oldText: "alpha\nbeta\n",
    newText: "alpha\ngamma\n",
  });

  assert.equal(hunks.length, 1);
  assert.deepEqual(hunks[0]?.oldLines, ["beta"]);
  assert.deepEqual(hunks[0]?.newLines, ["gamma"]);
}

// Scenario Mapping: aud-h6b Error Path Deterministic
{
  const diff = buildUnifiedDiff({
    oldText: "same",
    newText: "same",
    oldLabel: "a",
    newLabel: "b",
  });

  assert.equal(diff.diffText, "");
  assert.deepEqual(diff.stats, {
    addedLines: 0,
    removedLines: 0,
    changedHunks: 0,
  });
}
