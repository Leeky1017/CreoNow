import { describe, expect, it } from "vitest";
import {
  collectAllFeatureTsxFiles,
  collectPatternViolationsStripped,
} from "./guard-test-utils";

/**
 * Files whose hex/rgba values are DATA (e.g. color-picker options,
 * diff highlight semantics), not arbitrary styling. Excluded from this guard.
 */
const WHITELIST_FILES = [
  "apps/desktop/renderer/src/features/settings-dialog/SettingsAppearancePage.tsx",
  "apps/desktop/renderer/src/features/diff/DiffView.tsx",
  "apps/desktop/renderer/src/features/diff/SplitDiffView.tsx",
  "apps/desktop/renderer/src/features/diff/VersionPane.tsx",
];

const COLOR_ESCAPE_PATTERNS = [
  {
    rule: "hex-color",
    regex: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  },
  {
    rule: "raw-rgba",
    regex: /rgba?\(\s*\d[^)]*\)/g,
  },
] as const;

describe("WB-FE-TOKEN-S1 color token escape guard", () => {
  it("rejects hardcoded hex and rgba values in all feature files", () => {
    const files = collectAllFeatureTsxFiles().filter(
      (f) => !WHITELIST_FILES.includes(f),
    );

    const violations = collectPatternViolationsStripped(
      files,
      COLOR_ESCAPE_PATTERNS,
    );

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file} [${v.rule}]: ${v.match}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} color token escape(s):\n${summary}`,
      );
    }
  });
});
