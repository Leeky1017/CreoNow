import assert from "node:assert/strict";

import {
  extractAnthropicDelta,
  extractAnthropicText,
  extractOpenAiContentText,
  extractOpenAiDelta,
  extractOpenAiModels,
  extractOpenAiText,
  providerDisplayName,
} from "../aiPayloadParsers";

// H6A-S1: parser helpers are extracted into a dedicated module with stable behavior [ADDED]
assert.equal(
  extractOpenAiContentText([{ text: "hello" }, " ", { content: "world" }]),
  "hello world",
);
assert.equal(
  extractOpenAiText({ choices: [{ message: { content: "answer" } }] }),
  "answer",
);
assert.equal(
  extractOpenAiDelta({
    choices: [{ delta: { content: [{ text: "chunk" }] } }],
  }),
  "chunk",
);
assert.equal(
  extractAnthropicText({ content: [{ text: "anthropic answer" }] }),
  "anthropic answer",
);
assert.equal(extractAnthropicDelta({ delta: { text: "stream" } }), "stream");

assert.deepEqual(
  extractOpenAiModels({
    data: [
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1" },
      { id: "o3-mini", display_name: "o3 mini" },
    ],
  }),
  [
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "o3-mini", name: "o3 mini" },
  ],
);

assert.equal(providerDisplayName("proxy"), "Proxy");
assert.equal(providerDisplayName("openai"), "OpenAI");
assert.equal(providerDisplayName("anthropic"), "Anthropic");
