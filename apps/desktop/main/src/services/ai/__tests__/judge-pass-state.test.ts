import assert from "node:assert/strict";

import type { Logger } from "../../../logging/logger";
import { createJudgeQualityService } from "../judgeQualityService";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

const judgeQualityService = createJudgeQualityService({
  logger: createLogger(),
  runAdvancedChecks: async () => [],
});

const result = await judgeQualityService.evaluate({
  projectId: "project-pass-s2",
  traceId: "trace-pass-s2",
  text: "我看向窗外，雨声和心跳一起慢了下来。",
  contextSummary: "严格第一人称叙述",
});

assert.equal(result.ok, true);
if (!result.ok) {
  throw new Error("expected judge pass-state evaluation to succeed");
}

assert.equal(result.data.severity, "low");
assert.equal(result.data.partialChecksSkipped, false);
assert.ok(
  result.data.labels.length === 0 ||
    result.data.labels.includes("质量校验通过"),
);
assert.equal(result.data.summary, "质量校验通过");
