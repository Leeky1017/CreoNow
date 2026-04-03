import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SKILL_QUEUE_STATUS_CHANNEL,
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  SKILL_TOOL_USE_CHANNEL,
} from "@shared/types/ai";

const on = vi.fn();
const removeListener = vi.fn();

vi.mock("electron", () => ({
  ipcRenderer: {
    on,
    removeListener,
  },
}));

describe("registerAiStreamBridge tool-use forwarding", () => {
  beforeEach(() => {
    on.mockReset();
    removeListener.mockReset();
    const eventTarget = new EventTarget();
    Object.assign(globalThis, { window: eventTarget });
  });

  it("preload 将 SKILL_TOOL_USE_CHANNEL 转发给 renderer", async () => {
    const { registerAiStreamBridge } = await import("../../../preload/src/aiStreamBridge");
    const bridge = registerAiStreamBridge();
    const subscription = bridge.registerAiStreamConsumer();
    expect(subscription.ok).toBe(true);

    const received: Array<{ type: string; round: number }> = [];
    window.addEventListener(SKILL_TOOL_USE_CHANNEL, (event) => {
      const detail = (event as CustomEvent<{ type: string; round: number }>).detail;
      received.push(detail);
    });

    const listener = on.mock.calls.find((call) => call[0] === SKILL_TOOL_USE_CHANNEL)?.[1];
    expect(typeof listener).toBe("function");
    listener?.({}, {
      type: "tool-use-started",
      executionId: "exec-1",
      runId: "run-1",
      round: 1,
      toolNames: ["kgTool"],
      ts: Date.now(),
    });

    expect(received).toEqual([expect.objectContaining({ type: "tool-use-started", round: 1 })]);
    bridge.dispose();
    expect(removeListener).toHaveBeenCalledWith(SKILL_TOOL_USE_CHANNEL, expect.any(Function));
    expect(on).toHaveBeenCalledWith(SKILL_STREAM_CHUNK_CHANNEL, expect.any(Function));
    expect(on).toHaveBeenCalledWith(SKILL_STREAM_DONE_CHANNEL, expect.any(Function));
    expect(on).toHaveBeenCalledWith(SKILL_QUEUE_STATUS_CHANNEL, expect.any(Function));
  });
});
