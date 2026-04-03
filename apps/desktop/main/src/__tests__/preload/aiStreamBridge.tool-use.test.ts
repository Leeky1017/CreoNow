import { beforeEach, describe, expect, it, vi } from "vitest";

import { SKILL_TOOL_USE_CHANNEL } from "@shared/types/ai";

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

describe("registerAiStreamBridge tool-use bridge", () => {
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
      value: { pid: 1001 },
      configurable: true,
    });
  });

  it("renderer 原样转发通过 runtime 校验的 raw tool-use payload", async () => {
    const { registerAiStreamBridge } = await import("../../../../preload/src/aiStreamBridge");
    const bridge = registerAiStreamBridge();
    const registered = bridge.registerAiStreamConsumer();
    expect(registered.ok).toBe(true);

    const started = {
      type: "tool-use-started",
      executionId: "exec-1",
      runId: "run-1",
      round: 1,
      toolNames: ["docTool"],
      ts: 1,
    };
    const completed = {
      type: "tool-use-completed",
      executionId: "exec-1",
      runId: "run-1",
      round: 1,
      results: [
        {
          callId: "call-doc-1",
          toolName: "docTool",
          success: true,
          durationMs: 12,
          extra: "keep-me",
        },
      ],
      hasNextRound: false,
      ts: 2,
    };
    const failed = {
      type: "tool-use-failed",
      executionId: "exec-1",
      runId: "run-1",
      round: 2,
      error: { code: "TOOL_USE_MAX_ROUNDS_EXCEEDED", message: "too many rounds", retryable: false },
      ts: 3,
    };

    listeners.get(SKILL_TOOL_USE_CHANNEL)?.({}, started);
    listeners.get(SKILL_TOOL_USE_CHANNEL)?.({}, completed);
    listeners.get(SKILL_TOOL_USE_CHANNEL)?.({}, failed);

    expect(dispatchEvent).toHaveBeenCalledTimes(3);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe(SKILL_TOOL_USE_CHANNEL);
    expect(dispatchEvent.mock.calls[0]?.[0]?.detail).toBe(started);
    expect(dispatchEvent.mock.calls[1]?.[0]?.type).toBe(SKILL_TOOL_USE_CHANNEL);
    expect(dispatchEvent.mock.calls[1]?.[0]?.detail).toBe(completed);
    expect(dispatchEvent.mock.calls[2]?.[0]?.type).toBe(SKILL_TOOL_USE_CHANNEL);
    expect(dispatchEvent.mock.calls[2]?.[0]?.detail).toBe(failed);

    bridge.dispose();
  });
});
