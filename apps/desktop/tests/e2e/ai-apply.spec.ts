import { _electron as electron, expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOD_KEY = process.platform === "darwin" ? "Meta" : "Control";

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

async function launchApp(userDataDir: string) {
  const appRoot = getAppRoot();
  const electronApp = await electron.launch({
    args: [appRoot],
    env: {
      ...process.env,
      CREONOW_E2E: "1",
      CREONOW_OPEN_DEVTOOLS: "0",
      CREONOW_USER_DATA_DIR: userDataDir,
      CREONOW_AI_PROVIDER: "anthropic",
    },
  });

  const page = await electronApp.firstWindow();
  await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  return { electronApp, page, appRoot };
}

async function createProjectAndFocusEditor(args: {
  page: Page;
}): Promise<void> {
  const page = args.page;
  await expect(page.getByTestId("welcome-screen")).toBeVisible();
  await page.getByTestId("welcome-create-project").click();
  await expect(page.getByTestId("create-project-dialog")).toBeVisible();
  await page.getByTestId("create-project-name").fill("Demo Project");
  await page.getByTestId("create-project-submit").click();
  await expect(page.getByTestId("tiptap-editor")).toBeVisible();
  await page.getByTestId("tiptap-editor").click();
}

async function selectLastWord(args: { page: Page }) {
  const page = args.page;
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Shift+ArrowLeft");
  }
}

test("ai apply: success path writes actor=ai version + main.log evidence", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp(userDataDir);

  await createProjectAndFocusEditor({ page });
  await page.keyboard.type("Hello world");
  await selectLastWord({ page });

  await page.getByTestId("ai-input").fill("replace-world");
  await page.getByTestId("ai-run").click();

  await expect(page.getByTestId("ai-diff")).toBeVisible();
  await expect(page.getByTestId("ai-diff")).toContainText("-world");
  await expect(page.getByTestId("ai-diff")).toContainText("E2E_RESULT");

  await page.getByTestId("ai-apply").click();
  await expect(page.getByTestId("ai-apply-status")).toBeVisible();
  await expect(page.getByTestId("tiptap-editor")).toContainText(
    "E2E_RESULT: replace-world",
  );

  const documentId =
    (await page.getByTestId("editor-pane").getAttribute("data-document-id")) ??
    "";
  expect(documentId.length).toBeGreaterThan(0);

  const versions = await page.evaluate(async (documentIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("version:list", {
      documentId: documentIdParam,
    });
  }, documentId);
  expect(versions.ok).toBe(true);
  if (!versions.ok) {
    throw new Error(`Expected ok version list, got: ${versions.error.code}`);
  }

  const aiVersion = versions.data.items.find((v) => v.actor === "ai");
  expect(aiVersion).toBeTruthy();
  expect(aiVersion?.reason.startsWith("ai-apply:")).toBe(true);
  expect(aiVersion?.reason.slice("ai-apply:".length).length).toBeGreaterThan(0);

  await electronApp.close();

  const logPath = path.join(userDataDir, "logs", "main.log");
  const log = await fs.readFile(logPath, "utf8");
  expect(log).toContain("ai_apply_started");
  expect(log).toContain("ai_apply_succeeded");
});

test("ai apply: conflict path blocks overwrite + logs ai_apply_conflict", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp(userDataDir);

  await createProjectAndFocusEditor({ page });
  await page.keyboard.type("Hello world");
  await selectLastWord({ page });

  await page.getByTestId("ai-input").fill("conflict-case");
  await page.getByTestId("ai-run").click();
  await expect(page.getByTestId("ai-diff")).toBeVisible();

  await page.getByTestId("tiptap-editor").click();
  await page.keyboard.press(`${MOD_KEY}+A`);
  await page.keyboard.type("Hello planet");

  await page.getByTestId("ai-apply").click();
  await expect(page.getByTestId("ai-error-code")).toContainText("CONFLICT");
  await expect(page.getByTestId("tiptap-editor")).toContainText("Hello planet");
  await expect(page.getByTestId("tiptap-editor")).not.toContainText(
    "E2E_RESULT: conflict-case",
  );

  const documentId =
    (await page.getByTestId("editor-pane").getAttribute("data-document-id")) ??
    "";
  expect(documentId.length).toBeGreaterThan(0);

  const versions = await page.evaluate(async (documentIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("version:list", {
      documentId: documentIdParam,
    });
  }, documentId);
  expect(versions.ok).toBe(true);
  if (!versions.ok) {
    throw new Error(`Expected ok version list, got: ${versions.error.code}`);
  }
  expect(versions.data.items.some((v) => v.actor === "ai")).toBe(false);

  await electronApp.close();

  const logPath = path.join(userDataDir, "logs", "main.log");
  const log = await fs.readFile(logPath, "utf8");
  expect(log).toContain("ai_apply_conflict");
});
