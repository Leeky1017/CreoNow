import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_FILES = [
  "apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts",
  "apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts",
  "apps/desktop/renderer/src/components/layout/AppShell.test.tsx",
  "apps/desktop/renderer/src/features/editor/EditorPane.test.tsx",
  "apps/desktop/tests/integration/ai-skill-context-integration.test.ts",
  "apps/desktop/tests/integration/ai-stream-lifecycle.test.ts",
  "apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts",
  "apps/desktop/tests/integration/kg/recognition-backpressure.test.ts",
  "apps/desktop/tests/integration/kg/recognition-query-failure-degrade.test.ts",
  "apps/desktop/tests/integration/kg/recognition-queue-cancel.test.ts",
  "apps/desktop/tests/integration/skill-session-queue-limit.test.ts",
  "apps/desktop/tests/unit/kg/kg-recognition-runtime-metrics-split.test.ts",
  "apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts",
  "apps/desktop/tests/unit/main/index.app-ready-catch.test.ts",
] as const;

const FIXED_SLEEP_PATTERN = /setTimeout\s*\(\s*resolve\s*,\s*\d+/g;

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "../../../..");

// CMI-S2-TTF-S1 + CMI-S2-TTF-S2
{
  const offenders: Array<{ file: string; matches: number }> = [];

  for (const relativeFile of TARGET_FILES) {
    const fullPath = path.join(repoRoot, relativeFile);
    const content = fs.readFileSync(fullPath, "utf8");
    const matches = content.match(FIXED_SLEEP_PATTERN);
    if (matches && matches.length > 0) {
      offenders.push({ file: relativeFile, matches: matches.length });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `fixed sleep pattern setTimeout(resolve, <ms>) must be removed from target tests: ${JSON.stringify(offenders)}`,
  );
}
