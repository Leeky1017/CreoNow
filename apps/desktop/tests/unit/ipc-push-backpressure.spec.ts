import assert from "node:assert/strict";

import { createIpcPushBackpressureGate } from "../../main/src/ipc/pushBackpressure";
import type { AiStreamEvent } from "../../../../packages/shared/types/ai";

function mkEvent(type: AiStreamEvent["type"], ts: number): AiStreamEvent {
  if (type === "delta") {
    return { type, runId: "r1", ts, delta: "x" };
  }
  if (type === "run_failed") {
    return {
      type,
      runId: "r1",
      ts,
      error: { code: "INTERNAL", message: "failed" },
    };
  }
  return { type, runId: "r1", ts };
}

// NFR: push 速率超过上限时丢弃低优先级事件但保留关键事件 [ADDED]
{
  let now = 1_717_171_001_000;
  const drops: Array<{ droppedInWindow: number; timestamp: number }> = [];

  const gate = createIpcPushBackpressureGate({
    limitPerSecond: 2,
    now: () => now,
    onDrop: (entry) => {
      drops.push({
        droppedInWindow: entry.droppedInWindow,
        timestamp: entry.timestamp,
      });
    },
  });

  assert.equal(gate.shouldDeliver(mkEvent("delta", now)), true);
  assert.equal(gate.shouldDeliver(mkEvent("delta", now + 1)), true);
  assert.equal(gate.shouldDeliver(mkEvent("delta", now + 2)), false);

  // Critical control event must still pass even after rate limit is hit.
  assert.equal(gate.shouldDeliver(mkEvent("run_completed", now + 3)), true);

  assert.equal(drops.length, 1);
  assert.equal(drops[0]?.droppedInWindow, 1);

  // New second should reset limiter.
  now += 1_000;
  assert.equal(gate.shouldDeliver(mkEvent("delta", now)), true);
}
