import assert from "node:assert/strict";
import path from "node:path";

import {
  evaluateCrossModuleContractGate,
  readGeneratedCrossModuleContractActual,
  type CrossModuleContractBaseline,
} from "../../../../scripts/cross-module-contract-gate";

// S1/S3/S4: drift-zero baseline should pass without approved exceptions [MODIFIED]
{
  const baseline: CrossModuleContractBaseline = {
    version: "2026-02-09",
    expectedChannels: [
      "memory:episode:record",
      "memory:trace:get",
      "memory:trace:feedback",
      "knowledge:query:relevant",
      "knowledge:query:byids",
      "knowledge:query:subgraph",
      "project:project:switch",
      "ai:skill:run",
      "skill:stream:chunk",
      "skill:stream:done",
      "ai:skill:cancel",
      "ai:chat:send",
      "export:project:bundle",
    ],
    expectedErrorCodes: [
      "KG_QUERY_TIMEOUT",
      "VALIDATION_ERROR",
      "IPC_TIMEOUT",
      "PROJECT_SWITCH_TIMEOUT",
      "DOCUMENT_SAVE_CONFLICT",
      "MEMORY_BACKPRESSURE",
      "SKILL_TIMEOUT",
      "SKILL_CAPACITY_EXCEEDED",
      "SKILL_SCOPE_VIOLATION",
      "AI_PROVIDER_UNAVAILABLE",
      "VERSION_MERGE_TIMEOUT",
      "SEARCH_TIMEOUT",
      "CONTEXT_SCOPE_VIOLATION",
    ],
    desiredEnvelope: "ok",
  };

  const repoRoot = path.resolve(import.meta.dirname, "../../../..");
  const actual = readGeneratedCrossModuleContractActual(repoRoot);
  const result = evaluateCrossModuleContractGate(baseline, actual);

  assert.equal(
    result.ok,
    true,
    `expected drift-zero gate pass, issues=${result.issues.join("; ")}, drifts=${result.drifts.join("; ")}`,
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.drifts, []);
}
