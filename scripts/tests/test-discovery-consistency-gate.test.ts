import assert from "node:assert/strict";
import path from "node:path";

import {
  parseVitestJsonReport,
  toBucket,
} from "../test-discovery-consistency-gate";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");

function normalizeDesktopPath(relativePath: string): string {
  return path.resolve(desktopRoot, relativePath).split(path.sep).join("/");
}

// TG-CI-S2
{
  const discovered = new Set<string>([
    normalizeDesktopPath("main/src/passed.test.ts"),
    normalizeDesktopPath("main/src/failed.test.ts"),
    normalizeDesktopPath("main/src/missing.test.ts"),
  ]);
  const report = JSON.stringify({
    testResults: [
      { name: "main/src/passed.test.ts", status: "passed" },
      { name: "main/src/failed.test.ts", status: "failed" },
    ],
  });

  const execution = parseVitestJsonReport(report, "pnpm exec vitest run");
  const bucket = toBucket(discovered, execution.executed, execution.failed);

  assert.equal(bucket.executedCount, 2);
  assert.deepEqual(bucket.missing, [normalizeDesktopPath("main/src/missing.test.ts")]);
  assert.deepEqual(bucket.failed, [normalizeDesktopPath("main/src/failed.test.ts")]);
}

// TG-CI-S3
{
  const execution = parseVitestJsonReport("", "pnpm exec vitest run");

  assert.equal(execution.executed.size, 0);
  assert.deepEqual([...execution.failed], ["pnpm exec vitest run"]);
}
