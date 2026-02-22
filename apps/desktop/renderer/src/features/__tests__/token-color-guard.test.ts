import { describe, expect, it } from "vitest";
import {
  AI_OVERLAY_TARGET_FILES,
  collectPatternViolations,
} from "./guard-test-utils";

const FORBIDDEN_COLOR_PATTERNS = [
  {
    rule: "hex-color",
    regex: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  },
  {
    rule: "raw-rgb-rgba",
    regex: /rgba?\(\s*(?!var\(--color-)[^)]+\)/g,
  },
  {
    rule: "raw-tailwind-palette-token",
    regex:
      /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?\b/g,
  },
] as const;

describe("WB-P1-S1 color token guard", () => {
  it("rejects raw colors and raw tailwind palette tokens in AI feature files", () => {
    expect(
      collectPatternViolations(
        AI_OVERLAY_TARGET_FILES,
        FORBIDDEN_COLOR_PATTERNS,
      ),
    ).toEqual([]);
  });
});
