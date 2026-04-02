import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildIntegrationExecutionPlan,
  buildUnitExecutionPlan,
} from "./run-discovered-tests";

type ConsistencyBucket = {
  discoveredCount: number;
  executedCount: number;
  missing: string[];
  extra: string[];
  failed: string[];
};

export type DiscoveryConsistencyReport = {
  unit: ConsistencyBucket;
  integration: ConsistencyBucket;
};

type CommandSpec = {
  command: string;
  args: string[];
  cwd: string;
};

type ExecutionOutcome = {
  executed: Set<string>;
  failed: Set<string>;
};

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type VitestJsonReport = {
  testResults?: Array<{
    name?: string;
    status?: string;
  }>;
};

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DESKTOP_ROOT = path.join(REPO_ROOT, "apps/desktop");

function normalizePath(filePath: string): string {
  return path.resolve(filePath).split(path.sep).join("/");
}

function toSortedArray(set: Set<string>): string[] {
  return [...set].sort((a, b) => a.localeCompare(b));
}

function formatCommand(spec: CommandSpec): string {
  return [spec.command, ...spec.args].join(" ");
}

function runCommandCapture(
  command: string,
  args: string[],
  cwd: string,
): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function createEmptyExecutionOutcome(): ExecutionOutcome {
  return {
    executed: new Set<string>(),
    failed: new Set<string>(),
  };
}

function mergeExecutionOutcome(
  target: ExecutionOutcome,
  source: ExecutionOutcome,
): void {
  for (const file of source.executed) {
    target.executed.add(file);
  }
  for (const file of source.failed) {
    target.failed.add(file);
  }
}

function isVitestBatchCommand(spec: CommandSpec): boolean {
  return spec.command === "pnpm" && spec.args.includes("vitest");
}

function extractTsxFile(spec: CommandSpec): string | null {
  if (
    spec.command === "node" &&
    spec.args[0] === "--import" &&
    spec.args[1] === "tsx" &&
    spec.args.length >= 3
  ) {
    return spec.args[2] ?? null;
  }
  return null;
}

function resolveReportedVitestFile(fileName: string): string {
  return normalizePath(
    path.isAbsolute(fileName) ? fileName : path.join(DESKTOP_ROOT, fileName),
  );
}

export function parseVitestJsonReport(
  stdout: string,
  commandLabel: string,
): ExecutionOutcome {
  const outcome = createEmptyExecutionOutcome();
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    outcome.failed.add(commandLabel);
    return outcome;
  }

  try {
    const parsed = JSON.parse(trimmed) as VitestJsonReport;
    const suites = Array.isArray(parsed.testResults) ? parsed.testResults : [];
    if (suites.length === 0) {
      outcome.failed.add(commandLabel);
      return outcome;
    }

    for (const suite of suites) {
      if (typeof suite.name !== "string" || suite.name.trim().length === 0) {
        continue;
      }
      const normalized = resolveReportedVitestFile(suite.name);
      outcome.executed.add(normalized);
      // Only "passed" is considered a successful execution.
      // "failed", "skipped", "todo", "pending", "cancelled", or any other
      // non-passed status must be treated as a failure so the gate does not
      // silently accept fully-skipped suites.
      if (suite.status !== "passed") {
        outcome.failed.add(normalized);
      }
    }

    if (outcome.executed.size === 0) {
      outcome.failed.add(commandLabel);
    }
    return outcome;
  } catch {
    outcome.failed.add(commandLabel);
    return outcome;
  }
}

function printCapturedOutput(result: CommandResult): void {
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
}

function executePlanCommand(spec: CommandSpec): ExecutionOutcome {
  const outcome = createEmptyExecutionOutcome();
  const commandLabel = formatCommand(spec);
  const tsxFile = extractTsxFile(spec);
  if (tsxFile) {
    const result = runCommandCapture(spec.command, spec.args, spec.cwd);
    printCapturedOutput(result);
    const normalized = normalizePath(tsxFile);
    outcome.executed.add(normalized);
    if (result.status !== 0) {
      outcome.failed.add(normalized);
    }
    return outcome;
  }

  if (isVitestBatchCommand(spec)) {
    const result = runCommandCapture(
      spec.command,
      [...spec.args, "--reporter=json"],
      spec.cwd,
    );
    if (result.stderr.length > 0) {
      process.stderr.write(result.stderr);
    }
    const parsed = parseVitestJsonReport(result.stdout, commandLabel);
    if (result.status !== 0 && parsed.failed.size === 0) {
      parsed.failed.add(commandLabel);
    }
    console.log(
      `[discovery-gate] vitest-batch executed=${parsed.executed.size.toString()} failed=${parsed.failed.size.toString()}`,
    );
    return parsed;
  }

  const result = runCommandCapture(spec.command, spec.args, spec.cwd);
  printCapturedOutput(result);
  if (result.status !== 0) {
    outcome.failed.add(commandLabel);
  }
  return outcome;
}

async function collectAuthoritativeUnitExecution(): Promise<ExecutionOutcome> {
  const plan = await buildUnitExecutionPlan();
  const aggregate = createEmptyExecutionOutcome();

  for (const command of plan.commands) {
    mergeExecutionOutcome(aggregate, executePlanCommand(command));
  }

  return aggregate;
}

async function collectAuthoritativeIntegrationExecution(): Promise<ExecutionOutcome> {
  const plan = await buildIntegrationExecutionPlan();
  const aggregate = createEmptyExecutionOutcome();

  for (const command of plan.commands) {
    mergeExecutionOutcome(aggregate, executePlanCommand(command));
  }

  return aggregate;
}

function diffSets(source: Set<string>, target: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const item of source) {
    if (!target.has(item)) {
      out.add(item);
    }
  }
  return out;
}

export function toBucket(
  discovered: Set<string>,
  executed: Set<string>,
  failed: Set<string>,
): ConsistencyBucket {
  const missing = toSortedArray(diffSets(discovered, executed));
  const extra = toSortedArray(diffSets(executed, discovered));
  return {
    discoveredCount: discovered.size,
    executedCount: executed.size,
    missing,
    extra,
    failed: toSortedArray(failed),
  };
}

export async function buildConsistencyReport(): Promise<DiscoveryConsistencyReport> {
  const unitPlan = await buildUnitExecutionPlan();
  const unitDiscovered = new Set<string>([
    ...unitPlan.buckets.tsxFiles.map((filePath) => normalizePath(filePath)),
    ...unitPlan.buckets.vitestFiles.map((filePath) => normalizePath(filePath)),
  ]);
  const unitExecution = await collectAuthoritativeUnitExecution();

  const integrationPlan = await buildIntegrationExecutionPlan();
  const integrationDiscovered = new Set<string>(
    integrationPlan.files.map((filePath) => normalizePath(filePath)),
  );
  const integrationExecution = await collectAuthoritativeIntegrationExecution();

  return {
    unit: toBucket(
      unitDiscovered,
      unitExecution.executed,
      unitExecution.failed,
    ),
    integration: toBucket(
      integrationDiscovered,
      integrationExecution.executed,
      integrationExecution.failed,
    ),
  };
}

function hasMismatch(report: DiscoveryConsistencyReport): boolean {
  return (
    report.unit.missing.length > 0 ||
    report.unit.extra.length > 0 ||
    report.unit.failed.length > 0 ||
    report.integration.missing.length > 0 ||
    report.integration.extra.length > 0 ||
    report.integration.failed.length > 0
  );
}

function printBucket(label: string, bucket: ConsistencyBucket): void {
  console.log(
    `[discovery-gate] ${label} discovered=${bucket.discoveredCount.toString()} executed=${bucket.executedCount.toString()}`,
  );
  if (bucket.missing.length > 0) {
    console.error(
      `[discovery-gate] ${label} missing (${bucket.missing.length.toString()}):`,
    );
    for (const file of bucket.missing) {
      console.error(`  - ${file}`);
    }
  }
  if (bucket.extra.length > 0) {
    console.error(
      `[discovery-gate] ${label} extra (${bucket.extra.length.toString()}):`,
    );
    for (const file of bucket.extra) {
      console.error(`  - ${file}`);
    }
  }
  if (bucket.failed.length > 0) {
    console.error(
      `[discovery-gate] ${label} failed (${bucket.failed.length.toString()}):`,
    );
    for (const file of bucket.failed) {
      console.error(`  - ${file}`);
    }
  }
}

function isEntrypoint(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return pathToFileURL(entry).href === moduleUrl;
}

export async function main(): Promise<void> {
  const report = await buildConsistencyReport();
  printBucket("unit", report.unit);
  printBucket("integration", report.integration);

  if (hasMismatch(report)) {
    throw new Error("discovered/executed test plan mismatch");
  }

  console.log("[discovery-gate] PASS");
}

if (isEntrypoint(import.meta.url)) {
  void main();
}
