import { describe, expect, it } from "vitest";
import {
  AI_OVERLAY_TARGET_FILES,
  collectPatternViolations,
} from "./guard-test-utils";

const FORBIDDEN_Z_INDEX_PATTERNS = [
  {
    rule: "numeric-z-index-tailwind-class",
    regex: /\bz-(?:10|20|30|50)\b/g,
  },
  {
    rule: "numeric-z-index-arbitrary-class",
    regex: /\bz-\[\d+\]\b/g,
  },
  {
    rule: "inline-numeric-zIndex",
    regex: /\bzIndex\s*:\s*\d+\b/g,
  },
] as const;

describe("WB-P1-S2 z-index token guard", () => {
  it("rejects numeric z-index classes and numeric inline zIndex in AI feature files", () => {
    expect(
      collectPatternViolations(
        AI_OVERLAY_TARGET_FILES,
        FORBIDDEN_Z_INDEX_PATTERNS,
      ),
    ).toEqual([]);
  });
});
