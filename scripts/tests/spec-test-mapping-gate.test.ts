import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  extractScenarios,
  findTestMappings,
  computeTier2Summary,
  readBaseline,
  writeBaseline,
  runGate,
} from "../spec-test-mapping-gate";

function setupRoot(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

// parsing
{
  const root = setupRoot("stm-parse-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `### Scenario S-ZEN-01: 禅模式可编辑\n#### Scenario: PM-DASH 打开项目`,
  );
  const scenarios = extractScenarios(root);
  assert.equal(scenarios.length, 2);
  assert.equal(scenarios[0].id, "S-ZEN-01");
  assert.equal(scenarios[1].mappingMode, "derived");
}

// mapping should only trust test title evidence (comment no longer counts)
{
  const root = setupRoot("stm-map-title-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `// Scenario: S-ZEN-01\ndescribe('ZenMode', () => { it('S-ZEN-01 should be editable', () => {}); });`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences.length, 1);
  assert.equal(mappings[0].evidences[0].kind, "exact-title");
}

// mapping must ignore commented-out test titles
{
  const root = setupRoot("stm-map-commented-test-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-COMMENT-01: 仅注释不应命中`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "CommentedOnly.test.ts"),
    `// it('S-COMMENT-01 commented out', () => {});
/* test('S-COMMENT-01 in block comment', () => {}); */`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, false);
  assert.equal(mappings[0].evidences.length, 0);
}

// derived scenarios rely on semantic title hit
{
  const root = setupRoot("stm-map-derived-");
  const specDir = path.join(root, "openspec", "specs", "project-management");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `#### Scenario: Dashboard 搜索过滤`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "Dashboard.test.tsx"),
    `describe('Dashboard 搜索过滤场景', () => { it('Dashboard 搜索过滤命中结果', () => {}); });`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences[0].kind, "derived-title");
}

// gate fails when derived scenarios are entirely ignored
{
  const root = setupRoot("stm-gate-derived-ignored-");
  const guardsDir = path.join(root, "openspec", "guards");
  mkdirSync(guardsDir, { recursive: true });
  writeBaseline(0, 0, root);

  const specDir = path.join(root, "openspec", "specs", "project-management");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `#### Scenario: Dashboard 搜索过滤`);

  const result = runGate(root);
  assert.equal(result.ok, false);
  assert.equal(result.derivedIgnored, true);
}

// baseline read/write
{
  const root = setupRoot("stm-baseline-");
  mkdirSync(path.join(root, "openspec", "guards"), { recursive: true });
  writeBaseline(2, 3, root);
  const baseline = readBaseline(root);
  assert.equal(baseline.explicitUnmappedCount, 2);
  assert.equal(baseline.derivedUnmappedCount, 3);
}

// tier2 summary
{
  const root = setupRoot("stm-tier2-");
  const specDir = path.join(root, "openspec", "specs", "mixed");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `### Scenario S-MIX-01: should NOT allow editing\n### Scenario S-MIX-02: 中文搜索\n### Scenario S-MIX-03: 拒绝无效输入`,
  );
  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "mixed.test.tsx"),
    `it('S-MIX-01 should NOT allow editing', () => {});it('S-MIX-02 中文搜索', () => {});`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  const summary = computeTier2Summary(mappings);
  assert.equal(summary.negation.mapped, 1);
  assert.equal(summary.cjk.mapped, 1);
  assert.equal(summary.rejection.mapped, 0);
}

// mapping excludes skipped/todo and non-executable placeholder titles
{
  const root = setupRoot("stm-map-executable-only-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `describe('S-ZEN-01 suite title should be ignored', () => {});
test.skip('S-ZEN-01 skipped case should be ignored', () => {});
test.todo('S-ZEN-01 todo case should be ignored');
it('TODO: S-ZEN-01 pending placeholder', () => {});
it('S-ZEN-01 executable case', () => {});`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences.length, 1);
  assert.equal(mappings[0].evidences[0].snippet, "S-ZEN-01 executable case");
}

// gate enforces derived coverage threshold and baseline limit
{
  const root = setupRoot("stm-gate-derived-threshold-");
  const guardsDir = path.join(root, "openspec", "guards");
  mkdirSync(guardsDir, { recursive: true });
  writeBaseline(0, 0, root);

  const specDir = path.join(root, "openspec", "specs", "project-management");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `#### Scenario: Dashboard 搜索过滤
#### Scenario: Dashboard 批量归档
#### Scenario: Dashboard 快速切换`,
  );

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "Dashboard.test.tsx"),
    `it('Dashboard 搜索过滤命中结果', () => {});`,
  );

  const result = runGate(root);
  assert.equal(result.ok, false);
  assert.equal(result.derivedUnmappedOverLimit, true);
  assert.equal(result.derivedCoverage < result.derivedCoverageThreshold, true);
}

console.log("✅ spec-test-mapping-gate: all tests passed");
