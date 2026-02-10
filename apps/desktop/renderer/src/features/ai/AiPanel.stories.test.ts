import { describe, it, expect } from "vitest";

import * as stories from "./AiPanel.stories";

describe("AiPanel stories", () => {
  it("should provide required four-state coverage for Storybook", () => {
    expect(stories.Default).toBeDefined();
    expect(stories.EmptyState).toBeDefined();
    expect(stories.GeneratingState).toBeDefined();
    expect(stories.ErrorState).toBeDefined();
  });
});
