import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GLOBAL_ERROR_TOAST_EVENT,
  installGlobalErrorHandlers,
  consumePendingGlobalErrorToasts,
  registerGlobalErrorToastConsumer,
  resetGlobalErrorToastStateForTests,
} from "@/lib/globalErrorBridge";
import type { LegacyCreonowBridge } from "@/lib/preloadApi";

afterEach(() => {
  resetGlobalErrorToastStateForTests();
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

  it("buffers pre-mount toasts until a consumer drains them and does not replay them forever", async () => {
    const invoke = vi.fn(async () => ({ ok: true as const, data: { logged: true as const } }));
    window.creonow = {
      api: {} as never,
      invoke: invoke as LegacyCreonowBridge["invoke"],
      stream: {
        registerAiStreamConsumer: () => ({ ok: true, data: { subscriptionId: "sub-1" } }),
        releaseAiStreamConsumer: () => undefined,
      },
    };

    const cleanup = installGlobalErrorHandlers();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("startup boom"), message: "startup boom" }));
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith(
      "app:renderer:logerror",
      expect.objectContaining({ source: "error", message: "startup boom" }),
    );
    expect(consumePendingGlobalErrorToasts().map((entry) => entry.message)).toEqual(["startup boom"]);
    expect(consumePendingGlobalErrorToasts()).toEqual([]);

    const unregisterConsumer = registerGlobalErrorToastConsumer();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("mounted boom"), message: "mounted boom" }));
    await Promise.resolve();

    expect(consumePendingGlobalErrorToasts()).toEqual([]);

    unregisterConsumer();
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