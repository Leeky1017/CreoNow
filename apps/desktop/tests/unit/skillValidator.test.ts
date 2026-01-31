import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadSkillFile } from "../../main/src/services/skills/skillLoader";
import { validateSkillFrontmatter } from "../../main/src/services/skills/skillValidator";

type JsonObject = Record<string, unknown>;

/**
 * Read `details.fieldName` safely from an unknown error details object.
 */
function getFieldName(details: unknown): string | null {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return null;
  }
  const obj = details as JsonObject;
  const value = obj.fieldName;
  return typeof value === "string" ? value : null;
}

{
  const res = validateSkillFrontmatter({
    frontmatter: {
      id: "builtin:bad-context-rules",
      name: "Bad Context Rules",
      version: "1.0.0",
      scope: "builtin",
      packageId: "pkg.creonow.builtin",
      context_rules: {
        surrounding: 10,
        unknown_key: true,
      },
      prompt: { system: "x", user: "y" },
    },
    inferred: {
      scope: "builtin",
      packageId: "pkg.creonow.builtin",
      version: "1.0.0",
    },
  });

  assert.equal(res.ok, false);
  if (res.ok) {
    throw new Error("Expected invalid skill frontmatter");
  }
  assert.equal(res.error.code, "INVALID_ARGUMENT");
  assert.equal(getFieldName(res.error.details), "context_rules.unknown_key");
}

{
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-skill-yaml-"));
  const filePath = path.join(dir, `SKILL-${randomUUID()}.md`);

  const content = `---
id: builtin:yaml-error
name: YAML Error
version: "1.0.0"
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 10
prompt:
  system: "x"
  user: "y"
invalid_yaml: [
---

# Body
`;

  await fs.writeFile(filePath, content, "utf8");

  const loaded = loadSkillFile({
    ref: {
      scope: "builtin",
      packageId: "pkg.creonow.builtin",
      version: "1.0.0",
      skillDirName: "yaml-error",
      filePath,
    },
  });

  assert.equal(loaded.valid, false);
  assert.equal(loaded.error_code, "INVALID_ARGUMENT");
  assert.ok(
    typeof loaded.error_message === "string" &&
      loaded.error_message.includes("Invalid YAML frontmatter"),
  );
}

