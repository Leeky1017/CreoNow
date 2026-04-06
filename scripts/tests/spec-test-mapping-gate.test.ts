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

// parsing supports prefixed explicit Scenario IDs in ### headings
{
  const root = setupRoot("stm-parse-prefixed-explicit-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `### Scenario BE-SLA-S2: IPC timeout 通过 AbortSignal 中止底层执行
### Scenario FE-SETTINGS-S1: 设置面板默认渲染
### Scenario AUD-C1-S4 并发 switchProject 串行执行无交错
### Scenario IPC-RETRY-S3: 重试预算受限
### Scenario FEATURE-123: 不是合法显式 ID`,
  );

  const scenarios = extractScenarios(root);
  assert.deepEqual(
    scenarios.map((scenario) => scenario.id),
    ["BE-SLA-S2", "FE-SETTINGS-S1", "AUD-C1-S4", "IPC-RETRY-S3"],
  );
  assert.equal(
    scenarios.every((scenario) => scenario.mappingMode === "explicit"),
    true,
  );
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

// exact title matching must avoid explicit scenario prefix collision
{
  const root = setupRoot("stm-map-prefix-collision-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `### Scenario S-ZEN-01: 禅模式可编辑
### Scenario S-ZEN-010: 禅模式快捷切换`,
  );

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `it('S-ZEN-010 should toggle quickly', () => {});`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  const mappingById = new Map(mappings.map((mapping) => [mapping.scenario.id, mapping]));
  assert.equal(mappingById.get("S-ZEN-01")?.mapped, false);
  assert.equal(mappingById.get("S-ZEN-010")?.mapped, true);
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

// mapping requires executable callback and ignores pending title-only tests
{
  const root = setupRoot("stm-map-callback-required-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `const runnable = () => {};
test('S-ZEN-01 pending title only');
test('S-ZEN-01 non-callable callback', 1 as unknown as () => void);
it('S-ZEN-01 executable callback identifier', runnable);`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences.length, 1);
  assert.equal(mappings[0].evidences[0].snippet, "S-ZEN-01 executable callback identifier");
}

// mapping accepts alias callback identifiers
{
  const root = setupRoot("stm-map-callback-alias-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `const runnable = () => {};
const alias = runnable;
it('S-ZEN-01 alias callback identifier', alias);`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences[0].snippet, "S-ZEN-01 alias callback identifier");
}

// mapping accepts imported callback identifiers
{
  const root = setupRoot("stm-map-imported-callback-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "helpers.ts"),
    `export const importedRunnable = () => {};`,
  );
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `import { importedRunnable } from './helpers';
it('S-ZEN-01 imported callback identifier', importedRunnable);`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, true);
  assert.equal(mappings[0].evidences[0].snippet, "S-ZEN-01 imported callback identifier");
}

// mapping rejects imported non-callable callback identifiers
{
  const root = setupRoot("stm-map-imported-non-callable-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "helpers.ts"),
    `export const importedNonFn = 1 as unknown as () => void;`,
  );
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `import { importedNonFn } from './helpers';
it('S-ZEN-01 imported non-callable callback identifier', importedNonFn);`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, false);
  assert.equal(mappings[0].evidences.length, 0);
}

// mapping rejects identifier/property/element callback bypass when value is non-function
{
  const root = setupRoot("stm-map-callback-bypass-");
  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "ZenMode.test.tsx"),
    `const nonFn = 1 as unknown as () => void;
const callbacks = {
  nonFn: 2 as unknown as () => void,
};
const key = 'nonFn' as const;
it('S-ZEN-01 identifier callback bypass', nonFn);
it('S-ZEN-01 property callback bypass', callbacks.nonFn);
it('S-ZEN-01 element callback bypass', callbacks[key]);`,
  );

  const scenarios = extractScenarios(root);
  const mappings = findTestMappings(scenarios, root);
  assert.equal(mappings[0].mapped, false);
  assert.equal(mappings[0].evidences.length, 0);
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

// gate distinguishes no-spec-change fallback from exception fallback
{
  const root = setupRoot("stm-gate-fallback-mode-");
  mkdirSync(path.join(root, ".git"), { recursive: true });
  const guardsDir = path.join(root, "openspec", "guards");
  mkdirSync(guardsDir, { recursive: true });
  writeBaseline(1, 0, root);
  writeFileSync(
    path.join(guardsDir, "spec-test-mapping-fallback-baseline.json"),
    JSON.stringify(
      {
        count: 1,
        explicitUnmappedCount: 1,
        derivedUnmappedCount: 0,
        updatedAt: "2026-04-06T00:00:00.000Z",
      },
      null,
      2,
    ) + "\n",
  );

  const specDir = path.join(root, "openspec", "specs", "editor");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), `### Scenario S-ZEN-01: 禅模式可编辑`);

  const noSpecChangeResult = runGate(root, {
    gitDiffRunner: () => "scripts/spec-test-mapping-gate.ts\n",
  });
  assert.equal(noSpecChangeResult.baselineMode, "no-spec-change-fallback");
  assert.equal(noSpecChangeResult.usedFallbackBaseline, true);
  assert.equal(noSpecChangeResult.scopeMode, "all");
  assert.equal(noSpecChangeResult.derivedCoverageFloor, 0);
  assert.equal(noSpecChangeResult.derivedQualityRegressed, false);
  assert.equal(noSpecChangeResult.ok, true);

  const exceptionFallbackResult = runGate(root, {
    gitDiffRunner: () => {
      throw new Error("diff explosion");
    },
  });
  assert.equal(exceptionFallbackResult.baselineMode, "exception-fallback");
  assert.equal(exceptionFallbackResult.usedFallbackBaseline, true);
  assert.equal(exceptionFallbackResult.derivedCoverageFloor, 0);
  assert.equal(exceptionFallbackResult.ok, false);
  assert.match(exceptionFallbackResult.fallbackError ?? "", /diff explosion/);
}

// no-spec-change baseline mode still blocks derived quality regression
{
  const root = setupRoot("stm-gate-no-spec-change-quality-floor-");
  mkdirSync(path.join(root, ".git"), { recursive: true });
  const guardsDir = path.join(root, "openspec", "guards");
  mkdirSync(guardsDir, { recursive: true });
  writeBaseline(0, 1, root);
  writeFileSync(
    path.join(guardsDir, "spec-test-mapping-fallback-baseline.json"),
    JSON.stringify(
      {
        count: 0,
        explicitUnmappedCount: 0,
        derivedUnmappedCount: 1,
        derivedCoverageFloor: 0.75,
        updatedAt: "2026-04-06T00:00:00.000Z",
      },
      null,
      2,
    ) + "\n",
  );

  const specDir = path.join(root, "openspec", "specs", "project-management");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, "spec.md"),
    `#### Scenario: Dashboard 搜索过滤
#### Scenario: Dashboard 批量归档`,
  );

  const testDir = path.join(root, "apps", "desktop", "renderer", "src");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(
    path.join(testDir, "Dashboard.test.tsx"),
    `it('Dashboard 搜索过滤命中结果', () => {});`,
  );

  const result = runGate(root, {
    gitDiffRunner: () => "scripts/spec-test-mapping-gate.ts\n",
  });
  assert.equal(result.baselineMode, "no-spec-change-fallback");
  assert.equal(result.derivedUnmappedOverLimit, false);
  assert.equal(result.derivedCoverage, 0.5);
  assert.equal(result.derivedCoverageFloor, 0.75);
  assert.equal(result.derivedQualityRegressed, true);
  assert.equal(result.ok, false);
}

console.log("✅ spec-test-mapping-gate: all tests passed");
