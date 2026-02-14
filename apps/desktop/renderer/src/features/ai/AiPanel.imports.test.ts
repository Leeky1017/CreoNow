import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("AiPanel imports", () => {
  it("S1-BPC-2: AiPanel imports useOpenSettings from contexts/OpenSettingsContext", () => {
    const source = readFileSync("renderer/src/features/ai/AiPanel.tsx", "utf8");

    expect(source).toMatch(
      /from\s+["']\.\.\/\.\.\/contexts\/OpenSettingsContext["']/,
    );
    expect(source).not.toMatch(
      /from\s+["']\.\.\/\.\.\/components\/layout\/RightPanel["']/,
    );
  });
});
