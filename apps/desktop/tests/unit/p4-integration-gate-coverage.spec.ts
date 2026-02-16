import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const packageJsonPath = path.join(repoRoot, "package.json");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};

const integrationScript = packageJson.scripts?.["test:integration"] ?? "";

// S4: test:integration 覆盖 P4 关键集成用例 [ADDED]
// should use discovery runner instead of brittle path whitelist
assert.match(
  integrationScript,
  /scripts\/run-discovered-tests\.ts --mode integration/,
  "test:integration should run discovery-based integration execution",
);
