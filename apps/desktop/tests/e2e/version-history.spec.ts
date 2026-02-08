import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createProjectViaWelcomeAndWaitForEditor,
  waitForProjectIpcReady,
} from "./_helpers/projectReadiness";

/**
 * Create a unique E2E userData directory.
 */
async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E VersionHistory ");
  const dir = await fs.mkdtemp(base);
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

test.describe("Version History IPC", () => {
  test("version:snapshot:read returns full version content", async () => {
    const userDataDir = await createIsolatedUserDataDir();
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const appRoot = path.resolve(__dirname, "../..");
    const modKey = process.platform === "darwin" ? "Meta" : "Control";

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

    await createProjectViaWelcomeAndWaitForEditor({
      page,
      projectName: "Version Test Project",
    });

    // Type initial content
    await page.getByTestId("tiptap-editor").click();
    await page.keyboard.type("Initial content for version test");

    // Wait for autosave
    await expect(page.getByTestId("editor-autosave-status")).toHaveAttribute(
      "data-status",
      "saved",
    );

    // Manual save to create a user version
    await page.keyboard.press(`${modKey}+S`);

    // Get project and document IDs
    const project = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:project:getcurrent", {});
    });
    expect(project.ok).toBe(true);
    if (!project.ok) {
      throw new Error(`Expected ok project, got: ${project.error.code}`);
    }

    const docs = await page.evaluate(async (projectId) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("file:document:list", { projectId });
    }, project.data.projectId);
    expect(docs.ok).toBe(true);
    if (!docs.ok) {
      throw new Error(`Expected ok document list, got: ${docs.error.code}`);
    }
    const documentId = docs.data.items[0]?.documentId;
    expect(documentId).toBeTruthy();

    // Get version list
    const versions = await page.evaluate(async (docId) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("version:snapshot:list", {
        documentId: docId,
      });
    }, documentId);
    expect(versions.ok).toBe(true);
    if (!versions.ok) {
      throw new Error(`Expected ok version list, got: ${versions.error.code}`);
    }
    expect(versions.data.items.length).toBeGreaterThanOrEqual(1);

    const versionId = versions.data.items[0]?.versionId;
    expect(versionId).toBeTruthy();

    // Test version:snapshot:read
    const versionContent = await page.evaluate(
      async ({ docId, verId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("version:snapshot:read", {
          documentId: docId,
          versionId: verId,
        });
      },
      { docId: documentId, verId: versionId },
    );

    expect(versionContent.ok).toBe(true);
    if (!versionContent.ok) {
      throw new Error(
        `Expected ok version read, got: ${versionContent.error.code}`,
      );
    }

    // Verify version:snapshot:read returns all expected fields
    expect(versionContent.data.documentId).toBe(documentId);
    expect(versionContent.data.versionId).toBe(versionId);
    expect(versionContent.data.projectId).toBe(project.data.projectId);
    expect(versionContent.data.contentJson).toBeTruthy();
    expect(versionContent.data.contentText).toContain(
      "Initial content for version test",
    );
    expect(versionContent.data.contentMd).toBeTruthy();
    expect(versionContent.data.contentHash).toBeTruthy();
    expect(versionContent.data.actor).toMatch(/^(user|auto|ai)$/);
    expect(versionContent.data.reason).toBeTruthy();
    expect(typeof versionContent.data.createdAt).toBe("number");

    await electronApp.close();
  });

  test("version:snapshot:read returns NOT_FOUND for invalid versionId", async () => {
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

    await createProjectViaWelcomeAndWaitForEditor({
      page,
      projectName: "Version Error Test",
    });

    // Get document ID
    const project = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:project:getcurrent", {});
    });
    expect(project.ok).toBe(true);
    if (!project.ok) {
      throw new Error(`Expected ok project, got: ${project.error.code}`);
    }

    const docs = await page.evaluate(async (projectId) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("file:document:list", { projectId });
    }, project.data.projectId);
    expect(docs.ok).toBe(true);
    if (!docs.ok) {
      throw new Error(`Expected ok document list, got: ${docs.error.code}`);
    }
    const documentId = docs.data.items[0]?.documentId;
    expect(documentId).toBeTruthy();

    // Try to read non-existent version
    const result = await page.evaluate(
      async ({ docId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("version:snapshot:read", {
          documentId: docId,
          versionId: "non-existent-version-id",
        });
      },
      { docId: documentId },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected error for non-existent version");
    }
    expect(result.error.code).toBe("NOT_FOUND");

    await electronApp.close();
  });

  test("version:snapshot:read returns INVALID_ARGUMENT for empty documentId", async () => {
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
    await waitForProjectIpcReady({ page });

    // Try to read with empty documentId
    const result = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("version:snapshot:read", {
        documentId: "",
        versionId: "some-version",
      });
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected error for empty documentId");
    }
    expect(result.error.code).toBe("INVALID_ARGUMENT");

    await electronApp.close();
  });
});
