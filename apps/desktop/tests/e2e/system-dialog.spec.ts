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

/**
 * Parse the documentId from a `file-row-<documentId>` test id.
 *
 * Why: E2E must be resilient to UUID-based document ids.
 */
function parseDocumentId(testId: string): string {
  const prefix = "file-row-";
  if (!testId.startsWith(prefix)) {
    throw new Error(`Unexpected file row test id: ${testId}`);
  }
  const id = testId.slice(prefix.length);
  if (id.length === 0) {
    throw new Error("Missing document id");
  }
  return id;
}

test("system dialog: cancel/confirm across file tree + knowledge graph", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const appRoot = path.resolve(__dirname, "../..");

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

  // Create a project via UI
  await expect(page.getByTestId("welcome-screen")).toBeVisible();
  await page.getByTestId("welcome-create-project").click();
  await expect(page.getByTestId("create-project-dialog")).toBeVisible();
  await page.getByTestId("create-project-name").fill("Demo Project");
  await page.getByTestId("create-project-submit").click();

  await expect(page.getByTestId("tiptap-editor")).toBeVisible();
  await expect(page.getByTestId("sidebar-files")).toBeVisible();

  // ---------------------------------------------------------------------------
  // FileTreePanel: Cancel keeps document, Confirm deletes document
  // ---------------------------------------------------------------------------
  const firstRow = page.locator('[data-testid^="file-row-"]').first();
  await expect(firstRow).toBeVisible();
  const firstRowIdAttr = await firstRow.getAttribute("data-testid");
  if (!firstRowIdAttr) {
    throw new Error("Missing data-testid on file row");
  }
  const docAId = parseDocumentId(firstRowIdAttr);

  await page.getByTestId("file-create").click();

  const rowsAfterCreate = page.locator('[data-testid^="file-row-"]');
  await expect(rowsAfterCreate).toHaveCount(2);
  const row0Attr = await rowsAfterCreate.nth(0).getAttribute("data-testid");
  const row1Attr = await rowsAfterCreate.nth(1).getAttribute("data-testid");
  if (!row0Attr || !row1Attr) {
    throw new Error("Missing data-testid on file rows after create");
  }
  const id0 = parseDocumentId(row0Attr);
  const id1 = parseDocumentId(row1Attr);
  const docToDeleteId = id0 === docAId ? id1 : id0;

  await page.getByTestId(`file-row-${docToDeleteId}`).hover();
  await page.getByTestId(`file-actions-${docToDeleteId}`).click();
  await page.getByTestId(`file-delete-${docToDeleteId}`).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Delete Document?")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId(`file-row-${docToDeleteId}`)).toBeVisible();

  await page.getByTestId(`file-row-${docToDeleteId}`).hover();
  await page.getByTestId(`file-actions-${docToDeleteId}`).click();
  await page.getByTestId(`file-delete-${docToDeleteId}`).click();

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId(`file-row-${docToDeleteId}`)).toHaveCount(0);

  // ---------------------------------------------------------------------------
  // KnowledgeGraphPanel: Cancel keeps entity, Confirm deletes entity
  // ---------------------------------------------------------------------------
  await page.getByTestId("icon-bar-knowledge-graph").click();
  await expect(page.getByTestId("layout-sidebar")).toBeVisible();

  await page.getByTestId("kg-entity-name").fill("Test Entity");
  await page.getByTestId("kg-entity-create").click();

  const project = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:getCurrent", {});
  });
  expect(project.ok).toBe(true);
  if (!project.ok) {
    throw new Error(
      `Expected ok project:getCurrent, got: ${project.error.code}`,
    );
  }
  const projectId = project.data.projectId;

  const entityId = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    const res = await window.creonow.invoke("kg:entity:list", {
      projectId: projectIdParam,
    });
    if (!res.ok) {
      throw new Error(`Expected ok kg:entity:list, got: ${res.error.code}`);
    }
    const item = res.data.items.find((e) => e.name === "Test Entity") ?? null;
    if (!item) {
      throw new Error("Missing created entity in list");
    }
    return item.entityId;
  }, projectId);

  await expect(page.getByTestId(`kg-entity-row-${entityId}`)).toBeVisible();

  await page.getByTestId(`kg-entity-delete-${entityId}`).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Delete Entity?")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId(`kg-entity-row-${entityId}`)).toBeVisible();

  await page.getByTestId(`kg-entity-delete-${entityId}`).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId(`kg-entity-row-${entityId}`)).toHaveCount(0);

  await electronApp.close();
});
