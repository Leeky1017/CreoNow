import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

test("export: markdown writes deterministic file under userData exports", async () => {
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

  await page.getByTestId("welcome-create-project").click();
  await page.getByTestId("create-project-name").fill("Export Project");
  await page.getByTestId("create-project-submit").click();

  const current = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    const project = await window.creonow.invoke(
      "project:project:getcurrent",
      {},
    );
    if (!project.ok) {
      throw new Error(project.error.message);
    }
    const doc = await window.creonow.invoke("file:document:getcurrent", {
      projectId: project.data.projectId,
    });
    if (!doc.ok) {
      throw new Error(doc.error.message);
    }
    return {
      projectId: project.data.projectId,
      documentId: doc.data.documentId,
    };
  });

  await page.getByTestId("tiptap-editor").click();
  await page.keyboard.type("Export me");
  await expect(page.getByTestId("editor-autosave-status")).toHaveAttribute(
    "data-status",
    "saved",
  );

  // Open Command Palette and trigger Export… command
  await page.keyboard.press("Control+P");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-item-export").click();

  // ExportDialog should open with markdown selected by default
  await expect(page.getByTestId("export-dialog")).toBeVisible();
  await expect(page.getByTestId("export-format-markdown")).toHaveAttribute(
    "data-state",
    "checked",
  );

  // Click Export button to start export
  await page.getByTestId("export-submit").click();

  // Wait for success view
  await expect(page.getByTestId("export-success")).toBeVisible({
    timeout: 10000,
  });

  // Verify result fields are displayed
  await expect(page.getByTestId("export-success-relative-path")).toBeVisible();
  await expect(page.getByTestId("export-success-bytes-written")).toBeVisible();

  // Verify file was actually written
  const expectedRelPath = path.join(
    "exports",
    current.projectId,
    `${current.documentId}.md`,
  );
  const expectedAbsPath = path.join(userDataDir, expectedRelPath);

  await expect.poll(async () => await fileExists(expectedAbsPath)).toBe(true);

  const exported = await fs.readFile(expectedAbsPath, "utf8");
  expect(exported).toContain("Export me");

  // Close dialog and app
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("export-dialog")).not.toBeVisible();

  await electronApp.close();
});
