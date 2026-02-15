import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function readFromRepo(repoRoot: string, rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

const outlinePanel = readFromRepo(
  repoRoot,
  "apps/desktop/renderer/src/features/outline/OutlinePanel.tsx",
);
assert.doesNotMatch(
  outlinePanel,
  /onScrollSync:\s*_onScrollSync/,
  "A1-L-001: placeholder _onScrollSync parameter must be removed",
);

const qualityGatesPanel = readFromRepo(
  repoRoot,
  "apps/desktop/renderer/src/features/quality-gates/QualityGatesPanel.tsx",
);
assert.doesNotMatch(
  qualityGatesPanel,
  /const panelStyles =/,
  "A1-L-002: deprecated panelStyles path must be removed",
);

const techStack = readFromRepo(repoRoot, "docs/references/tech-stack.md");
assert.match(
  techStack,
  /\|\s*docx\s*\|/i,
  "A4-L-002: tech stack must record docx approval",
);
assert.match(
  techStack,
  /\|\s*pdfkit\s*\|/i,
  "A4-L-002: tech stack must record pdfkit approval",
);

const settingsDialog = readFromRepo(
  repoRoot,
  "apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx",
);
assert.match(
  settingsDialog,
  /TODO.*#571/,
  "A7-L-017: SettingsDialog TODO must reference issue #571",
);

const versionHistory = readFromRepo(
  repoRoot,
  "apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx",
);
assert.match(
  versionHistory,
  /TODO.*#571/,
  "A7-L-018: VersionHistoryContainer TODO must reference issue #571",
);

const commandPaletteE2E = readFromRepo(
  repoRoot,
  "apps/desktop/tests/e2e/command-palette.spec.ts",
);
assert.match(
  commandPaletteE2E,
  /TODO.*#571/,
  "A7-L-019: command-palette TODO must reference issue #571",
);
