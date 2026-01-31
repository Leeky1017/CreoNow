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

test("editor autosave: typing persists across restart (actor=auto)", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const appRoot = path.resolve(__dirname, "../..");
  const modKey = process.platform === "darwin" ? "Meta" : "Control";

  async function launch() {
    return await electron.launch({
      args: [appRoot],
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_OPEN_DEVTOOLS: "0",
        CREONOW_USER_DATA_DIR: userDataDir,
      },
    });
  }

  const electronApp = await launch();
  const page = await electronApp.firstWindow();
  await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await expect(page.getByTestId("welcome-screen")).toBeVisible();
  await page.getByTestId("welcome-create-project").click();
  await expect(page.getByTestId("create-project-dialog")).toBeVisible();
  await page.getByTestId("create-project-name").fill("Demo Project");
  await page.getByTestId("create-project-submit").click();

  await expect(page.getByTestId("tiptap-editor")).toBeVisible();

  await page.getByTestId("tiptap-editor").click();
  await page.keyboard.type("Hello autosave");

  await expect(page.getByTestId("editor-autosave-status")).toHaveAttribute(
    "data-status",
    "saved",
  );

  const project = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:getCurrent", {});
  });
  expect(project.ok).toBe(true);
  if (!project.ok) {
    throw new Error(`Expected ok current project, got: ${project.error.code}`);
  }

  const docs = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("file:document:list", {
      projectId: projectIdParam,
    });
  }, project.data.projectId);
  expect(docs.ok).toBe(true);
  if (!docs.ok) {
    throw new Error(`Expected ok document list, got: ${docs.error.code}`);
  }
  expect(docs.data.items.length).toBeGreaterThanOrEqual(1);
  const documentId = docs.data.items[0]?.documentId;
  if (!documentId) {
    throw new Error("Missing documentId");
  }

  const docAfterFirstSave = await page.evaluate(
    async ({ projectIdParam, documentIdParam }) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("file:document:read", {
        projectId: projectIdParam,
        documentId: documentIdParam,
      });
    },
    { projectIdParam: project.data.projectId, documentIdParam: documentId },
  );
  expect(docAfterFirstSave.ok).toBe(true);
  if (!docAfterFirstSave.ok) {
    throw new Error(
      `Expected ok document read, got: ${docAfterFirstSave.error.code}`,
    );
  }
  const hashV1 = docAfterFirstSave.data.contentHash;

  await page.keyboard.press(`${modKey}+S`);

  await page.keyboard.type(" changed");
  await expect(page.getByTestId("editor-autosave-status")).toHaveAttribute(
    "data-status",
    "saved",
  );

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
  expect(versions.data.items.some((v) => v.actor === "auto")).toBe(true);
  expect(versions.data.items.some((v) => v.actor === "user")).toBe(true);

  const restoreTarget = versions.data.items.find(
    (v) => v.contentHash === hashV1,
  );
  if (!restoreTarget) {
    throw new Error("Missing restore target version");
  }

  const restored = await page.evaluate(
    async ({ documentIdParam, versionIdParam }) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("version:restore", {
        documentId: documentIdParam,
        versionId: versionIdParam,
      });
    },
    { documentIdParam: documentId, versionIdParam: restoreTarget.versionId },
  );
  expect(restored.ok).toBe(true);
  if (!restored.ok) {
    throw new Error(`Expected ok restore, got: ${restored.error.code}`);
  }

  await electronApp.close();

  const electronApp2 = await launch();
  const page2 = await electronApp2.firstWindow();
  await page2.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page2.getByTestId("app-shell")).toBeVisible();
  await expect(page2.getByTestId("tiptap-editor")).toBeVisible();
  await expect(page2.getByTestId("tiptap-editor")).toContainText(
    "Hello autosave",
  );
  await expect(page2.getByTestId("tiptap-editor")).not.toContainText("changed");

  await electronApp2.close();
});
