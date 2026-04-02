import { afterEach, describe, expect, it, vi } from "vitest";

import { GLOBAL_ERROR_TOAST_EVENT, installGlobalErrorHandlers } from "@/lib/globalErrorBridge";
import type { LegacyCreonowBridge } from "@/lib/preloadApi";

afterEach(() => {
  delete window.creonow;
});

describe("installGlobalErrorHandlers", () => {
  it("logs renderer rejections and dispatches the cn:global-error-toast event", async () => {
    const invoke = vi.fn(async () => ({ ok: true as const, data: { logged: true as const } }));
    window.creonow = {
      api: {} as never,
      invoke: invoke as LegacyCreonowBridge["invoke"],
      stream: {
        registerAiStreamConsumer: () => ({ ok: true, data: { subscriptionId: "sub-1" } }),
        releaseAiStreamConsumer: () => undefined,
      },
    };

    const received: string[] = [];
    const cleanup = installGlobalErrorHandlers();
    const listener = ((event: Event) => {
      received.push((event as CustomEvent<{ message: string }>).detail.message);
    }) as EventListener;
    window.addEventListener(GLOBAL_ERROR_TOAST_EVENT, listener);

    const event = new Event("unhandledrejection") as Event & { reason: unknown };
    Object.defineProperty(event, "reason", { value: new Error("preview exploded") });
    window.dispatchEvent(event);
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith(
      "app:renderer:logerror",
      expect.objectContaining({ source: "unhandledrejection", message: "preview exploded" }),
    );
    expect(received).toEqual(["preview exploded"]);

    window.removeEventListener(GLOBAL_ERROR_TOAST_EVENT, listener);
    cleanup();
  });

  it("deduplicates toast dispatches within the 1000ms window but still logs every error", async () => {
    const invoke = vi.fn(async () => ({ ok: true as const, data: { logged: true as const } }));
    window.creonow = {
      api: {} as never,
      invoke: invoke as LegacyCreonowBridge["invoke"],
      stream: {
        registerAiStreamConsumer: () => ({ ok: true, data: { subscriptionId: "sub-1" } }),
        releaseAiStreamConsumer: () => undefined,
      },
    };

    const received: string[] = [];
    let now = 1_700_000_000_000;
    const cleanup = installGlobalErrorHandlers({ now: () => now });
    const listener = ((event: Event) => {
      received.push((event as CustomEvent<{ message: string }>).detail.message);
    }) as EventListener;
    window.addEventListener(GLOBAL_ERROR_TOAST_EVENT, listener);

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("same boom"), message: "same boom" }));
    now += 500;
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("same boom"), message: "same boom" }));
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(received).toEqual(["same boom"]);

    window.removeEventListener(GLOBAL_ERROR_TOAST_EVENT, listener);
    cleanup();
  });
});
