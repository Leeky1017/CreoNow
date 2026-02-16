import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ensureCreonowDirStructureAsync,
  getCreonowDirStatusAsync,
  listCreonowFilesAsync,
  readCreonowTextFileAsync,
} from "../../../main/src/services/context/contextFs";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-contextfs-"));

try {
  const ensured = await ensureCreonowDirStructureAsync(tempRoot);
  assert.equal(ensured.ok, true);

  const status = await getCreonowDirStatusAsync(tempRoot);
  assert.equal(status.ok, true);
  if (!status.ok) {
    throw new Error("status should be ok");
  }
  assert.equal(status.data.exists, true);

  const rulesFile = path.join(tempRoot, ".creonow/rules/custom.md");
  await fs.writeFile(rulesFile, "rule-content", "utf8");

  const listed = await listCreonowFilesAsync({
    projectRootPath: tempRoot,
    scope: "rules",
  });
  assert.equal(listed.ok, true);
  if (!listed.ok) {
    throw new Error("list should be ok");
  }
  assert.equal(
    listed.data.items.some((item) => item.path === ".creonow/rules/custom.md"),
    true,
  );

  const read = await readCreonowTextFileAsync({
    projectRootPath: tempRoot,
    path: ".creonow/rules/custom.md",
  });
  assert.equal(read.ok, true);
  if (!read.ok) {
    throw new Error("read should be ok");
  }
  assert.equal(read.data.content, "rule-content");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
