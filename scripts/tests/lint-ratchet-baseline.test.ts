import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readLintRatchetBaseline } from "../lint-ratchet";

// CMI-S3-LR-S1
// should read baseline snapshot and fail with diagnostic when required fields are missing
{
  const root = mkdtempSync(path.join(tmpdir(), "lint-ratchet-s1-"));
  const validPath = path.join(root, "lint-baseline.valid.json");
  writeFileSync(
    validPath,
    JSON.stringify(
      {
        version: "2026-02-15",
        generatedAt: "2026-02-15T00:00:00.000Z",
        source: "eslint@8",
        governance: {
          issue: "#556",
          reason: "initial lint ratchet baseline for s3-lint-ratchet",
        },
        snapshot: {
          totalViolations: 3,
          byRule: {
            complexity: 1,
            "max-lines-per-function": 2,
          },
        },
      },
      null,
      2,
    ),
  );

  const baseline = readLintRatchetBaseline(validPath);
  assert.equal(baseline.snapshot.totalViolations, 3);
  assert.equal(baseline.snapshot.byRule.complexity, 1);

  const invalidPath = path.join(root, "lint-baseline.invalid.json");
  writeFileSync(
    invalidPath,
    JSON.stringify(
      {
        version: "2026-02-15",
        generatedAt: "2026-02-15T00:00:00.000Z",
        source: "eslint@8",
        governance: {
          issue: "#556",
          reason: "broken fixture",
        },
        snapshot: {
          totalViolations: 3,
        },
      },
      null,
      2,
    ),
  );

  assert.throws(() => readLintRatchetBaseline(invalidPath), /snapshot\.byRule/);
}
