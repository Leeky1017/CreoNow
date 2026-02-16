import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const packageJsonPath = path.join(repoRoot, "package.json");
const runnerScriptPath = path.join(repoRoot, "scripts/run-discovered-tests.ts");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};
const runnerScript = readFileSync(runnerScriptPath, "utf8");

// S1: unit/integration must use discovery runner entrypoint [ADDED]
assert.equal(
  packageJson.scripts?.["test:unit"],
  "tsx scripts/run-discovered-tests.ts --mode unit",
);
assert.equal(
  packageJson.scripts?.["test:integration"],
  "tsx scripts/run-discovered-tests.ts --mode integration",
);

// S2: discovery runner must include integration + perf roots [ADDED]
assert.match(
  runnerScript,
  /apps\/desktop\/tests\/integration/,
  "integration discovery root is required",
);
assert.match(
  runnerScript,
  /apps\/desktop\/tests\/perf/,
  "perf discovery root is required",
);

// S3: unit discovery must include desktop unit + main source tests [ADDED]
assert.match(
  runnerScript,
  /apps\/desktop\/tests\/unit/,
  "unit discovery root is required",
);
assert.match(
  runnerScript,
  /apps\/desktop\/main\/src/,
  "main source test discovery root is required",
);
