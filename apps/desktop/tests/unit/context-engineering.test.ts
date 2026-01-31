import assert from "node:assert/strict";

import { assembleContext } from "../../renderer/src/lib/ai/contextAssembler";
import { redactText } from "../../../../packages/shared/redaction/redact";

const base = assembleContext({
  rules: [{ sourceRef: ".creonow/rules/style.md", text: "RULES v1" }],
  settings: [{ sourceRef: ".creonow/settings/world.md", text: "SETTINGS v1" }],
  retrieved: [],
  immediate: [{ sourceRef: "immediate:ai_panel_input", text: "hello" }],
  maxInputTokens: 4000,
  redactionEvidence: [],
});

const repeat = assembleContext({
  rules: [{ sourceRef: ".creonow/rules/style.md", text: "RULES v1" }],
  settings: [{ sourceRef: ".creonow/settings/world.md", text: "SETTINGS v1" }],
  retrieved: [],
  immediate: [{ sourceRef: "immediate:ai_panel_input", text: "hello" }],
  maxInputTokens: 4000,
  redactionEvidence: [],
});

assert.equal(base.hashes.stablePrefixHash, repeat.hashes.stablePrefixHash);
assert.equal(base.hashes.promptHash, repeat.hashes.promptHash);

const immediateChanged = assembleContext({
  rules: [{ sourceRef: ".creonow/rules/style.md", text: "RULES v1" }],
  settings: [{ sourceRef: ".creonow/settings/world.md", text: "SETTINGS v1" }],
  retrieved: [],
  immediate: [{ sourceRef: "immediate:ai_panel_input", text: "world" }],
  maxInputTokens: 4000,
  redactionEvidence: [],
});

assert.equal(base.hashes.stablePrefixHash, immediateChanged.hashes.stablePrefixHash);
assert.notEqual(base.hashes.promptHash, immediateChanged.hashes.promptHash);

const rulesChanged = assembleContext({
  rules: [{ sourceRef: ".creonow/rules/style.md", text: "RULES v2" }],
  settings: [{ sourceRef: ".creonow/settings/world.md", text: "SETTINGS v1" }],
  retrieved: [],
  immediate: [{ sourceRef: "immediate:ai_panel_input", text: "hello" }],
  maxInputTokens: 4000,
  redactionEvidence: [],
});

assert.notEqual(base.hashes.stablePrefixHash, rulesChanged.hashes.stablePrefixHash);

const redaction = redactText({
  text: "apiKey=sk-THIS_SHOULD_BE_REDACTED path=C:\\Users\\Alice\\secret",
  sourceRef: ".creonow/rules/style.md",
});
assert(!redaction.redactedText.includes("sk-THIS_SHOULD_BE_REDACTED"));
assert(redaction.redactedText.includes("***REDACTED***"));
assert(
  redaction.evidence.some((e) => e.patternId === "openai_api_key_sk" && e.matchCount >= 1),
);

