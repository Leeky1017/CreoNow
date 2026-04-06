import { describe, expect, it, vi } from "vitest";

import { mergeDashboardProjects, readPerProjectStats } from "@/features/workbench/RendererApp";

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

function mergeDashboardProjectsNaive(
  listItems: ReturnType<typeof buildListItems>,
  statsItems: ReturnType<typeof buildStatsItems>,
) {
  return listItems.map((item) => {
    const stats = statsItems.find((entry) => entry.projectId === item.projectId);
    return {
      id: item.projectId,
      title: item.name,
      type: item.type,
      stage: item.stage,
      updatedAt: item.updatedAt,
      wordCount: stats?.wordCount,
      progressPercent: stats?.progressPercent,
    };
  });
}

function measureAverageMs(fn: () => unknown, rounds: number): number {
  const durations: number[] = [];
  for (let index = 0; index < rounds; index++) {
    const startedAt = performance.now();
    fn();
    durations.push(performance.now() - startedAt);
  }
  return durations.reduce((acc, duration) => acc + duration, 0) / durations.length;
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
    const baselineListItems = buildListItems(5000);
    const baselineStatsItems = buildStatsItems(5000);

    mergeDashboardProjects(listItems, statsItems);
    mergeDashboardProjectsNaive(baselineListItems, baselineStatsItems);
    const optimizedAvgMs = measureAverageMs(
      () => mergeDashboardProjects(listItems, statsItems),
      10,
    );
    const baselineAvgMs = measureAverageMs(
      () => mergeDashboardProjectsNaive(baselineListItems, baselineStatsItems),
      5,
    );
    const merged = mergeDashboardProjects(listItems, statsItems);

    expect(merged).toHaveLength(5000);
    expect(optimizedAvgMs).toBeLessThanOrEqual(120);
    expect(optimizedAvgMs).toBeLessThan(baselineAvgMs);
    expect(baselineAvgMs / optimizedAvgMs).toBeGreaterThan(1.5);
  });
});

describe("readPerProjectStats", () => {
  it("normalizes valid perProject metrics and drops invalid entries with observability", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const parsed = readPerProjectStats({
      perProject: [
        { projectId: "proj-1", wordCount: 12.8, progressPercent: 66.7 },
        { projectId: "", wordCount: 10, progressPercent: 20 },
        { projectId: "proj-2", wordCount: -2, progressPercent: 120 },
        { projectId: "proj-3", wordCount: "NaN", progressPercent: Number.NaN },
      ],
    });

    expect(parsed).toEqual([
      { projectId: "proj-1", wordCount: 12, progressPercent: 67 },
      { projectId: "proj-2", wordCount: 0, progressPercent: 100 },
      { projectId: "proj-3", wordCount: undefined, progressPercent: undefined },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RendererApp] project.stats payload validation issues",
      expect.objectContaining({ count: expect.any(Number) }),
    );
    warnSpy.mockRestore();
  });
});
