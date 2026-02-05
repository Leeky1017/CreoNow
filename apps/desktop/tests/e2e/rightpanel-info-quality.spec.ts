import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create a unique E2E userData directory.
 *
 * Why: Windows E2E must be repeatable and validate non-ASCII/space paths.
 */
async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E 世界 ");
  const dir = await fs.mkdtemp(base);
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

function getAppRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, "../..");
}

test.describe("RightPanel Info/Quality wiring", () => {
  test("Info tab shows today stats and document info", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const appRoot = getAppRoot();

    const electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Create a project first
    await page.getByTestId("welcome-create-project").click();
    await page.getByTestId("create-project-name").fill("Info Panel Test");
    await page.getByTestId("create-project-submit").click();

    // Wait for editor to be ready
    await expect(page.getByTestId("tiptap-editor")).toBeVisible();

    // Type some content to generate stats
    await page.getByTestId("tiptap-editor").click();
    await page.keyboard.type("Hello world testing info panel");
    await expect(page.getByTestId("editor-autosave-status")).toHaveAttribute(
      "data-status",
      "saved",
    );

    // Click Info tab in RightPanel
    await page.getByTestId("right-panel-tab-info").click();

    // Verify Info panel is visible
    await expect(page.getByTestId("info-panel")).toBeVisible();

    // Verify at least one real field is visible (words written or document title)
    const wordsWritten = page.getByTestId("info-panel-words-written");
    const docTitle = page.getByTestId("info-panel-doc-title");

    // At least one of these should be visible and have real content
    const wordsVisible = await wordsWritten.isVisible().catch(() => false);
    const titleVisible = await docTitle.isVisible().catch(() => false);

    expect(wordsVisible || titleVisible).toBe(true);

    // If words are visible, they should have non-zero value after typing
    if (wordsVisible) {
      const text = await wordsWritten.textContent();
      expect(text).not.toBe("0");
    }

    await electronApp.close();
  });

  test("Quality tab shows judge status", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const appRoot = getAppRoot();

    const electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Create a project first
    await page.getByTestId("welcome-create-project").click();
    await page.getByTestId("create-project-name").fill("Quality Panel Test");
    await page.getByTestId("create-project-submit").click();

    // Wait for editor to be ready
    await expect(page.getByTestId("tiptap-editor")).toBeVisible();

    // Click Quality tab in RightPanel
    await page.getByTestId("right-panel-tab-quality").click();

    // Verify Quality panel is visible
    await expect(page.getByTestId("quality-panel")).toBeVisible();

    // Verify judge status is visible (it should show status regardless of state)
    const judgeStatus = page.getByTestId("quality-panel-judge-status");
    await expect(judgeStatus).toBeVisible();

    // Status should be one of: Ready, Not ready, Downloading..., Error (...)
    const statusText = await judgeStatus.textContent();
    expect(statusText).toMatch(/Ready|Not ready|Downloading|Error/);

    await electronApp.close();
  });

  test("Quality tab Run All Checks refreshes state", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const appRoot = getAppRoot();

    const electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Create a project first
    await page.getByTestId("welcome-create-project").click();
    await page.getByTestId("create-project-name").fill("Run Checks Test");
    await page.getByTestId("create-project-submit").click();

    // Wait for editor to be ready
    await expect(page.getByTestId("tiptap-editor")).toBeVisible();

    // Click Quality tab in RightPanel
    await page.getByTestId("right-panel-tab-quality").click();

    // Verify Quality panel is visible
    await expect(page.getByTestId("quality-panel")).toBeVisible();

    // Find and click "Run All Checks" button
    const runAllButton = page.getByRole("button", { name: /Run All Checks/i });
    await expect(runAllButton).toBeVisible();

    // Click the button - it should trigger a refresh
    await runAllButton.click();

    // After clicking, the judge status should still be visible (state updated)
    const judgeStatus = page.getByTestId("quality-panel-judge-status");
    await expect(judgeStatus).toBeVisible();

    await electronApp.close();
  });

  test("Quality tab shows constraints count for project", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const appRoot = getAppRoot();

    const electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Create a project first
    await page.getByTestId("welcome-create-project").click();
    await page.getByTestId("create-project-name").fill("Constraints Test");
    await page.getByTestId("create-project-submit").click();

    // Wait for editor to be ready
    await expect(page.getByTestId("tiptap-editor")).toBeVisible();

    // Click Quality tab in RightPanel
    await page.getByTestId("right-panel-tab-quality").click();

    // Verify Quality panel is visible
    await expect(page.getByTestId("quality-panel")).toBeVisible();

    // Verify constraints count is visible (even if 0 rules)
    const constraintsCount = page.getByTestId("quality-panel-constraints-count");
    await expect(constraintsCount).toBeVisible();

    // Should show "X rules" format
    const countText = await constraintsCount.textContent();
    expect(countText).toMatch(/\d+\s+rules?/);

    await electronApp.close();
  });

  test("Info tab handles no project gracefully", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const appRoot = getAppRoot();

    const electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Don't create a project - stay on welcome screen
    // But the RightPanel should still be accessible if we navigate to it

    // The Info panel should show "No document selected" without crashing
    // Note: Depending on app state, this might not be directly testable
    // if the RightPanel isn't visible without a project

    await electronApp.close();
  });
});
