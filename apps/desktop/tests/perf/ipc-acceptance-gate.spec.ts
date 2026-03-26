import assert from "node:assert/strict";

import {
  evaluateIpcAcceptanceGate,
  formatIpcAcceptanceGateSummary,
} from "../../../../scripts/ipc-acceptance-gate";

// S4: 阈值违规时输出可判定报告并阻断 [ADDED]
// should fail gate with metric summary when any threshold is violated
{
  const gate = evaluateIpcAcceptanceGate([
    {
      metric: "ipc.request-response.latency",
      sampleSize: 10_000,
      p50: 12,
      p95: 121,
      p99: 320,
      threshold: {
        p95Lt: 100,
        p99Lt: 300,
      },
      result: "FAIL",
    },
  ]);

  assert.equal(gate.ok, false);
  assert.equal(gate.failedMetrics.length, 1);
  assert.equal(gate.failedMetrics[0]?.metric, "ipc.request-response.latency");

  const summary = formatIpcAcceptanceGateSummary(gate);
  assert.equal(summary.includes("FAIL"), true);
  assert.equal(summary.includes("ipc.request-response.latency"), true);
  assert.equal(summary.includes("p95=121"), true);
}
