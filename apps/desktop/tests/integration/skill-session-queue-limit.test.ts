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
        emitEvent: () => {},
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
} finally {
  globalThis.fetch = originalFetch;
}
