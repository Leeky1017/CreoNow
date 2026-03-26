import assert from "node:assert/strict";

import { runRequestResponseAcceptanceBenchmark } from "../../../../scripts/ipc-acceptance-gate";

// S1: Request-Response 延迟指标达标 [ADDED]
// should keep request-response latency under p95/p99 thresholds on 10000 calls
{
  const report = await runRequestResponseAcceptanceBenchmark({
    sampleSize: 10_000,
  });

  assert.equal(report.metric, "ipc.request-response.latency");
  assert.equal(report.sampleSize, 10_000);
  assert.equal(report.result, "PASS");
  assert.equal(report.p95 < 100, true);
  assert.equal(report.p99 < 300, true);
}
