import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const packageJsonPath = path.join(repoRoot, "package.json");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};

const integrationScript = packageJson.scripts?.["test:integration"] ?? "";

// S4: test:integration 覆盖 P4 关键集成用例 [ADDED]
// should include p4-critical integration tests in gate script
const requiredP4IntegrationTests = [
  "apps/desktop/tests/integration/skill-session-queue-limit.test.ts",
  "apps/desktop/tests/integration/project-switch.autosave.test.ts",
  "apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts",
  "apps/desktop/tests/integration/search/replace-version-snapshot.test.ts",
];

for (const testFile of requiredP4IntegrationTests) {
  assert.match(
    integrationScript,
    new RegExp(escapeRegExp(testFile)),
    `test:integration is missing required P4 integration test: ${testFile}`,
  );
}
