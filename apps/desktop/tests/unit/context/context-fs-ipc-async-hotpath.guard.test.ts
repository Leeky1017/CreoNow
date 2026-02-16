import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.resolve(import.meta.dirname, "../../../main/src/ipc/contextFs.ts"),
  "utf8",
);

// S1: IPC hot path should use async contextFs service variants [ADDED]
assert.match(source, /ensureCreonowDirStructureAsync/);
assert.match(source, /getCreonowDirStatusAsync/);
assert.match(source, /listCreonowFilesAsync/);
assert.match(source, /readCreonowTextFileAsync/);

assert.doesNotMatch(
  source,
  /const ensured = ensureCreonowDirStructure\(/,
  "IPC handlers should not call sync ensure function directly",
);
assert.doesNotMatch(
  source,
  /const status = getCreonowDirStatus\(/,
  "IPC handlers should not call sync status function directly",
);
