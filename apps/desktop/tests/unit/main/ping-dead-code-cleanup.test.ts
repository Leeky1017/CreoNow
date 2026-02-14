import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../../../main/src/index.ts");
const indexSource = readFileSync(indexPath, "utf8");

const pingBlockStart = indexSource.indexOf(
  'guardedIpcMain.handle(\n    "app:system:ping",',
);
assert.notEqual(
  pingBlockStart,
  -1,
  "S2-DC-PING-S1: ping handler registration must exist in main index",
);

const pingBlockEnd = indexSource.indexOf(
  'guardedIpcMain.handle(\n    "db:debug:tablenames",',
  pingBlockStart,
);
assert.notEqual(
  pingBlockEnd,
  -1,
  "S2-DC-PING-S1: ping block boundary must stay parsable",
);

const pingBlock = indexSource.slice(pingBlockStart, pingBlockEnd);

// S2-DC-PING-S1
// ping contract must keep successful envelope output.
assert.match(
  pingBlock,
  /return\s+\{\s*ok:\s*true,\s*data:\s*\{\s*\}\s*\};/su,
  "S2-DC-PING-S1: ping handler must still return { ok: true, data: {} }",
);

// S2-DC-PING-S1
// dead/unreachable catch branch must be removed without changing envelope.
assert.equal(
  /\bcatch\b/u.test(pingBlock),
  false,
  "S2-DC-PING-S1: ping handler should not keep unreachable catch branch",
);
assert.equal(
  pingBlock.includes("Ping failed"),
  false,
  "S2-DC-PING-S1: ping handler should not expose obsolete ping failure branch",
);
