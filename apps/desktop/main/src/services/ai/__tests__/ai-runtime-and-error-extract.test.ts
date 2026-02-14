import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { mapUpstreamStatusToIpcErrorCode } from "../aiService";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const aiServicePath = path.resolve(testDir, "../aiService.ts");
const aiServiceSource = fs.readFileSync(aiServicePath, "utf8");

assert.match(
  aiServiceSource,
  /from "\.\/runtimeConfig"/,
  "AI-S1-ASE-S1: aiService must delegate runtime logic to runtimeConfig module",
);
assert.match(
  aiServiceSource,
  /from "\.\/errorMapper"/,
  "AI-S1-ASE-S1: aiService must delegate upstream error mapping to errorMapper module",
);

const forbiddenInlineFunctions = [
  "function modeSystemHint(",
  "function combineSystemText(",
  "function estimateTokenCount(",
  "function parseMaxSkillOutputChars(",
  "function parseChatHistoryTokenBudget(",
  "function resolveSkillTimeoutMs(",
  "function mapUpstreamStatusToIpcErrorCode(",
];

for (const signature of forbiddenInlineFunctions) {
  assert.equal(
    aiServiceSource.includes(signature),
    false,
    `AI-S1-ASE-S1: aiService must not keep duplicated inline logic (${signature})`,
  );
}

assert.equal(mapUpstreamStatusToIpcErrorCode(401), "AI_AUTH_FAILED");
assert.equal(mapUpstreamStatusToIpcErrorCode(403), "AI_AUTH_FAILED");
assert.equal(mapUpstreamStatusToIpcErrorCode(429), "AI_RATE_LIMITED");
assert.equal(mapUpstreamStatusToIpcErrorCode(500), "LLM_API_ERROR");
