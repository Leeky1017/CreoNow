import assert from "node:assert/strict";

import { mapUpstreamStatusToIpcErrorCode } from "../../main/src/services/ai/aiService";

{
  assert.equal(mapUpstreamStatusToIpcErrorCode(401), "PERMISSION_DENIED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(403), "PERMISSION_DENIED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(429), "RATE_LIMITED");
  assert.equal(mapUpstreamStatusToIpcErrorCode(400), "UPSTREAM_ERROR");
  assert.equal(mapUpstreamStatusToIpcErrorCode(500), "UPSTREAM_ERROR");
}

