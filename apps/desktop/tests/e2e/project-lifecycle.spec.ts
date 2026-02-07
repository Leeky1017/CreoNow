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

test("project lifecycle: create + ensure .creonow + restart restores current", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const appRoot = path.resolve(__dirname, "../..");

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

  await page.waitForFunction(async () => {
    if (!window.creonow) {
      return false;
    }
    const res = await window.creonow.invoke("project:project:getcurrent", {});
    return res.ok === true;
  });

  const current = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:getcurrent", {});
  });
  expect(current.ok).toBe(true);
  if (!current.ok) {
    throw new Error(`Expected ok current project, got: ${current.error.code}`);
  }

  const creonowDir = path.join(current.data.rootPath, ".creonow");
  const creonowStat = await fs.stat(creonowDir);
  expect(creonowStat.isDirectory()).toBe(true);

  const projectId = current.data.projectId;

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
    throw new Error(`Expected ok .creonow status, got: ${status.error.code}`);
  }
  expect(status.data.exists).toBe(true);
  expect(status.data.watching).toBe(false);
  expect(status.data.rootPath).toBe(current.data.rootPath);

  const list = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: false,
    });
  });
  expect(list.ok).toBe(true);
  if (!list.ok) {
    throw new Error(
      `Expected ok project:project:list, got: ${list.error.code}`,
    );
  }
  expect(list.data.items.length).toBe(1);
  expect(list.data.items[0]?.projectId).toBe(projectId);

  await page.waitForTimeout(15);
  const created2 = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:create", {
      name: "Second",
    });
  });
  expect(created2.ok).toBe(true);
  if (!created2.ok) {
    throw new Error(
      `Expected ok project:project:create, got: ${created2.error.code}`,
    );
  }

  const list2 = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:list", {
      includeArchived: false,
    });
  });
  expect(list2.ok).toBe(true);
  if (!list2.ok) {
    throw new Error(
      `Expected ok project:project:list, got: ${list2.error.code}`,
    );
  }
  expect(list2.data.items.length).toBe(2);
  for (let i = 0; i < list2.data.items.length - 1; i++) {
    const a = list2.data.items[i];
    const b = list2.data.items[i + 1];
    if (!a || !b) {
      throw new Error("Unexpected empty list item");
    }
    expect(a.updatedAt).toBeGreaterThanOrEqual(b.updatedAt);
    if (a.updatedAt === b.updatedAt) {
      expect(a.projectId.localeCompare(b.projectId)).toBeLessThanOrEqual(0);
    }
  }

  await electronApp.close();

  const electronApp2 = await launch();
  const page2 = await electronApp2.firstWindow();
  await page2.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page2.getByTestId("app-shell")).toBeVisible();

  const current2 = await page2.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:getcurrent", {});
  });
  expect(current2.ok).toBe(true);
  if (!current2.ok) {
    throw new Error(`Expected ok current project, got: ${current2.error.code}`);
  }
  expect(current2.data.projectId).toBe(projectId);

  const deleted = await page2.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:delete", {
      projectId: projectIdParam,
    });
  }, projectId);
  expect(deleted.ok).toBe(true);
  if (!deleted.ok) {
    throw new Error(
      `Expected ok project:project:delete, got: ${deleted.error.code}`,
    );
  }

  const currentAfterDelete = await page2.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:getcurrent", {});
  });
  expect(currentAfterDelete.ok).toBe(false);
  if (currentAfterDelete.ok) {
    throw new Error("Expected NOT_FOUND current project after delete");
  }
  expect(currentAfterDelete.error.code).toBe("NOT_FOUND");

  const setDeleted = await page2.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("project:project:setcurrent", {
      projectId: projectIdParam,
    });
  }, projectId);
  expect(setDeleted.ok).toBe(false);
  if (setDeleted.ok) {
    throw new Error("Expected NOT_FOUND setCurrent on deleted project");
  }
  expect(setDeleted.error.code).toBe("NOT_FOUND");

  await electronApp2.close();
});
