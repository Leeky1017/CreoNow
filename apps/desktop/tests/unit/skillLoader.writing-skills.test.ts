import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Logger } from "../../main/src/logging/logger";
import { loadSkills } from "../../main/src/services/skills/skillLoader";

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../..");
}

function buildLogger(logPath: string): Logger {
  return {
    logPath,
    info: () => {},
    error: () => {},
  };
}

{
  // S2-WS-1: loader must discover all 5 writing skills with stable ids.
  const globalRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-writing-skills-global-readonly-"),
  );
  await fs.mkdir(path.join(globalRoot, "packages"), { recursive: true });

  const loaded = loadSkills({
    logger: buildLogger(path.join(globalRoot, "main.log")),
    roots: {
      builtinSkillsDir: path.join(repoRoot(), "apps/desktop/main/skills"),
      globalSkillsDir: globalRoot,
      projectSkillsDir: null,
    },
  });

  assert.equal(loaded.ok, true);
  if (!loaded.ok) {
    throw new Error("Expected loadSkills to return ok result");
  }

  assert.equal(loaded.data.scanErrors.length, 0);

  const writingSkills = loaded.data.skills
    .filter((skill) =>
      [
        "builtin:write",
        "builtin:expand",
        "builtin:describe",
        "builtin:shrink",
        "builtin:dialogue",
      ].includes(skill.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  assert.deepEqual(
    writingSkills.map((skill) => skill.id),
    [
      "builtin:describe",
      "builtin:dialogue",
      "builtin:expand",
      "builtin:shrink",
      "builtin:write",
    ],
  );
  assert.deepEqual(
    writingSkills.map((skill) => skill.valid),
    [true, true, true, true, true],
  );
}

{
  // S2-WS-2: missing required fields must surface diagnosable failures.
  const builtinRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-writing-skills-builtin-"),
  );
  const globalRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-writing-skills-global-"),
  );

  const brokenSkillFile = path.join(
    builtinRoot,
    "packages",
    "pkg.creonow.builtin",
    "1.0.0",
    "skills",
    "dialogue",
    "SKILL.md",
  );

  await fs.mkdir(path.dirname(brokenSkillFile), { recursive: true });
  await fs.writeFile(
    brokenSkillFile,
    `---
id: builtin:dialogue
description: dialogue skill without name field.
version: "1.0.0"
scope: builtin
packageId: pkg.creonow.builtin
kind: single
context_rules:
  surrounding: 500
  user_preferences: true
  style_guide: true
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are CreoNow's writing assistant.
  user: |
    {{input}}
---

# builtin:dialogue
`,
    "utf8",
  );

  await fs.mkdir(path.join(globalRoot, "packages"), { recursive: true });

  const loaded = loadSkills({
    logger: buildLogger(path.join(globalRoot, "main.log")),
    roots: {
      builtinSkillsDir: builtinRoot,
      globalSkillsDir: globalRoot,
      projectSkillsDir: null,
    },
  });

  assert.equal(loaded.ok, true);
  if (!loaded.ok) {
    throw new Error("Expected loadSkills to return ok result");
  }

  assert.equal(loaded.data.scanErrors.length, 0);
  assert.equal(loaded.data.skills.length, 1);

  const dialogue = loaded.data.skills[0];
  assert.ok(dialogue);
  assert.equal(dialogue?.id, "builtin:dialogue");
  assert.equal(dialogue?.valid, false);
  assert.equal(dialogue?.error_code, "INVALID_ARGUMENT");
  assert.equal(dialogue?.error_message, "name is required");
}
