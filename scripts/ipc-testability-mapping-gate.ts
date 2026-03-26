import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ScenarioMappingValidationInput = {
  scenarios: string[];
  mappedScenarios: string[];
};

export type ScenarioMappingValidationResult =
  | {
      ok: true;
      missingScenarioIds: [];
    }
  | {
      ok: false;
      missingScenarioIds: string[];
    };

export type IpcScenarioTestMappingGateResult = {
  ok: boolean;
  missingScenarioIds: string[];
  issues: string[];
};

type ScenarioDefinition = {
  id: string;
  title: string;
};

type ScenarioMappingRow = {
  id: string;
  title: string;
  testFiles: string[];
};

const CHANGE_ROOT = "openspec/changes/ipc-p1-ipc-testability-harness";
const SPEC_FILE = path.join(CHANGE_ROOT, "specs/ipc/spec.md");
const TASKS_FILE = path.join(CHANGE_ROOT, "tasks.md");

function compareScenarioId(a: string, b: string): number {
  const valueA = Number.parseInt(a.replace(/^S/i, ""), 10);
  const valueB = Number.parseInt(b.replace(/^S/i, ""), 10);
  if (Number.isNaN(valueA) && Number.isNaN(valueB)) {
    return a.localeCompare(b);
  }
  if (Number.isNaN(valueA)) {
    return 1;
  }
  if (Number.isNaN(valueB)) {
    return -1;
  }
  return valueA - valueB;
}

function toSortedScenarioIds(ids: Iterable<string>): string[] {
  return [...ids].sort(compareScenarioId);
}

/**
 * Validate that every spec scenario id has at least one mapped test scenario id.
 */
export function validateIpcScenarioTestMapping(
  input: ScenarioMappingValidationInput,
): ScenarioMappingValidationResult {
  const mapped = new Set(input.mappedScenarios);
  const missing = input.scenarios.filter(
    (scenarioId) => !mapped.has(scenarioId),
  );

  if (missing.length === 0) {
    return {
      ok: true,
      missingScenarioIds: [],
    };
  }

  return {
    ok: false,
    missingScenarioIds: toSortedScenarioIds(missing),
  };
}

function extractSpecScenarios(content: string): ScenarioDefinition[] {
  const titles = [...content.matchAll(/^#### Scenario:\s*(.+)$/gm)].map(
    (match) => match[1].trim(),
  );

  return titles.map((title, index) => ({
    id: `S${index + 1}`,
    title,
  }));
}

function extractScenarioMappings(content: string): ScenarioMappingRow[] {
  const lines = content.split(/\r?\n/);
  const mappings: ScenarioMappingRow[] = [];

  let current: ScenarioMappingRow | null = null;
  for (const line of lines) {
    const headerMatch = line.match(/^- \[[ xX]\]\s+(S\d+)\s+`(.+)`$/);
    if (headerMatch) {
      if (current) {
        mappings.push(current);
      }
      current = {
        id: headerMatch[1],
        title: headerMatch[2],
        testFiles: [],
      };
      continue;
    }

    const testMatch = line.match(/^\s+-\s+测试：`(.+)`$/);
    if (testMatch && current) {
      current.testFiles.push(testMatch[1]);
    }
  }

  if (current) {
    mappings.push(current);
  }

  return mappings;
}

function containsScenarioMarker(content: string, scenarioId: string): boolean {
  const markerByComment = new RegExp(`\\b${scenarioId}\\s*:`, "m");
  const markerByLabel = new RegExp(
    `Scenario\\s*ID\\s*[:：]\\s*${scenarioId}\\b`,
    "mi",
  );
  return markerByComment.test(content) || markerByLabel.test(content);
}

/**
 * Run mapping gate for ipc-p1 testability change.
 *
 * Why: newly added spec scenarios must be traceable to executable tests.
 */
export function runIpcScenarioTestabilityMappingGate(
  repoRoot: string = process.cwd(),
): IpcScenarioTestMappingGateResult {
  const specPath = path.resolve(repoRoot, SPEC_FILE);
  const tasksPath = path.resolve(repoRoot, TASKS_FILE);

  if (!existsSync(specPath) || !existsSync(tasksPath)) {
    return {
      ok: true,
      missingScenarioIds: [],
      issues: [
        "ipc-p1 mapping gate skipped: change files not found in current workspace",
      ],
    };
  }

  const specContent = readFileSync(specPath, "utf8");
  const tasksContent = readFileSync(tasksPath, "utf8");

  const scenarioDefs = extractSpecScenarios(specContent);
  const mappings = extractScenarioMappings(tasksContent);

  const issues: string[] = [];
  const missingScenarioIds = new Set<string>();

  const scenarioIds = scenarioDefs.map((scenario) => scenario.id);
  const mappedScenarioIds = mappings.map((mapping) => mapping.id);

  const coverageResult = validateIpcScenarioTestMapping({
    scenarios: scenarioIds,
    mappedScenarios: mappedScenarioIds,
  });
  if (!coverageResult.ok) {
    for (const missingId of coverageResult.missingScenarioIds) {
      missingScenarioIds.add(missingId);
    }
  }

  const expectedById = new Map<string, ScenarioDefinition>();
  for (const scenario of scenarioDefs) {
    expectedById.set(scenario.id, scenario);
  }

  for (const mapping of mappings) {
    const expectedScenario = expectedById.get(mapping.id);
    if (!expectedScenario) {
      issues.push(
        `[extra-mapping] ${mapping.id} appears in tasks mapping but is not defined in spec`,
      );
      continue;
    }

    if (expectedScenario.title !== mapping.title) {
      issues.push(
        `[title-mismatch] ${mapping.id} title mismatch between spec and tasks mapping`,
      );
    }

    if (mapping.testFiles.length === 0) {
      missingScenarioIds.add(mapping.id);
      issues.push(`[missing-tests] ${mapping.id} has no mapped test file`);
      continue;
    }

    let scenarioCoveredByMarker = false;
    for (const relTestPath of mapping.testFiles) {
      const absTestPath = path.resolve(repoRoot, relTestPath);
      if (!existsSync(absTestPath)) {
        issues.push(
          `[missing-file] ${mapping.id} mapped file not found: ${relTestPath}`,
        );
        continue;
      }

      const testContent = readFileSync(absTestPath, "utf8");
      if (containsScenarioMarker(testContent, mapping.id)) {
        scenarioCoveredByMarker = true;
      }
    }

    if (!scenarioCoveredByMarker) {
      missingScenarioIds.add(mapping.id);
      issues.push(
        `[missing-marker] ${mapping.id} has no scenario marker in mapped test files`,
      );
    }
  }

  const missingScenarioIdList = toSortedScenarioIds(missingScenarioIds);
  if (missingScenarioIdList.length > 0) {
    issues.push(
      `[gate-fail] missing scenario mapping ids: ${missingScenarioIdList.join(", ")}`,
    );
    return {
      ok: false,
      missingScenarioIds: missingScenarioIdList,
      issues,
    };
  }

  if (issues.length > 0) {
    return {
      ok: false,
      missingScenarioIds: [],
      issues,
    };
  }

  return {
    ok: true,
    missingScenarioIds: [],
    issues: [],
  };
}

function main(): number {
  const result = runIpcScenarioTestabilityMappingGate(process.cwd());

  if (!result.ok) {
    if (result.missingScenarioIds.length > 0) {
      console.error(
        `[IPC_MAPPING_GATE] missing Scenario IDs: ${result.missingScenarioIds.join(", ")}`,
      );
    }
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.error(`[IPC_MAPPING_GATE] ${issue}`);
      }
    }
    return 1;
  }

  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.log(`[IPC_MAPPING_GATE] ${issue}`);
    }
  } else {
    console.log("[IPC_MAPPING_GATE] ok");
  }

  return 0;
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === currentFilePath) {
  process.exit(main());
}
