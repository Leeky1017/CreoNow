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

// TG-CI-S4: skipped suite must NOT be treated as a successful execution
// Regression guard for the audit finding: "parseVitestJsonReport treats
// status:'skipped' as executed:true, failed:false."
{
  const report = JSON.stringify({
    testResults: [{ name: "main/src/bar.test.ts", status: "skipped" }],
  });
  const execution = parseVitestJsonReport(report, "pnpm exec vitest run");
  const normalized = normalizeDesktopPath("main/src/bar.test.ts");

  // Must appear in executed (for coverage accounting)
  assert.ok(execution.executed.has(normalized), "skipped suite should appear in executed set");
  // Must also appear in failed so the gate does not silently accept it
  assert.ok(execution.failed.has(normalized), "skipped suite must be in failed set");
}

// TG-CI-S5: todo / pending / cancelled / unknown are also treated as failures
{
  for (const nonPassedStatus of ["todo", "pending", "cancelled", "unknown-future-status"]) {
    const report = JSON.stringify({
      testResults: [{ name: `main/src/${nonPassedStatus}.test.ts`, status: nonPassedStatus }],
    });
    const execution = parseVitestJsonReport(report, "pnpm exec vitest run");
    const normalized = normalizeDesktopPath(`main/src/${nonPassedStatus}.test.ts`);

    assert.ok(
      execution.failed.has(normalized),
      `status "${nonPassedStatus}" must be in failed set`,
    );
  }
}

// TG-CI-S6: passed suite is NOT added to failed set (baseline sanity)
{
  const report = JSON.stringify({
    testResults: [{ name: "main/src/green.test.ts", status: "passed" }],
  });
  const execution = parseVitestJsonReport(report, "pnpm exec vitest run");
  const normalized = normalizeDesktopPath("main/src/green.test.ts");

  assert.ok(execution.executed.has(normalized), "passed suite should be in executed set");
  assert.ok(!execution.failed.has(normalized), "passed suite must NOT be in failed set");
}
