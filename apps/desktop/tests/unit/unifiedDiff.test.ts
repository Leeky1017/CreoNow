import assert from "node:assert/strict";

import { unifiedDiff } from "../../renderer/src/lib/diff/unifiedDiff";

const diff = unifiedDiff({ oldText: "Hello\r\nWorld", newText: "Hi\nWorld" });

assert.equal(
  diff,
  unifiedDiff({ oldText: "Hello\r\nWorld", newText: "Hi\nWorld" }),
);
assert.ok(diff.startsWith("--- old\n+++ new\n"));
assert.ok(diff.includes("@@ -1,2 +1,2 @@\n"));
assert.ok(diff.includes("-Hello\n"));
assert.ok(diff.includes("+Hi\n"));

assert.equal(unifiedDiff({ oldText: "same", newText: "same" }), "");
