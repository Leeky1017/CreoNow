import { describe, expect, it } from "vitest";

import * as stories from "@/features/workbench/components/VersionHistorySurface.stories";

describe("VersionHistorySurface stories", () => {
  it("暴露 single-version 最简态 story", () => {
    expect(stories.SingleVersion).toBeDefined();
    expect(stories.SingleVersion.args?.items).toHaveLength(1);
  });

  it("暴露 review-ready 审计截图 story", () => {
    expect(stories.ReviewReady).toBeDefined();
    expect(stories.ReviewReady.args?.items).toHaveLength(5);
    expect(stories.ReviewReady.args?.pendingRollbackVersionId).toBe("rollback-2");
  });
});
