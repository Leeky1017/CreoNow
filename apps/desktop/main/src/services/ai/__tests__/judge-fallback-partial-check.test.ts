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
  runAdvancedChecks: async () => {
    throw new Error("advanced check unavailable");
  },
});

const result = await judgeQualityService.evaluate({
  projectId: "project-fallback-s3",
  traceId: "trace-fallback-s3",
  text: "我想逃离这条街。我想逃离这条街。",
  contextSummary: "第一人称叙述；关注重复检测",
});

assert.equal(result.ok, true);
if (!result.ok) {
  throw new Error("expected judge fallback evaluation to succeed");
}

assert.equal(result.data.partialChecksSkipped, true);
assert.equal(result.data.severity, "low");
assert.ok(
  result.data.labels.includes("检测到重复片段"),
  "expected rule-engine fallback labels to remain available",
);
assert.ok(
  result.data.summary.includes("部分校验已跳过"),
  "expected explicit degrade marker in summary",
);
