import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("FileTreePanel Storybook coverage", () => {
  it("should include nested/empty/dragging/context-menu/keyboard stories", () => {
    const storyPath = path.resolve(__dirname, "FileTreePanel.stories.tsx");
    const storySource = readFileSync(storyPath, "utf8");

    expect(storySource).toContain("export const Default");
    expect(storySource).toContain("export const Empty");
    expect(storySource).toContain("export const NestedHierarchy");
    expect(storySource).toContain("export const DragDropState");
    expect(storySource).toContain("export const ContextMenuState");
    expect(storySource).toContain("export const KeyboardNavigation");
  });
});
