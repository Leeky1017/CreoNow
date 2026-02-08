import assert from "node:assert/strict";

import { runValidationAcceptanceBenchmark } from "../../../../scripts/ipc-acceptance-gate";

// S3: Zod 校验耗时指标达标 [ADDED]
// should keep zod validation latency under p95 threshold
{
  const report = await runValidationAcceptanceBenchmark({
    sampleSize: 10_000,
  });

  assert.equal(report.metric, "ipc.validation.latency");
  assert.equal(report.sampleSize, 10_000);
  assert.equal(report.result, "PASS");
  assert.equal(report.p95 < 10, true);
}
