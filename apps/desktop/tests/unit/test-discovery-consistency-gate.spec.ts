import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const gateScriptPath = path.join(
  repoRoot,
  "scripts/test-discovery-consistency-gate.ts",
);

type GateReport = {
  unit: {
    discoveredCount: number;
    executedCount: number;
    missing: string[];
    extra: string[];
  };
  integration: {
    discoveredCount: number;
    executedCount: number;
    missing: string[];
    extra: string[];
  };
};

const gateModule = (await import(pathToFileURL(gateScriptPath).href)) as {
  buildConsistencyReport: () => Promise<GateReport>;
};

const report = await gateModule.buildConsistencyReport();

// C2C-S1: discovered and executed test sets must match exactly [ADDED]
assert.equal(
  report.unit.missing.length,
  0,
  "unit gate: missing discovered tests",
);
assert.equal(report.unit.extra.length, 0, "unit gate: extra execution targets");
assert.equal(
  report.unit.discoveredCount,
  report.unit.executedCount,
  "unit gate: discovered/executed count mismatch",
);

assert.equal(
  report.integration.missing.length,
  0,
  "integration gate: missing discovered tests",
);
assert.equal(
  report.integration.extra.length,
  0,
  "integration gate: extra execution targets",
);
assert.equal(
  report.integration.discoveredCount,
  report.integration.executedCount,
  "integration gate: discovered/executed count mismatch",
);
