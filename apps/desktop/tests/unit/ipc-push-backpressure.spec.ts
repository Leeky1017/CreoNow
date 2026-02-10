import assert from "node:assert/strict";

import { createIpcPushBackpressureGate } from "../../main/src/ipc/pushBackpressure";
import type { AiStreamEvent } from "../../../../packages/shared/types/ai";

function mkEvent(type: AiStreamEvent["type"], ts: number): AiStreamEvent {
  if (type === "chunk") {
    return {
      type,
      executionId: "r1",
      runId: "r1",
      traceId: "trace-1",
      seq: 1,
      chunk: "x",
      ts,
    };
  }
  if (type === "done") {
    return {
      type,
      executionId: "r1",
      runId: "r1",
      traceId: "trace-1",
      terminal: "error",
      outputText: "",
      ts,
      error: { code: "INTERNAL", message: "failed" },
    };
  }
  return {
    type: "done",
    executionId: "r1",
    runId: "r1",
    traceId: "trace-1",
    terminal: "completed",
    outputText: "ok",
    ts,
  };
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

  assert.equal(gate.shouldDeliver(mkEvent("chunk", now)), true);
  assert.equal(gate.shouldDeliver(mkEvent("chunk", now + 1)), true);
  assert.equal(gate.shouldDeliver(mkEvent("chunk", now + 2)), false);

  // Critical control event must still pass even after rate limit is hit.
  assert.equal(gate.shouldDeliver(mkEvent("done", now + 3)), true);

  assert.equal(drops.length, 1);
  assert.equal(drops[0]?.droppedInWindow, 1);

  // New second should reset limiter.
  now += 1_000;
  assert.equal(gate.shouldDeliver(mkEvent("chunk", now)), true);
}
