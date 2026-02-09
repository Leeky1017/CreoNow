import assert from "node:assert/strict";

import { mapUpstreamStatusToIpcErrorCode } from "../../main/src/services/ai/aiService";

{
  assert.equal(mapUpstreamStatusToIpcErrorCode(401), "AI_AUTH_FAILED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(403), "AI_AUTH_FAILED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(429), "AI_RATE_LIMITED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(400), "LLM_API_ERROR");
  assert.equal(mapUpstreamStatusToIpcErrorCode(500), "LLM_API_ERROR");
}
