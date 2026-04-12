import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL } from "@shared/types/ai";

const listeners = new Map<string, (event: unknown, payload: unknown) => void>();
const dispatchEvent = vi.fn();

vi.mock("electron", () => ({
  ipcRenderer: {
    on: vi.fn((channel: string, listener: (event: unknown, payload: unknown) => void) => {
      listeners.set(channel, listener);
    }),
    removeListener: vi.fn((channel: string) => {
      listeners.delete(channel);
    }),
  },
}));

describe("registerAiStreamBridge context compact circuit-breaker bridge", () => {
  beforeEach(() => {
    listeners.clear();
    dispatchEvent.mockReset();
    Object.defineProperty(globalThis, "window", {
      value: { dispatchEvent },
      configurable: true,
    });
    Object.defineProperty(globalThis, "CustomEvent", {
      value: class CustomEvent<T> {
        type: string;
        detail: T;
        constructor(type: string, init: { detail: T }) {
          this.type = type;
          this.detail = init.detail;
        }
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "process", {
      value: { pid: 1003 },
      configurable: true,
    });
  });

  it("将 main 发出的 context compact circuit-breaker 事件校验后转发到 renderer CustomEvent", async () => {
    const { registerAiStreamBridge } = await import("../../../../preload/src/aiStreamBridge");
    const bridge = registerAiStreamBridge();
    const registered = bridge.registerAiStreamConsumer();
    expect(registered.ok).toBe(true);

    const event = {
      open: true,
      consecutiveFailures: 3,
      openedAt: 1_735_000_000_000,
      cooldownMs: 300_000,
      reason: "threshold-reached",
    };

    listeners.get(CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL)?.({}, event);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe(
      CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL,
    );
    expect(dispatchEvent.mock.calls[0]?.[0]?.detail).toEqual(event);

    bridge.dispose();
  });
});
