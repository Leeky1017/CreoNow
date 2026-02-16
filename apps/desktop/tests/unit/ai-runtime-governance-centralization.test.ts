import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const aiIpcPath = path.resolve(
  import.meta.dirname,
  "../../main/src/ipc/ai.ts",
);
const aiIpcSource = readFileSync(aiIpcPath, "utf8");

// S1: AI runtime quotas should be centralized via runtime governance [ADDED]
assert.match(
  aiIpcSource,
  /resolveRuntimeGovernanceFromEnv/,
  "ai IPC should resolve runtime governance config",
);
assert.match(
  aiIpcSource,
  /runtimeGovernance\.ai\.streamRateLimitPerSecond/,
  "push backpressure limit should read from runtime governance",
);
assert.match(
  aiIpcSource,
  /runtimeGovernance\.ai\.chatMessageCapacity/,
  "chat capacity should read from runtime governance",
);
assert.doesNotMatch(
  aiIpcSource,
  /const AI_STREAM_RATE_LIMIT_PER_SECOND =/,
  "hardcoded stream rate limit constant should be removed",
);
assert.doesNotMatch(
  aiIpcSource,
  /const AI_CHAT_MESSAGE_CAPACITY =/,
  "hardcoded chat capacity constant should be removed",
);
