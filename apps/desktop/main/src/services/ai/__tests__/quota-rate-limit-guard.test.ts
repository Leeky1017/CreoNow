import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createAiService } from "../aiService";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

const originalFetch = globalThis.fetch;

try {
  {
    let fetchCalls = 0;

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
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

    const largeInput = "x".repeat(450_000);

    const first = await service.runSkill({
      skillId: "builtin:polish",
      input: largeInput,
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "budget-project", documentId: "doc-1" },
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(first.ok, true);

    const second = await service.runSkill({
      skillId: "builtin:polish",
      input: largeInput,
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "budget-project", documentId: "doc-1" },
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(second.ok, false);
    if (second.ok) {
      assert.fail("expected budget guard to block second request");
    }
    assert.equal(second.error.code, "AI_SESSION_TOKEN_BUDGET_EXCEEDED");
    assert.equal(
      fetchCalls,
      1,
      "budget guard should block before upstream provider call",
    );
  }

  {
    let fetchCalls = 0;

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
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
      rateLimitPerMinute: 1,
    });

    const first = await service.runSkill({
      skillId: "builtin:polish",
      input: "first",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "rate-project", documentId: "doc-1" },
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(first.ok, true);

    const second = await service.runSkill({
      skillId: "builtin:polish",
      input: "second",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId: "rate-project", documentId: "doc-1" },
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });
    assert.equal(second.ok, false);
    if (second.ok) {
      assert.fail("expected rate-limit guard to block second request");
    }
    assert.equal(second.error.code, "AI_RATE_LIMITED");
    assert.equal(
      fetchCalls,
      1,
      "rate-limit guard should block before upstream provider call",
    );
  }
} finally {
  globalThis.fetch = originalFetch;
}
