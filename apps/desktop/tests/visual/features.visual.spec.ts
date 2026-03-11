import { test, expect } from "@playwright/test";
import { navigateToStory, screenshotName } from "./visual.setup";

/**
 * 功能组件视觉回归测试（优先级前 10）
 *
 * 每个 Story 在 dark + light 主题下截图对比。
 * Story ID 取自 Storybook 构建产物 index.json。
 *
 * 注：EditorPane 因依赖 EditorStoreProvider、AppShell 因依赖 AppToastProvider，
 *     在独立 iframe 中渲染失败，替换为其他功能组件。
 */

const FEATURE_STORIES: Array<{ component: string; storyId: string; story: string }> = [
  { component: "dashboard", storyId: "features-dashboard-dashboardpage--default", story: "default" },
  { component: "dashboard", storyId: "features-dashboard-dashboardpage--empty", story: "empty" },
  { component: "ai-panel", storyId: "features-aipanel--default", story: "default" },
  { component: "ai-panel", storyId: "features-aipanel--empty-state", story: "empty-state" },
  { component: "analytics", storyId: "features-analyticspage--with-data", story: "with-data" },
  { component: "analytics", storyId: "features-analyticspage--empty-data", story: "empty-data" },
  { component: "memory", storyId: "features-memorypanel--default", story: "default" },
  { component: "command-palette", storyId: "features-commandpalette--default", story: "default" },
  { component: "file-tree", storyId: "features-filetreepanel--default", story: "default" },
  { component: "outline", storyId: "features-outlinepanel--default-multi-level", story: "default-multi-level" },
  { component: "version-history", storyId: "features-versionhistorypanel--default-with-history", story: "default-with-history" },
  { component: "search", storyId: "features-searchpanel--default", story: "default" },
  { component: "skill-picker", storyId: "features-skillpicker--default", story: "default" },
  { component: "diff-view", storyId: "features-diffview--default", story: "default" },
];

for (const { component, storyId, story } of FEATURE_STORIES) {
  test(`${component} / ${story}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.name as "dark" | "light";
    await navigateToStory(page, storyId, theme);

    await expect(page.locator("#storybook-root")).toHaveScreenshot(
      screenshotName(component, story, theme) + ".png",
    );
  });
}
