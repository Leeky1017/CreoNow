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

test.describe("Dashboard project actions", () => {
  test("project:rename - rename project and verify list update", async () => {
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

    // Create a project first
    const created = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      const res = await window.creonow.invoke("project:create", {
        name: "Original Name",
      });
      if (!res.ok) {
        throw new Error(`Failed to create: ${res.error.code}`);
      }
      return res.data;
    });

    expect(created.projectId).toBeTruthy();

    // Rename via IPC
    const renamed = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("project:rename", {
          projectId,
          name: "Renamed Project",
        });
      },
      { projectId: created.projectId },
    );

    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      throw new Error(`Expected ok project:rename, got: ${renamed.error.code}`);
    }
    expect(renamed.data.name).toBe("Renamed Project");
    expect(renamed.data.projectId).toBe(created.projectId);

    // Verify in list
    const list = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:list", {});
    });

    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error(`Expected ok project:list, got: ${list.error.code}`);
    }

    const found = list.data.items.find(
      (p) => p.projectId === created.projectId,
    );
    expect(found).toBeTruthy();
    expect(found?.name).toBe("Renamed Project");

    await electronApp.close();
  });

  test("project:rename - validation errors", async () => {
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

    // Create a project first
    const created = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      const res = await window.creonow.invoke("project:create", {
        name: "Test",
      });
      if (!res.ok) {
        throw new Error(`Failed to create: ${res.error.code}`);
      }
      return res.data;
    });

    // Try rename with empty name
    const emptyNameRes = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("project:rename", {
          projectId,
          name: "   ",
        });
      },
      { projectId: created.projectId },
    );

    expect(emptyNameRes.ok).toBe(false);
    if (emptyNameRes.ok) {
      throw new Error("Expected INVALID_ARGUMENT for empty name");
    }
    expect(emptyNameRes.error.code).toBe("INVALID_ARGUMENT");

    // Try rename non-existent project
    const notFoundRes = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:rename", {
        projectId: "non-existent-id",
        name: "New Name",
      });
    });

    expect(notFoundRes.ok).toBe(false);
    if (notFoundRes.ok) {
      throw new Error("Expected NOT_FOUND for non-existent project");
    }
    expect(notFoundRes.error.code).toBe("NOT_FOUND");

    await electronApp.close();
  });

  test("project:duplicate - duplicate project with documents", async () => {
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

    // Create a project
    const created = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      const res = await window.creonow.invoke("project:create", {
        name: "Source Project",
      });
      if (!res.ok) {
        throw new Error(`Failed to create: ${res.error.code}`);
      }
      return res.data;
    });

    // Create a document in the project
    await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        const docRes = await window.creonow.invoke("file:document:create", {
          projectId,
          title: "Test Document",
        });
        if (!docRes.ok) {
          throw new Error(`Failed to create doc: ${docRes.error.code}`);
        }
        return docRes.data;
      },
      { projectId: created.projectId },
    );

    // Duplicate the project
    const duplicated = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("project:duplicate", { projectId });
      },
      { projectId: created.projectId },
    );

    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) {
      throw new Error(
        `Expected ok project:duplicate, got: ${duplicated.error.code}`,
      );
    }
    expect(duplicated.data.projectId).not.toBe(created.projectId);

    // Verify in list - should have both projects
    const list = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:list", {});
    });

    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error(`Expected ok project:list, got: ${list.error.code}`);
    }
    expect(list.data.items.length).toBe(2);

    // Verify duplicated project has default name "(copy)"
    const dupProject = list.data.items.find(
      (p) => p.projectId === duplicated.data.projectId,
    );
    expect(dupProject).toBeTruthy();
    expect(dupProject?.name).toBe("Source Project (copy)");

    // Verify document was copied
    const docs = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("file:document:list", { projectId });
      },
      { projectId: duplicated.data.projectId },
    );

    expect(docs.ok).toBe(true);
    if (!docs.ok) {
      throw new Error(`Expected ok file:document:list, got: ${docs.error.code}`);
    }
    expect(docs.data.items.length).toBe(1);
    expect(docs.data.items[0]?.title).toBe("Test Document");

    await electronApp.close();
  });

  test("project:archive - archive and hide from list", async () => {
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

    // Create a project
    const created = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      const res = await window.creonow.invoke("project:create", {
        name: "Project to Archive",
      });
      if (!res.ok) {
        throw new Error(`Failed to create: ${res.error.code}`);
      }
      return res.data;
    });

    // Archive the project
    const archived = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("project:archive", {
          projectId,
          archived: true,
        });
      },
      { projectId: created.projectId },
    );

    expect(archived.ok).toBe(true);
    if (!archived.ok) {
      throw new Error(
        `Expected ok project:archive, got: ${archived.error.code}`,
      );
    }
    expect(archived.data.archived).toBe(true);

    // Verify hidden from default list
    const listDefault = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:list", {});
    });

    expect(listDefault.ok).toBe(true);
    if (!listDefault.ok) {
      throw new Error(
        `Expected ok project:list, got: ${listDefault.error.code}`,
      );
    }
    expect(listDefault.data.items.length).toBe(0);

    // Verify visible with includeArchived
    const listWithArchived = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:list", {
        includeArchived: true,
      });
    });

    expect(listWithArchived.ok).toBe(true);
    if (!listWithArchived.ok) {
      throw new Error(
        `Expected ok project:list, got: ${listWithArchived.error.code}`,
      );
    }
    expect(listWithArchived.data.items.length).toBe(1);
    expect(listWithArchived.data.items[0]?.archivedAt).toBeTruthy();

    // Unarchive the project
    const unarchived = await page.evaluate(
      async ({ projectId }) => {
        if (!window.creonow) {
          throw new Error("Missing window.creonow bridge");
        }
        return await window.creonow.invoke("project:archive", {
          projectId,
          archived: false,
        });
      },
      { projectId: created.projectId },
    );

    expect(unarchived.ok).toBe(true);
    if (!unarchived.ok) {
      throw new Error(
        `Expected ok project:archive, got: ${unarchived.error.code}`,
      );
    }
    expect(unarchived.data.archived).toBe(false);

    // Verify back in default list
    const listAfterUnarchive = await page.evaluate(async () => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("project:list", {});
    });

    expect(listAfterUnarchive.ok).toBe(true);
    if (!listAfterUnarchive.ok) {
      throw new Error(
        `Expected ok project:list, got: ${listAfterUnarchive.error.code}`,
      );
    }
    expect(listAfterUnarchive.data.items.length).toBe(1);

    await electronApp.close();
  });
});
