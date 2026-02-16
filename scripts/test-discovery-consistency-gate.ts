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
};

export type DiscoveryConsistencyReport = {
  unit: ConsistencyBucket;
  integration: ConsistencyBucket;
};

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DESKTOP_ROOT = path.join(REPO_ROOT, "apps/desktop");

function normalizePath(filePath: string): string {
  return path.resolve(filePath).split(path.sep).join("/");
}

function toDesktopAbsolute(relativePath: string): string {
  return normalizePath(path.join(DESKTOP_ROOT, relativePath));
}

function toSortedArray(set: Set<string>): string[] {
  return [...set].sort((a, b) => a.localeCompare(b));
}

function collectUnitExecutedFiles(
  commands: Array<{ command: string; args: string[]; cwd: string }>,
): Set<string> {
  const executed = new Set<string>();

  for (const command of commands) {
    if (command.command !== "pnpm") {
      continue;
    }

    if (command.args[0] === "exec" && command.args[1] === "tsx") {
      const filePath = command.args[2];
      if (typeof filePath === "string" && filePath.length > 0) {
        executed.add(normalizePath(filePath));
      }
      continue;
    }

    if (!command.args.includes("vitest")) {
      continue;
    }

    const configIndex = command.args.findIndex(
      (arg) => arg === "tests/unit/main/vitest.node.config.ts",
    );
    if (configIndex < 0) {
      continue;
    }

    for (const target of command.args.slice(configIndex + 1)) {
      if (!target.endsWith(".test.ts") && !target.endsWith(".test.tsx")) {
        continue;
      }
      executed.add(toDesktopAbsolute(target));
    }
  }

  return executed;
}

function collectIntegrationExecutedFiles(
  commands: Array<{ command: string; args: string[]; cwd: string }>,
): Set<string> {
  const executed = new Set<string>();
  for (const command of commands) {
    if (command.command !== "pnpm") {
      continue;
    }
    if (command.args[0] !== "exec" || command.args[1] !== "tsx") {
      continue;
    }
    const filePath = command.args[2];
    if (typeof filePath === "string" && filePath.length > 0) {
      executed.add(normalizePath(filePath));
    }
  }
  return executed;
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

function toBucket(
  discovered: Set<string>,
  executed: Set<string>,
): ConsistencyBucket {
  const missing = toSortedArray(diffSets(discovered, executed));
  const extra = toSortedArray(diffSets(executed, discovered));
  return {
    discoveredCount: discovered.size,
    executedCount: executed.size,
    missing,
    extra,
  };
}

export async function buildConsistencyReport(): Promise<DiscoveryConsistencyReport> {
  const unitPlan = await buildUnitExecutionPlan();
  const integrationPlan = await buildIntegrationExecutionPlan();

  const unitDiscovered = new Set<string>([
    ...unitPlan.buckets.tsxFiles.map((filePath) => normalizePath(filePath)),
    ...unitPlan.buckets.vitestFiles.map((filePath) => normalizePath(filePath)),
  ]);
  const unitExecuted = collectUnitExecutedFiles(unitPlan.commands);

  const integrationDiscovered = new Set<string>(
    integrationPlan.files.map((filePath) => normalizePath(filePath)),
  );
  const integrationExecuted = collectIntegrationExecutedFiles(
    integrationPlan.commands,
  );

  return {
    unit: toBucket(unitDiscovered, unitExecuted),
    integration: toBucket(integrationDiscovered, integrationExecuted),
  };
}

function hasMismatch(report: DiscoveryConsistencyReport): boolean {
  return (
    report.unit.missing.length > 0 ||
    report.unit.extra.length > 0 ||
    report.integration.missing.length > 0 ||
    report.integration.extra.length > 0
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
