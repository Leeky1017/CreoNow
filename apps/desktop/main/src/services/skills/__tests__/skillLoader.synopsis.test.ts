import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Logger } from "../../../logging/logger";
import { loadSkills } from "../skillLoader";

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../../../");
}

function buildLogger(logPath: string): Logger {
  return {
    logPath,
    info: () => {},
    error: () => {},
  };
}

/**
 * S3-SYN-SKILL-S1 [ADDED]
 * loads builtin synopsis skill definition
 */
{
  const globalRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-synopsis-loader-global-"),
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

  const synopsis = loaded.data.skills.find((skill) => skill.id === "builtin:synopsis");
  assert.ok(synopsis, "synopsis skill must be discoverable by loader");
  assert.equal(synopsis?.scope, "builtin");
  assert.equal(synopsis?.valid, true);
}

/**
 * S3-SYN-SKILL-S3 [ADDED]
 * fails fast when synopsis skill definition violates schema
 */
{
  const builtinRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-synopsis-loader-builtin-"),
  );
  const globalRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-synopsis-loader-global-"),
  );

  const validRewriteFile = path.join(
    builtinRoot,
    "packages",
    "pkg.creonow.builtin",
    "1.0.0",
    "skills",
    "rewrite",
    "SKILL.md",
  );

  const invalidSynopsisFile = path.join(
    builtinRoot,
    "packages",
    "pkg.creonow.builtin",
    "1.0.0",
    "skills",
    "synopsis",
    "SKILL.md",
  );

  await fs.mkdir(path.dirname(validRewriteFile), { recursive: true });
  await fs.mkdir(path.dirname(invalidSynopsisFile), { recursive: true });
  await fs.mkdir(path.join(globalRoot, "packages"), { recursive: true });

  await fs.writeFile(
    validRewriteFile,
    `---
id: builtin:rewrite
name: Rewrite
description: Rewrite selected text.
version: "1.0.0"
tags: ["writing", "rewrite"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1200
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

# builtin:rewrite
`,
    "utf8",
  );

  await fs.writeFile(
    invalidSynopsisFile,
    `---
id: builtin:synopsis
name: Synopsis
description: Generate chapter synopsis.
version: "1.0.0"
tags: ["writing", "summary", "synopsis"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1500
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
output:
  minChars: 120
  maxChars: 320
  singleParagraph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
  user: |
    {{input}}
---

# builtin:synopsis
`,
    "utf8",
  );

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

  const synopsis = loaded.data.skills.find((skill) => skill.id === "builtin:synopsis");
  assert.ok(synopsis, "synopsis skill entry should be present");
  assert.equal(synopsis?.valid, false);
  assert.equal(synopsis?.error_code, "INVALID_ARGUMENT");

  const rewrite = loaded.data.skills.find((skill) => skill.id === "builtin:rewrite");
  assert.ok(rewrite, "other skills should still be loaded");
  assert.equal(rewrite?.valid, true);
}
