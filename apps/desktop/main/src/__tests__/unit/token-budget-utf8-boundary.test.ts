import assert from "node:assert/strict";

import {
  estimateTokens,
  estimateTokensAscii,
  estimateTokensCjk,
  isWithinBudget,
  trimUtf8ToTokenBudget,
} from "@shared/tokenBudget";

{
  const trimmed = trimUtf8ToTokenBudget("你你", 2);
  assert.equal(trimmed, "你");
  assert.equal(trimmed.includes("\uFFFD"), false);
  assert.equal(estimateTokens(trimmed), 2);
}

{
  const trimmed = trimUtf8ToTokenBudget("ab你cd", 1);
  assert.equal(trimmed, "ab");
  assert.equal(trimmed.includes("\uFFFD"), false);
  assert.equal(estimateTokens(trimmed) <= 1, true);
}

{
  assert.equal(estimateTokensCjk("你".repeat(1000)), 1500);
  assert.equal(estimateTokensAscii("a".repeat(1000)), 250);
  assert.equal(estimateTokens("你".repeat(500) + "a".repeat(200)), 800);
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("😀"), 2);
  assert.equal(isWithinBudget("你".repeat(500) + "a".repeat(200), 800), true);
  assert.equal(isWithinBudget("你".repeat(500) + "a".repeat(200), 799), false);
}

console.log("token-budget-utf8-boundary.test.ts: all assertions passed");
