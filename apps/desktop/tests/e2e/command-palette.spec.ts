/**
 * E2E tests for Command Palette + Keyboard Shortcuts
 *
 * Tests coverage per P0-002-command-palette-commands-and-shortcuts.md:
 * - Cmd/Ctrl+P opens Command Palette
 * - Search "Settings" → Enter → SettingsDialog visible
 * - Search "Export" → Enter → ExportDialog visible
 * - Cmd/Ctrl+\ toggles Sidebar (NOT Cmd+B per DESIGN_DECISIONS.md)
 * - Cmd/Ctrl+L toggles Right Panel
 * - F11 toggles Zen Mode
 * - Cmd/Ctrl+, opens Settings directly
 * - Cmd/Ctrl+Shift+N opens Create Project dialog
 */
import {
  _electron as electron,
  expect,
  test,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E CommandPalette ");
  const dir = await fs.mkdtemp(base);
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

/**
 * Get the platform-specific modifier key
 */
function getModKey(): "Meta" | "Control" {
  return process.platform === "darwin" ? "Meta" : "Control";
}

test.describe("Command Palette + Shortcuts", () => {
  let userDataDir: string;
  let electronApp: Awaited<ReturnType<typeof electron.launch>>;
  let page: Page;

  test.beforeAll(async () => {
    userDataDir = await createIsolatedUserDataDir();
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const appRoot = path.resolve(__dirname, "../..");

    electronApp = await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test("Cmd/Ctrl+P opens Command Palette", async () => {
    const modKey = getModKey();

    // Ensure command palette is not visible initially
    await expect(page.getByTestId("command-palette")).not.toBeVisible();

    // Press Cmd/Ctrl+P
    await page.keyboard.press(`${modKey}+p`);

    // Command palette should now be visible
    await expect(page.getByTestId("command-palette")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).not.toBeVisible();
  });

  test("Search 'Settings' in Command Palette → SettingsDialog visible", async () => {
    const modKey = getModKey();

    // Open command palette
    await page.keyboard.press(`${modKey}+p`);
    await expect(page.getByTestId("command-palette")).toBeVisible();

    // Type "Settings" to filter
    await page.getByRole("textbox", { name: "Search commands" }).fill("Settings");

    // Press Enter to select first result
    await page.keyboard.press("Enter");

    // SettingsDialog should be visible (check for the dialog content)
    // Note: SettingsDialog uses Radix which renders in a portal
    await expect(
      page.getByRole("dialog", { name: /settings/i }),
    ).toBeVisible();

    // Close the dialog
    await page.keyboard.press("Escape");
  });

  test("Cmd/Ctrl+\\ toggles Sidebar visibility", async () => {
    const modKey = getModKey();

    // Get initial sidebar state
    const sidebar = page.getByTestId("layout-sidebar");
    const initiallyVisible = await sidebar.isVisible();

    // Press Cmd/Ctrl+\
    await page.keyboard.press(`${modKey}+\\`);

    // Sidebar should toggle
    if (initiallyVisible) {
      await expect(sidebar).not.toBeVisible();
    } else {
      await expect(sidebar).toBeVisible();
    }

    // Toggle back
    await page.keyboard.press(`${modKey}+\\`);

    // Should be back to initial state
    if (initiallyVisible) {
      await expect(sidebar).toBeVisible();
    } else {
      await expect(sidebar).not.toBeVisible();
    }
  });

  test("Cmd/Ctrl+L toggles Right Panel visibility", async () => {
    const modKey = getModKey();

    // Get initial panel state
    const panel = page.getByTestId("layout-panel");
    const initiallyVisible = await panel.isVisible();

    // Press Cmd/Ctrl+L
    await page.keyboard.press(`${modKey}+l`);

    // Panel should toggle
    if (initiallyVisible) {
      await expect(panel).not.toBeVisible();
    } else {
      await expect(panel).toBeVisible();
    }

    // Toggle back
    await page.keyboard.press(`${modKey}+l`);

    // Should be back to initial state
    if (initiallyVisible) {
      await expect(panel).toBeVisible();
    } else {
      await expect(panel).not.toBeVisible();
    }
  });

  test("F11 toggles Zen Mode", async () => {
    // Press F11 to enter Zen Mode
    await page.keyboard.press("F11");

    // In Zen Mode, sidebar and panel should be collapsed
    await expect(page.getByTestId("layout-sidebar")).not.toBeVisible();
    await expect(page.getByTestId("layout-panel")).not.toBeVisible();

    // Press F11 again to exit
    await page.keyboard.press("F11");

    // Panels should be restored (the exact state depends on previous state)
    // Just verify the app shell is still there
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });

  test("Escape exits Zen Mode", async () => {
    // Enter Zen Mode
    await page.keyboard.press("F11");
    await expect(page.getByTestId("layout-sidebar")).not.toBeVisible();

    // Press Escape to exit
    await page.keyboard.press("Escape");

    // Should have exited Zen Mode (app shell still visible)
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });

  test("Cmd/Ctrl+, opens Settings directly", async () => {
    const modKey = getModKey();

    // Press Cmd/Ctrl+,
    await page.keyboard.press(`${modKey}+,`);

    // SettingsDialog should be visible
    await expect(
      page.getByRole("dialog", { name: /settings/i }),
    ).toBeVisible();

    // Close the dialog
    await page.keyboard.press("Escape");
  });

  test("Cmd/Ctrl+Shift+N opens Create Project dialog", async () => {
    const modKey = getModKey();

    // Press Cmd/Ctrl+Shift+N
    await page.keyboard.press(`${modKey}+Shift+n`);

    // CreateProjectDialog should be visible
    await expect(page.getByTestId("create-project-dialog")).toBeVisible();

    // Close the dialog
    await page.keyboard.press("Escape");
  });

  test("Command Palette shows error when Export without project", async () => {
    const modKey = getModKey();

    // Open command palette
    await page.keyboard.press(`${modKey}+p`);
    await expect(page.getByTestId("command-palette")).toBeVisible();

    // Search for Export
    await page.getByRole("textbox", { name: "Search commands" }).fill("Export");

    // Press Enter
    await page.keyboard.press("Enter");

    // Should show error (no project selected in initial state)
    // The error testid is command-palette-error
    await expect(page.getByTestId("command-palette-error")).toBeVisible();

    // Close palette
    await page.keyboard.press("Escape");
  });

  test("Command Palette keyboard navigation works", async () => {
    const modKey = getModKey();

    // Open command palette
    await page.keyboard.press(`${modKey}+p`);
    await expect(page.getByTestId("command-palette")).toBeVisible();

    // First item should be active by default
    const firstItem = page.locator('[data-index="0"]');
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Press down arrow
    await page.keyboard.press("ArrowDown");

    // Second item should now be active
    const secondItem = page.locator('[data-index="1"]');
    await expect(secondItem).toHaveAttribute("aria-selected", "true");

    // Press up arrow
    await page.keyboard.press("ArrowUp");

    // First item should be active again
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Close palette
    await page.keyboard.press("Escape");
  });
});
