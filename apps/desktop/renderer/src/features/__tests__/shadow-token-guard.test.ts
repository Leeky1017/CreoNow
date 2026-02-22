import { describe, expect, it } from "vitest";
import {
  AI_OVERLAY_TARGET_FILES,
  collectPatternViolations,
} from "./guard-test-utils";

const FORBIDDEN_SHADOW_PATTERNS = [
  {
    rule: "magic-shadow-arbitrary-value",
    regex: /\bshadow-\[0_[^\]]+\]/g,
  },
  {
    rule: "raw-inline-box-shadow",
    regex: /\bboxShadow\s*:\s*["'`](?!var\(--shadow-)[^"'`]+["'`]/g,
  },
  {
    rule: "raw-css-box-shadow",
    regex: /\bbox-shadow\s*:\s*(?!var\(--shadow-)[^;]+;/g,
  },
] as const;

describe("WB-P1-S4 shadow token guard", () => {
  it("rejects magic shadow values and raw box-shadow usage in AI feature files", () => {
    expect(
      collectPatternViolations(
        AI_OVERLAY_TARGET_FILES,
        FORBIDDEN_SHADOW_PATTERNS,
      ),
    ).toEqual([]);
  });
});
