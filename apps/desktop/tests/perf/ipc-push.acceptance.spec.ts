import assert from "node:assert/strict";

import { runPushAcceptanceBenchmark } from "../../../../scripts/ipc-acceptance-gate";

// S2: Push 投递延迟指标达标 [ADDED]
// should keep push delivery latency under p95 threshold
{
  const report = await runPushAcceptanceBenchmark({
    sampleSize: 10_000,
    eventRatePerSecond: 2_000,
  });

  assert.equal(report.metric, "ipc.push.delivery.latency");
  assert.equal(report.sampleSize, 10_000);
  assert.equal(report.result, "PASS");
  assert.equal(report.p95 < 80, true);
}
