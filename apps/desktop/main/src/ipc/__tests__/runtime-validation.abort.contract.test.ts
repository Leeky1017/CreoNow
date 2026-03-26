import assert from "node:assert/strict";

import type { IpcMainInvokeEvent } from "electron";

import { s } from "../contract/schema";
import { wrapIpcRequestResponse } from "../runtime-validation";
import type { IpcResponse } from "@shared/types/ipc-generated";

type TestLogger = {
  info: (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, data?: Record<string, unknown>) => void;
};

function createLogger(): TestLogger {
  return {
    info: () => undefined,
    error: () => undefined,
  };
}

function createEvent(url: string, webContentsId: number): IpcMainInvokeEvent {
  return {
    senderFrame: { url },
    sender: { id: webContentsId },
  } as unknown as IpcMainInvokeEvent;
}

async function runScenario(
  name: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(
      `[${name}] ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function installControlledTimeouts(): {
  triggerAll: () => void;
  restore: () => void;
} {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map<number, () => void>();
  let nextId = 0;

  const fakeSetTimeout = ((
    handler: TimerHandler,
    _timeout?: number,
    ...args: unknown[]
  ) => {
    nextId += 1;
    const id = nextId;
    timers.set(id, () => {
      if (typeof handler === "function") {
        handler(...args);
      }
    });
    return id as unknown as NodeJS.Timeout;
  }) as unknown as typeof setTimeout;

  const fakeClearTimeout = ((timerId: NodeJS.Timeout) => {
    timers.delete(timerId as unknown as number);
  }) as typeof clearTimeout;

  globalThis.setTimeout = fakeSetTimeout;
  globalThis.clearTimeout = fakeClearTimeout;

  return {
    triggerAll: () => {
      const entries = [...timers.entries()];
      timers.clear();
      for (const [, callback] of entries) {
        callback();
      }
    },
    restore: () => {
      timers.clear();
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

async function main(): Promise<void> {
  await runScenario(
    "BE-SLA-S2 timeout should abort underlying handler via AbortSignal",
    async () => {
      let ghostEffects = 0;
      let observedAbort = false;
      let receivedSignal: AbortSignal | undefined;

      const wrapped = wrapIpcRequestResponse({
        channel: "context:test:runtime-validation-abort",
        requestSchema: s.object({}),
        responseSchema: s.object({ ok: s.literal(true) }),
        logger: createLogger(),
        timeoutMs: 5_000,
        handler: async (_event, _payload, signal?: AbortSignal) => {
          receivedSignal = signal;
          if (signal) {
            if (signal.aborted) {
              observedAbort = true;
            }
            signal.addEventListener(
              "abort",
              () => {
                observedAbort = true;
              },
              { once: true },
            );
          }

          await new Promise<void>((resolve) => setImmediate(resolve));

          if (!signal?.aborted) {
            ghostEffects += 1;
          }

          return { ok: true, data: { ok: true } };
        },
      });

      const timeouts = installControlledTimeouts();
      let response: IpcResponse<unknown>;
      try {
        const responsePromise = wrapped(createEvent("file://test", 1), {});
        timeouts.triggerAll();
        response = (await responsePromise) as IpcResponse<unknown>;
      } finally {
        timeouts.restore();
      }

      assert.equal(response.ok, false);
      if (response.ok) {
        assert.fail("expected IPC_TIMEOUT response");
      }
      assert.equal(response.error.code, "IPC_TIMEOUT");

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.ok(
        receivedSignal,
        "timeout should pass AbortSignal to the underlying handler",
      );
      assert.equal(receivedSignal?.aborted, true);
      assert.equal(observedAbort, true);
      assert.equal(ghostEffects, 0);
    },
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
