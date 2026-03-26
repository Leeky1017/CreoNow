import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createProviderResolver } from "../providerResolver";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

const resolverA = createProviderResolver({
  logger: createLogger(),
  now: () => 1_000,
});
const resolverB = createProviderResolver({
  logger: createLogger(),
  now: () => 1_000,
});

const cfg = {
  provider: "openai" as const,
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test",
  timeoutMs: 30_000,
};

assert.equal(
  resolverA.getProviderHealthState(cfg).status,
  "healthy",
  "AI-S1-ASE-S2: resolverA should start healthy",
);
assert.equal(
  resolverB.getProviderHealthState(cfg).status,
  "healthy",
  "AI-S1-ASE-S2: resolverB should start healthy",
);

resolverA.markProviderFailure({
  cfg,
  traceId: "trace-a-1",
  reason: "LLM_API_ERROR",
});
resolverA.markProviderFailure({
  cfg,
  traceId: "trace-a-2",
  reason: "LLM_API_ERROR",
});
const degraded = resolverA.markProviderFailure({
  cfg,
  traceId: "trace-a-3",
  reason: "LLM_API_ERROR",
});

assert.equal(
  degraded.status,
  "degraded",
  "AI-S1-ASE-S2: resolverA should degrade after threshold failures",
);
assert.equal(
  resolverB.getProviderHealthState(cfg).status,
  "healthy",
  "AI-S1-ASE-S2: resolverB state must remain isolated from resolverA",
);

resolverA.markProviderSuccess({
  cfg,
  traceId: "trace-a-recover",
  fromHalfOpen: true,
});
assert.equal(
  resolverA.getProviderHealthState(cfg).status,
  "healthy",
  "AI-S1-ASE-S2: resolverA can recover independently",
);
assert.equal(
  resolverB.getProviderHealthState(cfg).status,
  "healthy",
  "AI-S1-ASE-S2: resolverB must not be affected by resolverA recovery",
);
