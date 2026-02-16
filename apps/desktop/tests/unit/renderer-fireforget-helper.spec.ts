import assert from "node:assert/strict";

import { runFireAndForget } from "../../renderer/src/lib/fireAndForget";

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// C1C-S2: fire-and-forget helper should not swallow errors silently [ADDED]
{
  const original = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  runFireAndForget(async () => {
    throw new Error("boom");
  });
  await flushMicrotasks();

  console.error = original;

  assert.equal(
    calls.length,
    1,
    "expected default error logging for uncaught task rejection",
  );
}

{
  let captured: unknown = null;
  runFireAndForget(
    async () => {
      throw new Error("handled");
    },
    (error) => {
      captured = error;
    },
  );

  await flushMicrotasks();
  assert.ok(captured instanceof Error);
  assert.equal((captured as Error).message, "handled");
}
