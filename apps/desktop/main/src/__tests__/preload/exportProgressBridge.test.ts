import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXPORT_PROGRESS_CHANNEL } from "@shared/types/export";

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

describe("registerExportProgressBridge", () => {
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
  });

  it("forwards validated export progress payloads after registration", async () => {
    const { registerExportProgressBridge } = await import(
      "../../../../preload/src/exportProgressBridge"
    );

    const bridge = registerExportProgressBridge();
    const registered = bridge.registerExportProgressConsumer();
    expect(registered.ok).toBe(true);

    const payload = {
      type: "export-progress",
      exportId: "exp-1",
      stage: "converting",
      progress: 60,
      currentDocument: "doc-1",
    };

    listeners.get(EXPORT_PROGRESS_CHANNEL)?.({}, payload);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe(EXPORT_PROGRESS_CHANNEL);
    expect(dispatchEvent.mock.calls[0]?.[0]?.detail).toEqual(payload);

    bridge.dispose();
  });
});
