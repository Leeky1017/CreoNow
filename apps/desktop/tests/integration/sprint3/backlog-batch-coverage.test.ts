import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type ScenarioId =
  | "CMI-S3-BB-S1"
  | "CMI-S3-BB-S2"
  | "CMI-S3-BB-S3"
  | "CMI-S3-BB-S4";

type AuditItem = {
  auditId: string;
  source: string;
  file: string;
  scenarioIds: ScenarioId[];
  verificationTests: string[];
};

const expectedAuditIds = [
  "A1-L-001",
  "A1-L-002",
  "A2-L-001",
  "A2-L-002",
  "A3-L-001",
  "A4-L-001",
  "A4-L-002",
  "A5-L-001",
  "A5-L-002",
  "A6-L-001",
  "A6-L-002",
  "A7-L-017",
  "A7-L-018",
  "A7-L-019",
] as const;

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const mapFile = path.join(
  repoRoot,
  "openspec/changes/s3-p3-backlog-batch/evidence/audit-item-map.json",
);

assert.equal(
  existsSync(mapFile),
  true,
  `audit item map must exist: ${path.relative(repoRoot, mapFile)}`,
);

const items = JSON.parse(readFileSync(mapFile, "utf8")) as AuditItem[];
assert.equal(
  items.length,
  expectedAuditIds.length,
  "must map all 14 audit items",
);

for (const auditId of expectedAuditIds) {
  const item = items.find((entry) => entry.auditId === auditId);
  assert.ok(item, `missing audit item mapping: ${auditId}`);

  assert.equal(
    item.source.length > 0,
    true,
    `audit item ${auditId} source must not be empty`,
  );

  assert.equal(
    item.verificationTests.length > 0,
    true,
    `audit item ${auditId} must include verification tests`,
  );

  const targetFile = path.join(repoRoot, item.file);
  assert.equal(
    existsSync(targetFile),
    true,
    `audit item ${auditId} file missing: ${item.file}`,
  );
}

const scenarioCoverage = new Set<ScenarioId>();
for (const item of items) {
  for (const scenarioId of item.scenarioIds) {
    scenarioCoverage.add(scenarioId);
  }
}

assert.deepEqual(
  Array.from(scenarioCoverage).sort(),
  ["CMI-S3-BB-S1", "CMI-S3-BB-S2", "CMI-S3-BB-S3", "CMI-S3-BB-S4"],
  "all CMI-S3-BB scenarios must be covered by audit mapping",
);
