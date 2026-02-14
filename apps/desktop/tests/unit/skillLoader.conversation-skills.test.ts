import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "yaml";

import {
  discoverSkillFiles,
  loadSkillFile,
  type SkillFileRef,
} from "../../main/src/services/skills/skillLoader";

type JsonObject = Record<string, unknown>;

const CONVERSATION_SKILLS = ["brainstorm", "roleplay", "critique"] as const;

const SEMANTIC_CUES: Record<(typeof CONVERSATION_SKILLS)[number], string[]> = {
  brainstorm: ["brainstorm", "idea", "ideation", "思路", "点子"],
  roleplay: ["roleplay", "persona", "role", "角色", "对话"],
  critique: ["critique", "feedback", "review", "批判", "评审"],
};

const BANNED_WRITING_TERMS = ["续写", "扩写", "描写"] as const;

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../..");
}

function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("frontmatter must be a JSON object");
  }
  return value as JsonObject;
}

function parseSkillMarkdown(filePath: string): {
  frontmatter: JsonObject;
  body: string;
} {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, `${filePath} must include YAML frontmatter`);

  const parsed = parseDocument(match[1] ?? "");
  assert.equal(
    parsed.errors.length,
    0,
    `${filePath} has invalid YAML frontmatter`,
  );

  return {
    frontmatter: asObject(parsed.toJSON()),
    body: (match[2] ?? "").trim(),
  };
}

function skillRefs(): {
  refs: SkillFileRef[];
  byName: Map<string, SkillFileRef>;
} {
  const packagesDir = path.join(
    repoRoot(),
    "apps/desktop/main/skills/packages",
  );
  const discovered = discoverSkillFiles({
    scope: "builtin",
    packagesDir,
  });
  assert.equal(discovered.errors.length, 0, "builtin scan should not fail");

  const builtinRefs = discovered.refs.filter(
    (ref) => ref.packageId === "pkg.creonow.builtin" && ref.version === "1.0.0",
  );

  return {
    refs: builtinRefs,
    byName: new Map(builtinRefs.map((ref) => [ref.skillDirName, ref])),
  };
}

{
  // S2-CS-1: loader discovers all conversation builtin skills.
  const { refs, byName } = skillRefs();
  const discoveredNames = refs.map((ref) => ref.skillDirName);

  for (const skillName of CONVERSATION_SKILLS) {
    assert.equal(
      discoveredNames.includes(skillName),
      true,
      `expected ${skillName} to be discoverable`,
    );

    const ref = byName.get(skillName);
    assert.ok(ref, `${skillName} ref should exist`);
    const loaded = loadSkillFile({ ref });

    assert.equal(
      loaded.valid,
      true,
      `${skillName} should load as a valid skill`,
    );
    assert.equal(loaded.id, `builtin:${skillName}`);
  }
}

{
  // S2-CS-2: conversation skills must keep dialogue semantics and avoid writing-skill overlap.
  const { byName } = skillRefs();

  for (const skillName of CONVERSATION_SKILLS) {
    const ref = byName.get(skillName);
    assert.ok(ref, `${skillName} ref should exist`);

    const parsed = parseSkillMarkdown(ref.filePath);
    const prompt = asObject(parsed.frontmatter.prompt);
    const systemPrompt = typeof prompt.system === "string" ? prompt.system : "";
    const description =
      typeof parsed.frontmatter.description === "string"
        ? parsed.frontmatter.description
        : "";

    const responsibilityText =
      `${description}\n${systemPrompt}\n${parsed.body}`.toLowerCase();

    for (const banned of BANNED_WRITING_TERMS) {
      assert.equal(
        responsibilityText.includes(banned),
        false,
        `${skillName} responsibility must not be defined as ${banned}`,
      );
    }

    const hasCue = SEMANTIC_CUES[skillName].some((cue) =>
      responsibilityText.includes(cue.toLowerCase()),
    );
    assert.equal(
      hasCue,
      true,
      `${skillName} must expose conversation-specific semantic cues`,
    );
  }
}

{
  // S2-CS-3: malformed conversation skill docs should fail with diagnosable validation errors.
  const tempDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), `creonow-conversation-skill-${randomUUID()}-`),
  );
  const filePath = path.join(tempDir, "SKILL.md");
  const invalidContent = `---
id: builtin:brainstorm
name: Brainstorm
description: Broken skill fixture
version: "1.0.0"
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 100
prompt:
  system: "ok"
---

# broken
`;

  await fsp.writeFile(filePath, invalidContent, "utf8");
  const loaded = loadSkillFile({
    ref: {
      scope: "builtin",
      packageId: "pkg.creonow.builtin",
      version: "1.0.0",
      skillDirName: "brainstorm",
      filePath,
    },
  });

  assert.equal(loaded.valid, false);
  assert.equal(loaded.error_code, "INVALID_ARGUMENT");
  assert.ok(
    typeof loaded.error_message === "string" &&
      loaded.error_message.includes("prompt.user is required"),
  );
}
