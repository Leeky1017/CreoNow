import assert from "node:assert/strict";

import { RUNTIME_GOVERNANCE_DEFAULTS } from "@shared/runtimeGovernance";
import { resolveRuntimeGovernanceFromEnv as resolveMain } from "../../main/src/config/runtimeGovernance";
import { resolveRuntimeGovernanceFromEnv as resolvePreload } from "../../preload/src/runtimeGovernance";

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
