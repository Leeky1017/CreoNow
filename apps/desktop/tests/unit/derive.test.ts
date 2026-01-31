import assert from "node:assert/strict";

import { deriveContent } from "../../main/src/services/documents/derive";

const sampleDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "World" }],
    },
  ],
} as const;

const first = deriveContent({ contentJson: sampleDoc });
if (!first.ok) {
  throw new Error(`Expected ok derive, got: ${first.error.code}`);
}
assert.equal(first.data.contentText, "Hello\nWorld");

const second = deriveContent({ contentJson: sampleDoc });
if (!second.ok) {
  throw new Error(`Expected ok derive, got: ${second.error.code}`);
}
assert.equal(second.data.contentText, first.data.contentText);
assert.equal(second.data.contentMd, first.data.contentMd);
