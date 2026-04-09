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
  assert.equal(estimateTokens("𠀀"), 2);
  assert.equal(estimateTokens("ㇰ"), 2);
  assert.equal(estimateTokens("⺀"), 2);
  assert.equal(estimateTokens("⺅"), 2);
  assert.equal(estimateTokens("⼀"), 2);
  assert.equal(estimateTokens("⼈"), 2);
  assert.equal(estimateTokens("㇐"), 2);
  assert.equal(estimateTokens("⼀".repeat(10)), 15);
  assert.equal(isWithinBudget("⼀".repeat(10), 10), false);
  assert.equal(trimUtf8ToTokenBudget("𠀀𠀀", 2), "𠀀");
}

{
  const samples = ["禰󠄀", "你️", "が", "漢︀", "你́⃣"];
  for (const sample of samples) {
    assert.equal(estimateTokens(sample), 3);
    assert.equal(trimUtf8ToTokenBudget(sample, 2), "");
  }
}

{
  assert.equal(estimateTokensCjk("你".repeat(1000)), 1500);
  assert.equal(estimateTokensAscii("a".repeat(1000)), 250);
  assert.equal(estimateTokens("你".repeat(500) + "a".repeat(200)), 800);
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("😀"), 1);
  assert.equal(estimateTokens("❤️"), 2);
  assert.equal(estimateTokens("👩‍💻"), 3);
  assert.equal(trimUtf8ToTokenBudget("👩‍💻abc", 2), "");
  assert.equal(trimUtf8ToTokenBudget("👩‍💻abc", 1), "");
  assert.equal(trimUtf8ToTokenBudget("❤️❤️", 2), "❤️");
  assert.equal(trimUtf8ToTokenBudget("👩‍💻".repeat(2), 2), "");
  assert.equal(isWithinBudget("你".repeat(500) + "a".repeat(200), 800), true);
  assert.equal(isWithinBudget("你".repeat(500) + "a".repeat(200), 799), false);
}

console.log("token-budget-utf8-boundary.test.ts: all assertions passed");
