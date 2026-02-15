import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  resetBuiltInTemplateCacheForTests,
  resolveBuiltInTemplateDirectory,
} from "../templateService";

async function main(): Promise<void> {
  resetBuiltInTemplateCacheForTests();

  const bundledMainModulePath = path.resolve(
    process.cwd(),
    "apps/desktop/dist/main/index.js",
  );
  const bundledExpectedDir = path.resolve(
    process.cwd(),
    "apps/desktop/dist/main/templates/project",
  );
  const sourceFallbackDir = path.resolve(
    process.cwd(),
    "apps/desktop/main/templates/project",
  );
  const expectedDir = fs.existsSync(bundledExpectedDir)
    ? bundledExpectedDir
    : sourceFallbackDir;

  const resolved = resolveBuiltInTemplateDirectory({
    moduleFilePath: bundledMainModulePath,
    cwd: process.cwd(),
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
  assert.equal(path.resolve(resolved.data), expectedDir);

  const missingDir = path.resolve(
    process.cwd(),
    "apps/desktop/main/templates/__missing__",
  );
  const configured = resolveBuiltInTemplateDirectory({
    moduleFilePath: bundledMainModulePath,
    cwd: process.cwd(),
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
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
