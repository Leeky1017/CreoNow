import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../..");
}

function builtinSkillNames(): string[] {
  const dir = path.join(
    repoRoot(),
    "apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills",
  );
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * S0: 内置技能清单完整 [ADDED]
 * should expose exactly 8 builtin skill directories
 */
{
  assert.deepEqual(builtinSkillNames(), [
    "condense",
    "continue",
    "expand",
    "polish",
    "rewrite",
    "style-transfer",
    "summarize",
    "translate",
  ]);
}
