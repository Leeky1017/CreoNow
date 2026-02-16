import assert from "node:assert/strict";

import { estimateUtf8TokenCount } from "@shared/tokenBudget";
import { createMockLlmClient } from "../helpers/llm-mock";

// Scenario Mapping: AUD-M3-S1 Core Path Stabilized [ADDED]
{
  const response = "x".repeat(17);
  const llm = createMockLlmClient(response);

  const completed = await llm.complete("prompt");
  const streamed = await llm.stream("prompt", () => {});

  const expected = estimateUtf8TokenCount(response);
  assert.equal(completed.tokens, expected);
  assert.equal(streamed.totalTokens, expected);
}

// Scenario Mapping: AUD-M3-S2 Edge Case (multibyte UTF-8 parity) [ADDED]
{
  const response = "你好，世界";
  const llm = createMockLlmClient(response);

  const completed = await llm.complete("prompt");
  const streamed = await llm.stream("prompt", () => {});

  const expected = estimateUtf8TokenCount(response);
  assert.equal(completed.tokens, expected);
  assert.equal(streamed.totalTokens, expected);
}

// Scenario Mapping: AUD-M3-S3 Error Path Deterministic (empty output) [ADDED]
{
  const response = "";
  const llm = createMockLlmClient(response);

  const completed = await llm.complete("prompt");
  const streamed = await llm.stream("prompt", () => {});

  assert.equal(completed.tokens, 0);
  assert.equal(streamed.totalTokens, 0);
}
