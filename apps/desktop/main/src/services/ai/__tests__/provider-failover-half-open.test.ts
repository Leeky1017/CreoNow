import { describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createAiService } from "../aiService";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

describe("AI service provider half-open recovery", () => {
  it("keeps backup dormant on P1 and recovers only after the half-open window", async () => {
    const primaryBaseUrl = "https://primary.example.com";
    const backupBaseUrl = "https://backup.example.com";
    const originalFetch = globalThis.fetch;

    try {
      let nowMs = 0;
      let primaryCalls = 0;
      let backupCalls = 0;

      globalThis.fetch = (async (input: URL | RequestInfo) => {
        const url = String(input);

        if (url.startsWith(`${primaryBaseUrl}/v1/chat/completions`)) {
          primaryCalls += 1;

          if (primaryCalls <= 3) {
            return new Response(
              JSON.stringify({ error: { message: "primary unavailable" } }),
              {
                status: 503,
                headers: { "content-type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({
              choices: [{ message: { content: "primary-ok" } }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        if (url.startsWith(`${backupBaseUrl}/v1/messages`)) {
          backupCalls += 1;
          return new Response(
            JSON.stringify({
              content: [{ text: "backup-ok" }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response("unexpected url", { status: 500 });
      }) as typeof fetch;

      const service = createAiService({
        logger: createLogger(),
        env: {},
        now: () => nowMs,
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
        getProxySettings: () => ({
          enabled: false,
          providerMode: "openai-byok",
          openAiCompatible: {
            baseUrl: null,
            apiKey: null,
          },
          openAiByok: {
            baseUrl: primaryBaseUrl,
            apiKey: "sk-primary",
          },
          anthropicByok: {
            baseUrl: backupBaseUrl,
            apiKey: "sk-backup",
          },
        }),
      });

      const runOnce = async () =>
        await service.runSkill({
          skillId: "builtin:polish",
          input: "hello",
          mode: "ask",
          model: "gpt-5.2",
          context: { projectId: "project-failover", documentId: "doc-1" },
          stream: false,
          ts: nowMs,
          emitEvent: () => {},
        });

      await expect(runOnce()).resolves.toMatchObject({
        ok: false,
        error: { code: "AI_PROVIDER_UNAVAILABLE" },
      });
      await expect(runOnce()).resolves.toMatchObject({
        ok: false,
        error: { code: "AI_PROVIDER_UNAVAILABLE" },
      });
      await expect(runOnce()).resolves.toMatchObject({
        ok: false,
        error: { code: "AI_PROVIDER_UNAVAILABLE" },
      });

      expect(backupCalls).toBe(0);

      nowMs += 15 * 60 * 1000 + 1;

      await expect(runOnce()).resolves.toMatchObject({
        ok: true,
      });
      expect(backupCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
