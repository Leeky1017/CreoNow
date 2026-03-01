import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("AiPanel styles guard", () => {
  it("WB-FE-STYLE-S1 does not inject inline <style> in AiPanel", () => {
    const source = readFileSync("renderer/src/features/ai/AiPanel.tsx", "utf8");

    expect(source).not.toMatch(/<style>/);
    expect(source).not.toMatch(/@keyframes\s+blink/);
  });
});
