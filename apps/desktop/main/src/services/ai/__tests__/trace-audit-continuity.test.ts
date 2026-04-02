import { describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createAiService } from "../aiService";

type LogEntry = {
  name: string;
  payload: unknown;
};

function asRecord(x: unknown): Record<string, unknown> | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return null;
  }
  return x as Record<string, unknown>;
}

describe("AI trace audit continuity", () => {
  it("keeps degrade and recovery audit logs on the same P1 single-provider trace path", async () => {
    const primaryBaseUrl = "https://primary.trace.example.com";
    const backupBaseUrl = "https://backup.trace.example.com";
    const originalFetch = globalThis.fetch;

    try {
      let nowMs = 0;
      let primaryCalls = 0;
      const logs: LogEntry[] = [];

      const logger: Logger = {
        logPath: "<test>",
        info: (name, payload) => {
          logs.push({ name, payload });
        },
        error: () => {},
      };

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
              choices: [{ message: { content: "primary-recovered" } }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        if (url.startsWith(`${backupBaseUrl}/v1/messages`)) {
          return new Response(
            JSON.stringify({
              content: [{ text: "backup-path" }],
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
        logger,
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
          input: "trace-case",
          mode: "ask",
          model: "gpt-5.2",
          context: { projectId: "trace-project", documentId: "doc-1" },
          stream: false,
          ts: nowMs,
          emitEvent: () => {},
        });

      await runOnce();
      await runOnce();
      const degradedRun = await runOnce();
      expect(degradedRun).toMatchObject({
        ok: false,
        error: { code: "AI_PROVIDER_UNAVAILABLE" },
      });

      nowMs += 15 * 60 * 1000 + 1;
      await expect(runOnce()).resolves.toMatchObject({ ok: true });

      const degraded = logs.find((entry) => entry.name === "ai_provider_degraded");
      const halfOpen = logs.find(
        (entry) => entry.name === "ai_provider_half_open_probe",
      );
      const recovered = logs.find((entry) => entry.name === "ai_provider_recovered");

      expect(degraded).toBeDefined();
      expect(halfOpen).toBeDefined();
      expect(recovered).toBeDefined();
      expect(logs.find((entry) => entry.name === "ai_provider_failover")).toBeUndefined();

      const startedTraceIds = new Set(
        logs
          .filter((entry) => entry.name === "ai_run_started")
          .map((entry) => {
            const payload = asRecord(entry.payload);
            return typeof payload?.traceId === "string" ? payload.traceId : "";
          })
          .filter((traceId) => traceId.length > 0),
      );

      for (const entry of [degraded, halfOpen, recovered]) {
        const payload = asRecord(entry?.payload);
        expect(typeof payload?.traceId).toBe("string");
        expect(startedTraceIds.has(String(payload?.traceId))).toBe(true);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
