import assert from "node:assert/strict";

import { createMockIPCEmitter } from "../helpers/ipc";

// S3: Push 订阅/退订可测试且无泄漏 [ADDED]
// should release listener handles on unsubscribe
{
  const emitter = createMockIPCEmitter("skill:stream:chunk");
  const baseline = emitter.listenerCount();
  let callbackHit = 0;

  for (let i = 0; i < 1_000; i += 1) {
    const listener = () => {
      callbackHit += 1;
    };
    emitter.on(listener);
    emitter.emit({ seq: i });
    emitter.removeListener(listener);
  }

  emitter.emit({ seq: "after-unsubscribe" });

  assert.equal(callbackHit, 1_000);
  assert.equal(emitter.listenerCount(), baseline);
}
