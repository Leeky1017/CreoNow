import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("registerAiStreamBridge cost alert bridge", () => {
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
      value: { pid: 1002 },
      configurable: true,
    });
  });

  it("将 main 发出的 cost:alert runtime 校验后转发到 renderer-facing CustomEvent", async () => {
    const { registerAiStreamBridge } = await import("../../../../preload/src/aiStreamBridge");
    const bridge = registerAiStreamBridge();
    const registered = bridge.registerAiStreamConsumer();
    expect(registered.ok).toBe(true);

    const alert = {
      kind: "warning",
      currentCost: 1.75,
      threshold: 2,
      message: "Budget warning",
      timestamp: 1_735_000_000_000,
    };

    listeners.get("cost:alert")?.({}, alert);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe("cost:alert");
    expect(dispatchEvent.mock.calls[0]?.[0]?.detail).toEqual(alert);

    bridge.dispose();
  });
});
