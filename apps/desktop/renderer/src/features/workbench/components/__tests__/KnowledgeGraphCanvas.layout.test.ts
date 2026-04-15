import { describe, expect, it } from "vitest";

import {
  resolveForceLayoutIterations,
  shouldUseForceLayout,
} from "@/features/workbench/components/KnowledgeGraphCanvas";

describe("KnowledgeGraphCanvas layout guards", () => {
  it("uses force layout for small and medium graphs", () => {
    expect(shouldUseForceLayout(1)).toBe(true);
    expect(shouldUseForceLayout(120)).toBe(true);
    expect(shouldUseForceLayout(180)).toBe(true);
  });

  it("skips force layout for very large graphs", () => {
    expect(shouldUseForceLayout(181)).toBe(false);
    expect(shouldUseForceLayout(500)).toBe(false);
  });

  it("reduces force layout iterations as graph size grows", () => {
    expect(resolveForceLayoutIterations(20)).toBe(120);
    expect(resolveForceLayoutIterations(40)).toBe(92);
    expect(resolveForceLayoutIterations(100)).toBe(68);
    expect(resolveForceLayoutIterations(180)).toBe(40);
  });
});
