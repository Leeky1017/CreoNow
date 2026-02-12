import assert from "node:assert/strict";

import { GLOBAL_IDENTITY_PROMPT } from "../identityPrompt";

const getXmlBlockContent = (source: string, tag: string): string => {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = source.indexOf(open);
  const end = source.indexOf(close);

  assert.ok(start >= 0, `missing opening tag ${open}`);
  assert.ok(end > start, `missing closing tag ${close}`);

  return source.slice(start + open.length, end);
};

const runCase = (name: string, fn: () => void): void => {
  try {
    fn();
  } catch (error) {
    throw new Error(`${name} failed`, { cause: error });
  }
};

runCase("S1 should be a string containing all five XML block pairs", () => {
  assert.equal(typeof GLOBAL_IDENTITY_PROMPT, "string");
  assert.ok(GLOBAL_IDENTITY_PROMPT.trim().length > 0, "must be non-empty");

  for (const tag of [
    "identity",
    "writing_awareness",
    "role_fluidity",
    "behavior",
    "context_awareness",
  ]) {
    assert.ok(
      GLOBAL_IDENTITY_PROMPT.includes(`<${tag}>`) &&
        GLOBAL_IDENTITY_PROMPT.includes(`</${tag}>`),
      `must contain <${tag}> block pair`,
    );
  }
});

runCase("S2 should include writing awareness core concepts", () => {
  const writingAwareness = getXmlBlockContent(
    GLOBAL_IDENTITY_PROMPT,
    "writing_awareness",
  );

  assert.ok(
    writingAwareness.includes("Show don't tell") ||
      writingAwareness.includes("展示而非叙述"),
    "writing_awareness must mention Show don't tell",
  );
  assert.ok(
    writingAwareness.includes("blocking") || writingAwareness.includes("场景"),
    "writing_awareness must mention blocking/scenes",
  );
  assert.ok(
    writingAwareness.includes("POV") ||
      writingAwareness.includes("叙事") ||
      writingAwareness.includes("第一人称"),
    "writing_awareness must mention POV/narrative",
  );
  assert.ok(
    writingAwareness.includes("narrative structure"),
    "writing_awareness must mention narrative structure",
  );
  assert.ok(
    writingAwareness.includes("characterization"),
    "writing_awareness must mention characterization",
  );
});

runCase("S3 should define five roles in role_fluidity block", () => {
  const roleFluidity = getXmlBlockContent(GLOBAL_IDENTITY_PROMPT, "role_fluidity");

  for (const role of ["ghostwriter", "muse", "editor", "actor", "painter"]) {
    assert.ok(roleFluidity.includes(role), `must mention role: ${role}`);
  }
});
