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

/**
 * Create a unique E2E userData directory.
 *
 * Why: Windows E2E must be repeatable and must not touch a developer profile.
 */
async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E 世界 ");
  const dir = await fs.mkdtemp(base);
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

/**
 * Resolve app root for Playwright Electron launch.
 *
 * Why: tests run from compiled JS paths and must be location-independent.
 */
function getAppRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, "../..");
}

/**
 * Launch Electron app in E2E mode with isolated userDataDir.
 *
 * Why: each test needs deterministic env and filesystem isolation.
 */
async function launchApp(args: {
  userDataDir: string;
  env?: Record<string, string>;
}) {
  const appRoot = getAppRoot();
  const electronApp = await electron.launch({
    args: [appRoot],
    env: {
      ...process.env,
      CREONOW_E2E: "1",
      CREONOW_OPEN_DEVTOOLS: "0",
      CREONOW_USER_DATA_DIR: args.userDataDir,
      CREONOW_AI_PROVIDER: "anthropic",
      ...(args.env ?? {}),
    },
  });

  const page = await electronApp.firstWindow();
  await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("ai-panel")).toBeVisible();
  return { electronApp, page, appRoot };
}

/**
 * Ensure the Stream toggle is in the expected state.
 */
async function setStreamEnabled(page: Page, enabled: boolean): Promise<void> {
  const box = page.getByTestId("ai-stream-toggle");
  const checked = await box.isChecked();
  if (checked !== enabled) {
    await box.click();
  }
}

/**
 * Fill the AI input and click Run.
 */
async function runInput(page: Page, input: string): Promise<void> {
  await page.getByTestId("ai-input").fill(input);
  await page.getByTestId("ai-send-stop").click();
}

test("ai runtime: success (stream) + main.log evidence", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await setStreamEnabled(page, true);
  await runInput(page, "hello");

  await expect(page.getByTestId("ai-output")).toContainText("E2E_RESULT");

  await electronApp.close();

  const logPath = path.join(userDataDir, "logs", "main.log");
  const log = await fs.readFile(logPath, "utf8");
  expect(log).toContain("ai_run_started");
});

test("ai runtime: delay path keeps UI running then completes", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await setStreamEnabled(page, true);
  await runInput(page, "E2E_DELAY hello");

  await expect(page.getByTestId("ai-status")).toContainText("running");
  await expect(page.getByTestId("ai-output")).toContainText("E2E_RESULT");

  await electronApp.close();
});

test("ai runtime: timeout maps to TIMEOUT (non-stream)", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({
    userDataDir,
    env: { CREONOW_AI_TIMEOUT_MS: "200" },
  });

  await setStreamEnabled(page, false);
  await runInput(page, "E2E_TIMEOUT");

  await expect(page.getByTestId("ai-error-code")).toContainText("TIMEOUT");
  await expect(page.getByTestId("ai-status")).toContainText("timeout");

  await electronApp.close();
});

test("ai runtime: upstream error maps to UPSTREAM_ERROR (non-stream)", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await setStreamEnabled(page, false);
  await runInput(page, "E2E_UPSTREAM_ERROR");

  await expect(page.getByTestId("ai-error-code")).toContainText(
    "UPSTREAM_ERROR",
  );
  await expect(page.getByTestId("ai-status")).toContainText("error");

  await electronApp.close();
});

test("ai runtime: cancel stops output growth (stream)", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await setStreamEnabled(page, true);
  await runInput(page, `cancel ${"x".repeat(600)}`);

  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="ai-output"]');
    return (el?.textContent?.length ?? 0) > 0;
  });

  await page.getByTestId("ai-send-stop").click();
  await expect(page.getByTestId("ai-status")).toContainText("canceled");

  const before = await page.getByTestId("ai-output").textContent();
  await page.waitForTimeout(300);
  const after = await page.getByTestId("ai-output").textContent();
  expect(after).toBe(before);

  await electronApp.close();

  const logPath = path.join(userDataDir, "logs", "main.log");
  const log = await fs.readFile(logPath, "utf8");
  expect(log).toContain("ai_run_canceled");
});
