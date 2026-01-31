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
 * Fill the AI input and click Run.
 */
async function runInput(page: Page, input: string): Promise<void> {
  await page.getByTestId("ai-input").fill(input);
  await page.getByTestId("ai-run").click();
}

test("context viewer: 4 layers + trim + redaction + main.log evidence", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await expect(page.getByTestId("welcome-screen")).toBeVisible();
  await page.getByTestId("welcome-create-project").click();
  await expect(page.getByTestId("create-project-dialog")).toBeVisible();
  await page.getByTestId("create-project-name").fill("Demo Project");
  await page.getByTestId("create-project-submit").click();

  await page.waitForFunction(async () => {
    if (!window.creonow) {
      return false;
    }
    const res = await window.creonow.invoke("project:getCurrent", {});
    return res.ok === true;
  });

  const current = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:getCurrent", {});
  });
  expect(current.ok).toBe(true);
  if (!current.ok) {
    throw new Error(`Expected ok current project, got: ${current.error.code}`);
  }

  const projectId = current.data.projectId;
  const rootPath = current.data.rootPath;

  const ensured = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("context:creonow:ensure", {
      projectId: projectIdParam,
    });
  }, projectId);
  expect(ensured.ok).toBe(true);
  if (!ensured.ok) {
    throw new Error(`Expected ok ensure, got: ${ensured.error.code}`);
  }

  const started = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("context:creonow:watch:start", {
      projectId: projectIdParam,
    });
  }, projectId);
  expect(started.ok).toBe(true);
  if (!started.ok) {
    throw new Error(`Expected ok watch:start, got: ${started.error.code}`);
  }
  expect(started.data.watching).toBe(true);

  const status = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("context:creonow:status", {
      projectId: projectIdParam,
    });
  }, projectId);
  expect(status.ok).toBe(true);
  if (!status.ok) {
    throw new Error(`Expected ok status, got: ${status.error.code}`);
  }
  expect(status.data.watching).toBe(true);

  const rulesPath = path.join(rootPath, ".creonow", "rules", "style.md");
  await fs.writeFile(
    rulesPath,
    "# Style\n\napiKey=sk-THIS_SHOULD_BE_REDACTED\n",
    "utf8",
  );

  const settingsPath = path.join(rootPath, ".creonow", "settings", "世界观.md");
  await fs.writeFile(settingsPath, "x".repeat(25_000), "utf8");

  await runInput(page, "hello");
  await expect(page.getByTestId("ai-output")).toContainText("E2E_RESULT");
  await expect(page.getByTestId("ai-output")).not.toContainText(
    "sk-THIS_SHOULD_BE_REDACTED",
  );
  await expect(page.getByTestId("ai-output")).toContainText("***REDACTED***");

  await page.getByTestId("ai-context-toggle").click();
  await expect(page.getByTestId("ai-context-panel")).toBeVisible();

  await expect(page.getByTestId("ai-context-layer-rules")).toBeVisible();
  await expect(page.getByTestId("ai-context-layer-settings")).toBeVisible();
  await expect(page.getByTestId("ai-context-layer-retrieved")).toBeVisible();
  await expect(page.getByTestId("ai-context-layer-immediate")).toBeVisible();

  await expect(page.getByTestId("ai-context-trim")).toBeVisible();

  await expect(page.getByTestId("ai-context-panel")).toContainText(
    "***REDACTED***",
  );
  await expect(page.getByTestId("ai-context-panel")).not.toContainText(
    "sk-THIS_SHOULD_BE_REDACTED",
  );
  await expect(page.getByTestId("ai-context-panel")).toContainText(".creonow/");
  await expect(page.getByTestId("ai-context-panel")).not.toContainText(
    rootPath,
  );

  await electronApp.close();

  const logPath = path.join(userDataDir, "logs", "main.log");
  const log = await fs.readFile(logPath, "utf8");
  expect(log).toContain("context_watch_started");
  expect(log).toContain("context_redaction_applied");
});
