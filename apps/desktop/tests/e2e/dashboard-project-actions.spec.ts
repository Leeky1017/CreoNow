import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create a unique E2E userData directory.
 *
 * Why: dashboard project action assertions must be isolated and deterministic.
 */
async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow Dashboard Actions ");
  const dir = await fs.mkdtemp(base);
  return path.join(dir, `profile-${randomUUID()}`);
}

test("dashboard project actions: rename/duplicate/archive/unarchive", async () => {
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

  const created = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:create", {
      name: "Alpha",
    });
  });
  expect(created.ok).toBe(true);
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }
  const sourceProjectId = created.data.projectId;

  const renamed = await page.evaluate(async (projectId) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:rename", {
      projectId,
      name: "Alpha Renamed",
    });
  }, sourceProjectId);
  expect(renamed.ok).toBe(true);
  if (!renamed.ok) {
    throw new Error(`rename failed: ${renamed.error.code}`);
  }

  const duplicated = await page.evaluate(async (projectId) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:duplicate", {
      projectId,
    });
  }, sourceProjectId);
  expect(duplicated.ok).toBe(true);
  if (!duplicated.ok) {
    throw new Error(`duplicate failed: ${duplicated.error.code}`);
  }

  const activeList = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: false,
    });
  });
  expect(activeList.ok).toBe(true);
  if (!activeList.ok) {
    throw new Error(
      `project:project:list active failed: ${activeList.error.code}`,
    );
  }
  expect(
    activeList.data.items.some((item) => item.name === "Alpha Renamed"),
  ).toBe(true);
  expect(
    activeList.data.items.some(
      (item) => item.projectId === duplicated.data.projectId,
    ),
  ).toBe(true);

  const archived = await page.evaluate(async (projectId) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:archive", {
      projectId,
      archived: true,
    });
  }, sourceProjectId);
  expect(archived.ok).toBe(true);
  if (!archived.ok) {
    throw new Error(`archive failed: ${archived.error.code}`);
  }
  expect(archived.data.archived).toBe(true);
  expect(typeof archived.data.archivedAt).toBe("number");

  const activeAfterArchive = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: false,
    });
  });
  expect(activeAfterArchive.ok).toBe(true);
  if (!activeAfterArchive.ok) {
    throw new Error(
      `project:project:list after archive failed: ${activeAfterArchive.error.code}`,
    );
  }
  expect(
    activeAfterArchive.data.items.some(
      (item) => item.projectId === sourceProjectId,
    ),
  ).toBe(false);

  const fullList = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: true,
    });
  });
  expect(fullList.ok).toBe(true);
  if (!fullList.ok) {
    throw new Error(`project:project:list full failed: ${fullList.error.code}`);
  }
  const archivedItem = fullList.data.items.find(
    (item) => item.projectId === sourceProjectId,
  );
  expect(archivedItem).toBeTruthy();
  expect(typeof archivedItem?.archivedAt).toBe("number");

  const unarchived = await page.evaluate(async (projectId) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:archive", {
      projectId,
      archived: false,
    });
  }, sourceProjectId);
  expect(unarchived.ok).toBe(true);
  if (!unarchived.ok) {
    throw new Error(`unarchive failed: ${unarchived.error.code}`);
  }
  expect(unarchived.data.archived).toBe(false);
  expect(unarchived.data.archivedAt ?? null).toBeNull();

  const activeAfterUnarchive = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: false,
    });
  });
  expect(activeAfterUnarchive.ok).toBe(true);
  if (!activeAfterUnarchive.ok) {
    throw new Error(
      `project:project:list after unarchive failed: ${activeAfterUnarchive.error.code}`,
    );
  }
  expect(
    activeAfterUnarchive.data.items.some(
      (item) => item.projectId === sourceProjectId,
    ),
  ).toBe(true);

  await electronApp.close();
});
