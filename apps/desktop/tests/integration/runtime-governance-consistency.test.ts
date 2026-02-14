import assert from "node:assert/strict";

import { RUNTIME_GOVERNANCE_DEFAULTS } from "@shared/runtimeGovernance";
import { resolveRuntimeGovernanceFromEnv as resolveMain } from "../../main/src/config/runtimeGovernance";
import { resolveRuntimeGovernanceFromEnv as resolvePreload } from "../../preload/src/runtimeGovernance";

// S1-RC-S1
// returns unified defaults in both main and preload when env is not set
{
  const mainCfg = resolveMain({});
  const preloadCfg = resolvePreload({});

  assert.deepEqual(mainCfg, RUNTIME_GOVERNANCE_DEFAULTS);
  assert.deepEqual(preloadCfg, RUNTIME_GOVERNANCE_DEFAULTS);
  assert.deepEqual(preloadCfg, mainCfg);
}

// S1-RC-S2
// applies valid env overrides and keeps preload/main governance value consistent
{
  const validEnv = {
    CN_IPC_MAX_PAYLOAD_BYTES: "1048576",
    CN_AI_TIMEOUT_MS: "30000",
    CN_AI_RETRY_BACKOFF_MS: "500,1000,2000",
    CN_AI_SESSION_TOKEN_BUDGET: "123456",
    CN_KG_QUERY_TIMEOUT_MS: "9999",
    CN_RAG_MAX_TOKENS: "2048",
  };

  const mainCfg = resolveMain(validEnv);
  const preloadCfg = resolvePreload(validEnv);

  assert.equal(mainCfg.ipc.maxPayloadBytes, 1_048_576);
  assert.equal(mainCfg.ai.timeoutMs, 30_000);
  assert.deepEqual(mainCfg.ai.retryBackoffMs, [500, 1000, 2000]);
  assert.equal(mainCfg.ai.sessionTokenBudget, 123_456);
  assert.equal(mainCfg.kg.queryTimeoutMs, 9_999);
  assert.equal(mainCfg.rag.maxTokens, 2_048);
  assert.deepEqual(preloadCfg, mainCfg);
}

// S1-RC-S3
// falls back on invalid env and keeps preload/main governance value consistent
{
  const invalidEnv = {
    CN_IPC_MAX_PAYLOAD_BYTES: "",
    CN_AI_TIMEOUT_MS: "not-a-number",
    CN_AI_RETRY_BACKOFF_MS: "1000,NOPE,2000",
    CN_AI_SESSION_TOKEN_BUDGET: "-1",
    CN_KG_QUERY_TIMEOUT_MS: "0",
    CN_RAG_MAX_TOKENS: "1_500",
  };

  const mainCfg = resolveMain(invalidEnv);
  const preloadCfg = resolvePreload(invalidEnv);

  assert.deepEqual(mainCfg, RUNTIME_GOVERNANCE_DEFAULTS);
  assert.deepEqual(preloadCfg, RUNTIME_GOVERNANCE_DEFAULTS);
  assert.deepEqual(preloadCfg, mainCfg);
}
