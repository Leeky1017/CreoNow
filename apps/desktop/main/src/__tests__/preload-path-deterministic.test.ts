import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolvePreloadEntryPathFromBuildConfig } from "../runtimePathResolver";

async function main(): Promise<void> {
  const sandboxRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-c12-preload-path-"),
  );

  try {
    const mainModuleDir = path.join(sandboxRoot, "dist/main");
    const preloadDir = path.join(sandboxRoot, "dist/preload");
    const legacyCandidatePath = path.join(preloadDir, "index.js");
    const expectedPath = path.join(preloadDir, "index.cjs");

    await fs.mkdir(mainModuleDir, { recursive: true });
    await fs.mkdir(preloadDir, { recursive: true });
    await fs.writeFile(legacyCandidatePath, "// legacy preload candidate");

    assert.throws(
      () =>
        resolvePreloadEntryPathFromBuildConfig({
          mainModuleDir,
        }),
      (error: unknown) => {
        if (!(error instanceof Error)) {
          return false;
        }
        return error.message.includes(expectedPath);
      },
      "preload resolver should fail when deterministic dist/preload/index.cjs is missing",
    );

    await fs.writeFile(expectedPath, "// deterministic preload entry");

    const resolved = resolvePreloadEntryPathFromBuildConfig({
      mainModuleDir,
    });

    assert.equal(path.resolve(resolved), path.resolve(expectedPath));
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
