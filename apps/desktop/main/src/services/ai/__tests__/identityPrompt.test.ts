import assert from "node:assert/strict";

import { GLOBAL_IDENTITY_PROMPT } from "../identityPrompt";

// --- GLOBAL_IDENTITY_PROMPT contains all 5 XML blocks ---

assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("<identity>") &&
    GLOBAL_IDENTITY_PROMPT.includes("</identity>"),
  "must contain <identity> block",
);

assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("<writing_awareness>") &&
    GLOBAL_IDENTITY_PROMPT.includes("</writing_awareness>"),
  "must contain <writing_awareness> block",
);

assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("<role_fluidity>") &&
    GLOBAL_IDENTITY_PROMPT.includes("</role_fluidity>"),
  "must contain <role_fluidity> block",
);

assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("<behavior>") &&
    GLOBAL_IDENTITY_PROMPT.includes("</behavior>"),
  "must contain <behavior> block",
);

assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("<context_awareness>") &&
    GLOBAL_IDENTITY_PROMPT.includes("</context_awareness>"),
  "must contain <context_awareness> block",
);

// --- Non-empty string ---

assert.equal(typeof GLOBAL_IDENTITY_PROMPT, "string");
assert.ok(
  GLOBAL_IDENTITY_PROMPT.trim().length > 0,
  "must be non-empty",
);

// --- Writing craft concepts ---

assert.ok(GLOBAL_IDENTITY_PROMPT.includes("blocking"), "must mention blocking");
assert.ok(
  GLOBAL_IDENTITY_PROMPT.includes("Show don't tell"),
  "must mention Show don't tell",
);
assert.ok(GLOBAL_IDENTITY_PROMPT.includes("POV"), "must mention POV");

// --- Role fluidity roles ---

for (const role of ["ghostwriter", "muse", "editor", "actor", "painter"]) {
  assert.ok(
    GLOBAL_IDENTITY_PROMPT.includes(role),
    `must mention role: ${role}`,
  );
}
