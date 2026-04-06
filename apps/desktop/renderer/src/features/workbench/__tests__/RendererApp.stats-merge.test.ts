import { describe, expect, it } from "vitest";

import { mergeDashboardProjects } from "@/features/workbench/RendererApp";

function buildListItems(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    projectId: `proj-${index}`,
    name: `Project ${index}`,
    rootPath: `/projects/proj-${index}`,
    type: "novel" as const,
    stage: "draft" as const,
    updatedAt: 1_000 + index,
  }));
}

function buildStatsItems(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    projectId: `proj-${index}`,
    wordCount: index * 10,
    progressPercent: index % 100,
  }));
}

describe("mergeDashboardProjects", () => {
  it("按 projectId 合并 stats 字段", () => {
    const listItems = buildListItems(2);
    const statsItems = [{ projectId: "proj-1", wordCount: 4321, progressPercent: 88 }];
    const merged = mergeDashboardProjects(listItems, statsItems);

    expect(merged).toHaveLength(2);
    expect(merged[0].wordCount).toBeUndefined();
    expect(merged[1]).toMatchObject({
      id: "proj-1",
      wordCount: 4321,
      progressPercent: 88,
    });
  });

  it("5000 项聚合在合理阈值内完成（<=120ms）", () => {
    const listItems = buildListItems(5000);
    const statsItems = buildStatsItems(5000);

    mergeDashboardProjects(listItems, statsItems);
    const startedAt = performance.now();
    const merged = mergeDashboardProjects(listItems, statsItems);
    const elapsedMs = performance.now() - startedAt;

    expect(merged).toHaveLength(5000);
    expect(elapsedMs).toBeLessThanOrEqual(120);
  });
});
