import { describe, expect, it } from "vitest";
import {
  collectAllFeatureTsxFiles,
  collectPatternViolations,
} from "./guard-test-utils";

const Z_INDEX_ESCAPE_PATTERNS = [
  {
    rule: "numeric-z-tailwind",
    regex: /\bz-\d+\b/g,
  },
  {
    rule: "numeric-z-arbitrary",
    regex: /\bz-\[\d+\]/g,
  },
  {
    rule: "inline-zIndex",
    regex: /zIndex\s*:\s*\d+/g,
  },
] as const;

describe("WB-FE-TOKEN-S2 z-index token escape guard", () => {
  it("rejects numeric z-index values in all feature files", () => {
    const files = collectAllFeatureTsxFiles();

    const violations = collectPatternViolations(
      files,
      Z_INDEX_ESCAPE_PATTERNS,
    );

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file} [${v.rule}]: ${v.match}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} z-index token escape(s):\n${summary}`,
      );
    }
  });
});
