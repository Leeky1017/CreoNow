import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  resetBuiltInTemplateCacheForTests,
  resolveBuiltInTemplateDirectory,
} from "../templateService";

async function main(): Promise<void> {
  resetBuiltInTemplateCacheForTests();

  const runtimeRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-c12-template-runtime-"),
  );

  try {
    const bundledMainModulePath = path.join(
      runtimeRoot,
      "dist/main/services/projects/templateService.js",
    );
    const bundledExpectedDir = path.join(
      runtimeRoot,
      "dist/main/templates/project",
    );

    await fs.mkdir(path.dirname(bundledMainModulePath), { recursive: true });
    await fs.mkdir(bundledExpectedDir, { recursive: true });
    await fs.writeFile(bundledMainModulePath, "// stub");

    const resolved = resolveBuiltInTemplateDirectory({
      moduleFilePath: bundledMainModulePath,
      cwd: runtimeRoot,
      env: {},
    });

    assert.equal(
      resolved.ok,
      true,
      "bundled runtime should resolve built-in template directory",
    );
    if (!resolved.ok) {
      throw new Error(
        "bundled runtime should resolve built-in template directory",
      );
    }
    assert.equal(path.resolve(resolved.data), path.resolve(bundledExpectedDir));

    const missingDir = path.join(runtimeRoot, "missing-template-dir");
    const configured = resolveBuiltInTemplateDirectory({
      moduleFilePath: bundledMainModulePath,
      cwd: runtimeRoot,
      env: { CREONOW_TEMPLATE_DIR: missingDir },
    });

    assert.equal(
      configured.ok,
      false,
      "invalid explicit template directory must fail deterministically",
    );
    if (configured.ok) {
      throw new Error("expected invalid configured template directory to fail");
    }
    assert.equal(configured.error.field, "template.directory");
  } finally {
    resetBuiltInTemplateCacheForTests();
    await fs.rm(runtimeRoot, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
