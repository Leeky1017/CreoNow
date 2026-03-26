import assert from "node:assert/strict";

import type { MockIPCCall, MockIPCRenderer } from "./mock-ipc-renderer";

function findLatestCallByChannel(
  calls: MockIPCCall[],
  channel: string,
): MockIPCCall | null {
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const call = calls[index];
    if (call?.channel === channel) {
      return call;
    }
  }
  return null;
}

/**
 * Assert preload/renderer forwarding behavior for a specific channel payload.
 *
 * Why: tests should verify forwarding contract with a single stable helper.
 */
export function assertIPCCall(
  renderer: MockIPCRenderer,
  channel: string,
  expectedParams: unknown,
): void {
  const call =
    findLatestCallByChannel(renderer.invokeCalls(), channel) ??
    findLatestCallByChannel(renderer.sendCalls(), channel);

  if (!call) {
    assert.fail(`expected IPC call on channel: ${channel}`);
  }

  assert.equal(call.channel, channel);
  assert.deepEqual(call.payload, expectedParams);
}
