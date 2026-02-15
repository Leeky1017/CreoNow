import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createAiService } from "../aiService";

type LogEvent = {
  name: string;
  payload: unknown;
};

const originalFetch = globalThis.fetch;

try {
  const errors: LogEvent[] = [];
  const logger: Logger = {
    logPath: "<test>",
    info: () => {},
    error: (name, payload) => {
      errors.push({ name, payload });
    },
  };

  globalThis.fetch = (async (_input: URL | RequestInfo) => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "s3-trace-output",
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  const service = createAiService({
    logger,
    env: {
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_BASE_URL: "https://api.openai.com",
      CREONOW_AI_API_KEY: "sk-test",
    },
    sleep: async () => {},
    rateLimitPerMinute: 1_000,
    traceStore: {
      persistGenerationTrace: () => ({
        ok: false,
        error: {
          code: "DB_ERROR",
          message: "trace write failed",
        },
      }),
      recordTraceFeedback: () => ({ ok: true, data: { feedbackId: "unused" } }),
      getTraceIdByRunId: () => null,
    },
  });

  const run = await service.runSkill({
    skillId: "builtin:polish",
    input: "trace degraded",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: 1_703_000_000_000,
    emitEvent: () => {},
  });

  assert.equal(run.ok, true, "runSkill should still succeed when trace persistence fails");
  if (!run.ok) {
    throw new Error("runSkill should return successful output");
  }

  assert.equal(run.data.outputText, "s3-trace-output");
  assert.equal(
    run.data.degradation?.code,
    "TRACE_PERSISTENCE_DEGRADED",
    "S3-TRACE-S3: must emit structured degradation signal",
  );
  assert.equal(typeof run.data.degradation?.traceId, "string");
  assert.equal(typeof run.data.degradation?.runId, "string");
  assert.equal(run.data.degradation?.cause.code, "DB_ERROR");

  const degradeLog = errors.find(
    (entry) => entry.name === "ai_trace_persistence_degraded",
  );
  assert.ok(
    degradeLog,
    "S3-TRACE-S3: logger must emit ai_trace_persistence_degraded with structured fields",
  );
} finally {
  globalThis.fetch = originalFetch;
}
