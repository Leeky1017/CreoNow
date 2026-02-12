import assert from "node:assert/strict";

import type { Logger } from "../../main/src/logging/logger";
import { createAiService } from "../../main/src/services/ai/aiService";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

const originalFetch = globalThis.fetch;

try {
  let inFlight = 0;
  let maxInFlight = 0;
  const queueStates: Array<{ status: string; queuePosition: number }> = [];

  globalThis.fetch = (async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);

    await new Promise((resolve) => setTimeout(resolve, 40));

    inFlight -= 1;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "queued-ok" } }],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  const service = createAiService({
    logger: createLogger(),
    env: {
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_BASE_URL: "https://api.openai.com",
      CREONOW_AI_API_KEY: "sk-test",
    },
    sleep: async () => {},
    rateLimitPerMinute: 1_000,
  });

  const runs = await Promise.all(
    [1, 2, 3].map(async (index) => {
      return await service.runSkill({
        skillId: "builtin:polish",
        input: `queued-${index}`,
        mode: "ask",
        model: "gpt-5.2",
        context: { projectId: "queue-project", documentId: "doc-1" },
        stream: false,
        ts: Date.now(),
        emitEvent: (event) => {
          const queueEvent = event as unknown as {
            type?: string;
            status?: string;
            queuePosition?: number;
          };
          if (
            queueEvent.type === "queue" &&
            typeof queueEvent.status === "string" &&
            typeof queueEvent.queuePosition === "number"
          ) {
            queueStates.push({
              status: queueEvent.status,
              queuePosition: queueEvent.queuePosition,
            });
          }
        },
      });
    }),
  );

  for (const run of runs) {
    assert.equal(run.ok, true);
  }

  assert.equal(
    maxInFlight,
    1,
    "same-session concurrent requests should be serialized (single active execution)",
  );

  assert.equal(
    queueStates.some((item) => item.status === "queued"),
    true,
    "scheduler should push queue status events when requests are waiting",
  );
} finally {
  globalThis.fetch = originalFetch;
}

// should cap global in-flight executions at 8
{
  const original = globalThis.fetch;
  try {
    let inFlight = 0;
    let maxInFlight = 0;

    globalThis.fetch = (async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 35));
      inFlight -= 1;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "global-cap-ok" } }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const service = createAiService({
      logger: createLogger(),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      sleep: async () => {},
      rateLimitPerMinute: 1_000,
    });

    const runs = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        service.runSkill({
          skillId: "builtin:rewrite",
          input: `global-${index}`,
          mode: "ask",
          model: "gpt-5.2",
          context: {
            projectId: `global-cap-project-${index}`,
            documentId: "doc-1",
          },
          stream: false,
          ts: Date.now(),
          emitEvent: () => {},
        }),
      ),
    );

    for (const run of runs) {
      assert.equal(run.ok, true);
    }

    assert.equal(maxInFlight, 8);
  } finally {
    globalThis.fetch = original;
  }
}

// should reject when per-session queue exceeds 20
{
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 8));
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "queue-cap-ok" } }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const service = createAiService({
      logger: createLogger(),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      sleep: async () => {},
      rateLimitPerMinute: 1_000,
    });

    const runs = await Promise.all(
      Array.from({ length: 22 }, (_, index) =>
        service.runSkill({
          skillId: "builtin:expand",
          input: `queue-${index}`,
          mode: "ask",
          model: "gpt-5.2",
          context: {
            projectId: "queue-overflow-project",
            documentId: "doc-1",
          },
          stream: false,
          ts: Date.now(),
          emitEvent: () => {},
        }),
      ),
    );

    const overflowCount = runs.filter(
      (run) => !run.ok && run.error.code === "SKILL_QUEUE_OVERFLOW",
    ).length;
    assert.equal(overflowCount, 1);
  } finally {
    globalThis.fetch = original;
  }
}

// should surface SKILL_TIMEOUT and recover for next run
{
  const original = globalThis.fetch;
  try {
    let callIndex = 0;

    globalThis.fetch = (async (_url, init) => {
      callIndex += 1;
      const signal = init?.signal as AbortSignal | undefined;

      if (callIndex === 1) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 40);
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
        if (signal?.aborted) {
          throw new Error("aborted");
        }
      }

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "timeout-recover-ok" } }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const service = createAiService({
      logger: createLogger(),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
        CREONOW_AI_TIMEOUT_MS: "5",
      },
      sleep: async () => {},
      rateLimitPerMinute: 1_000,
    });

    const timeoutRes = await service.runSkill({
      skillId: "builtin:rewrite",
      input: "timeout-run",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "timeout-project", documentId: "doc-1" },
      timeoutMs: 5,
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(timeoutRes.ok, false);
    if (timeoutRes.ok) {
      assert.fail("expected timeout run to fail");
    }
    assert.equal(timeoutRes.error.code, "SKILL_TIMEOUT");

    const recoveryRes = await service.runSkill({
      skillId: "builtin:rewrite",
      input: "recovery-run",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "timeout-project", documentId: "doc-1" },
      timeoutMs: 5,
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(recoveryRes.ok, true);
  } finally {
    globalThis.fetch = original;
  }
}
