import assert from "node:assert/strict";

import { assembleSystemPrompt } from "../assembleSystemPrompt";
import { GLOBAL_IDENTITY_PROMPT } from "../identityPrompt";

// --- S1: with no optional layers includes identity blocks ---

{
  const result = assembleSystemPrompt({ globalIdentity: GLOBAL_IDENTITY_PROMPT });

  assert.ok(result.includes("<identity>"), "must contain <identity>");
  assert.ok(result.includes("<writing_awareness>"), "must contain <writing_awareness>");
  assert.ok(result.includes("<role_fluidity>"), "must contain <role_fluidity>");
}

// --- S1: never returns null or empty string ---

{
  const result = assembleSystemPrompt({ globalIdentity: GLOBAL_IDENTITY_PROMPT });

  assert.equal(typeof result, "string");
  assert.ok(result.trim().length > 0, "must be non-empty");
}

// --- S2: skill prompt appears after identity, before context overlay ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "Polish the text carefully.",
    contextOverlay: "Current chapter: Chapter 10",
  });

  const identityEnd = result.indexOf("</context_awareness>");
  const skillPos = result.indexOf("Polish the text carefully.");
  const contextPos = result.indexOf("Current chapter: Chapter 10");

  assert.ok(identityEnd > -1, "identity end must be found");
  assert.ok(skillPos > identityEnd, "skill must come after identity");
  assert.ok(contextPos > skillPos, "context must come after skill");
}

// --- S3: memory overlay appears after skill prompt, before context overlay ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "Polish the text.",
    memoryOverlay: "偏好短句，节奏紧凑",
    contextOverlay: "Current chapter: Chapter 5",
  });

  const skillPos = result.indexOf("Polish the text.");
  const memoryPos = result.indexOf("偏好短句，节奏紧凑");
  const contextPos = result.indexOf("Current chapter: Chapter 5");

  assert.ok(memoryPos > skillPos, "memory must come after skill");
  assert.ok(contextPos > memoryPos, "context must come after memory");
}

// --- Full order: identity → userRules → skill → mode → memory → context ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    userRules: "USER_RULES_MARKER",
    skillSystemPrompt: "SKILL_PROMPT_MARKER",
    modeHint: "MODE_HINT_MARKER",
    memoryOverlay: "MEMORY_OVERLAY_MARKER",
    contextOverlay: "CONTEXT_OVERLAY_MARKER",
  });

  const positions = [
    result.indexOf("<identity>"),
    result.indexOf("USER_RULES_MARKER"),
    result.indexOf("SKILL_PROMPT_MARKER"),
    result.indexOf("MODE_HINT_MARKER"),
    result.indexOf("MEMORY_OVERLAY_MARKER"),
    result.indexOf("CONTEXT_OVERLAY_MARKER"),
  ];

  for (const pos of positions) {
    assert.ok(pos > -1, "all markers must be found");
  }

  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i] > positions[i - 1],
      `position[${i}] must be after position[${i - 1}]`,
    );
  }
}

// --- Skips empty/whitespace-only optional layers ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "",
    modeHint: "   ",
    memoryOverlay: undefined,
    contextOverlay: "Some context",
  });

  assert.ok(result.includes("<identity>"), "identity must be present");
  assert.ok(result.includes("Some context"), "context must be present");
  assert.ok(
    !result.includes("\n\n\n\n"),
    "no quadruple newlines from skipped layers",
  );
}

// --- Always returns string type (never null) ---

{
  const result = assembleSystemPrompt({ globalIdentity: GLOBAL_IDENTITY_PROMPT });

  assert.notEqual(result, null);
  assert.notEqual(result, undefined);
  assert.equal(typeof result, "string");
}
