import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ciWorkflow = readFileSync(
  path.join(repoRoot, ".github/workflows/ci.yml"),
  "utf8",
);

// TG-CI-S1
// discovery consistency should be a blocking gate once adopted
assert.ok(
  !/test-discovery-consistency:[\s\S]*continue-on-error:\s*true/u.test(
    ciWorkflow,
  ),
  "test-discovery-consistency must not be marked continue-on-error",
);
