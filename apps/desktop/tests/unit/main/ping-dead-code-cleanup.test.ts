import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../../../main/src/index.ts");
const indexSource = readFileSync(indexPath, "utf8");

describe("ping dead-code cleanup", () => {
  it("S2-DC-PING-S1 keeps ping envelope and removes unreachable catch", () => {
    const pingBlockStart = indexSource.indexOf(
      'guardedIpcMain.handle(\n    "app:system:ping",',
    );
    expect(
      pingBlockStart,
      "S2-DC-PING-S1: ping handler registration must exist in main index",
    ).not.toBe(-1);

    const pingBlockEnd = indexSource.indexOf(
      "registerDbDebugIpcHandlers({",
      pingBlockStart,
    );
    expect(
      pingBlockEnd,
      "S2-DC-PING-S1: ping block boundary must stay parsable",
    ).not.toBe(-1);

    const pingBlock = indexSource.slice(pingBlockStart, pingBlockEnd);

    expect(pingBlock).toMatch(
      /return\s+\{\s*ok:\s*true,\s*data:\s*\{\s*\}\s*\};/su,
    );
    expect(
      /\bcatch\b/u.test(pingBlock),
      "S2-DC-PING-S1: ping handler should not keep unreachable catch branch",
    ).toBe(false);
    expect(
      pingBlock.includes("Ping failed"),
      "S2-DC-PING-S1: ping handler should not expose obsolete ping failure branch",
    ).toBe(false);
  });
});
