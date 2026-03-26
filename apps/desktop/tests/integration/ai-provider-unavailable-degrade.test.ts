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

const primaryBaseUrl = "https://primary.down.example.com";
const backupBaseUrl = "https://backup.down.example.com";

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = (async (input: URL | RequestInfo, _init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith(primaryBaseUrl) || url.startsWith(backupBaseUrl)) {
      return new Response(
        JSON.stringify({ error: { message: "provider unavailable" } }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response("unexpected url", { status: 500 });
  }) as typeof fetch;

  const service = createAiService({
    logger: createLogger(),
    env: {
      CREONOW_AI_API_KEY: "sk-env",
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_BASE_URL: primaryBaseUrl,
    },
    sleep: async () => {},
    rateLimitPerMinute: 1_000,
    getProxySettings: () => ({
      enabled: false,
      baseUrl: null,
      apiKey: null,
      providerMode: "openai-byok",
      openAiCompatibleBaseUrl: null,
      openAiCompatibleApiKey: null,
      openAiByokBaseUrl: primaryBaseUrl,
      openAiByokApiKey: "sk-primary",
      openAiByok: {
        baseUrl: primaryBaseUrl,
        apiKey: "sk-primary",
      },
      anthropicByokBaseUrl: backupBaseUrl,
      anthropicByokApiKey: "sk-backup",
      anthropicByok: {
        baseUrl: backupBaseUrl,
        apiKey: "sk-backup",
      },
    }),
  });

  const result = await service.runSkill({
    skillId: "builtin:polish",
    input: "degrade test",
    mode: "ask",
    model: "gpt-5.2",
    context: { projectId: "degrade-project", documentId: "doc-1" },
    stream: false,
    ts: Date.now(),
    emitEvent: () => {},
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("expected all-provider unavailable response");
  }
  assert.equal(result.error.code, "AI_PROVIDER_UNAVAILABLE");
} finally {
  globalThis.fetch = originalFetch;
}
