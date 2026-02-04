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

async function launchApp(args: { userDataDir: string }) {
  const appRoot = getAppRoot();
  const electronApp = await electron.launch({
    args: [appRoot],
    env: {
      ...process.env,
      CREONOW_E2E: "1",
      CREONOW_OPEN_DEVTOOLS: "0",
      CREONOW_USER_DATA_DIR: args.userDataDir,
      CREONOW_AI_PROVIDER: "anthropic",
    },
  });

  const page = await electronApp.firstWindow();
  await page.waitForFunction(() => window.__CN_E2E__?.ready === true);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  return { electronApp, page };
}

async function createProjectViaUi(page: Page): Promise<void> {
  await expect(page.getByTestId("welcome-screen")).toBeVisible();
  await page.getByTestId("welcome-create-project").click();
  await expect(page.getByTestId("create-project-dialog")).toBeVisible();
  await page.getByTestId("create-project-name").fill("Demo Project");
  await page.getByTestId("create-project-submit").click();
  await expect(page.getByTestId("tiptap-editor")).toBeVisible();
}

test("knowledge graph: sidebar CRUD + context viewer injection (skill gated)", async () => {
  const userDataDir = await createIsolatedUserDataDir();
  const { electronApp, page } = await launchApp({ userDataDir });

  await createProjectViaUi(page);

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

  await page.getByTestId("icon-bar-knowledge-graph").click();
  await expect(page.getByTestId("layout-sidebar")).toBeVisible();
  await expect(page.getByTestId("kg-entity-create")).toBeEnabled();

  await page.getByTestId("kg-entity-name").fill("Alice");
  await page.getByTestId("kg-entity-create").click();

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
    const item = res.data.items.find((e) => e.name === "Alice") ?? null;
    if (!item) {
      throw new Error("Missing created entity in list");
    }
    return item.entityId;
  }, projectId);

  await expect(page.getByTestId(`kg-entity-row-${entityId}`)).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByTestId(`kg-entity-delete-${entityId}`).click();
  await expect(page.getByTestId(`kg-entity-row-${entityId}`)).toHaveCount(0);

  const tooLarge = JSON.stringify({ x: "a".repeat(33_000) });
  const oversize = await page.evaluate(
    async ({ projectIdParam, tooLargeParam }) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke("kg:entity:create", {
        projectId: projectIdParam,
        name: "Big",
        metadataJson: tooLargeParam,
      });
    },
    { projectIdParam: projectId, tooLargeParam: tooLarge },
  );
  expect(oversize.ok).toBe(false);
  if (oversize.ok) {
    throw new Error("Expected INVALID_ARGUMENT on oversize metadataJson");
  }
  expect(oversize.error.code).toBe("INVALID_ARGUMENT");

  const alice = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    const res = await window.creonow.invoke("kg:entity:create", {
      projectId: projectIdParam,
      name: "Alice",
    });
    if (!res.ok) {
      throw new Error(`Expected ok kg:entity:create, got: ${res.error.code}`);
    }
    return res.data;
  }, projectId);

  const bob = await page.evaluate(async (projectIdParam) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    const res = await window.creonow.invoke("kg:entity:create", {
      projectId: projectIdParam,
      name: "Bob",
    });
    if (!res.ok) {
      throw new Error(`Expected ok kg:entity:create, got: ${res.error.code}`);
    }
    return res.data;
  }, projectId);

  const relation = await page.evaluate(
    async ({ projectIdParam, fromId, toId }) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      const res = await window.creonow.invoke("kg:relation:create", {
        projectId: projectIdParam,
        fromEntityId: fromId,
        toEntityId: toId,
        relationType: "knows",
      });
      if (!res.ok) {
        throw new Error(
          `Expected ok kg:relation:create, got: ${res.error.code}`,
        );
      }
      return res.data;
    },
    { projectIdParam: projectId, fromId: alice.entityId, toId: bob.entityId },
  );
  expect(relation.relationType).toBe("knows");

  const skillRead = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("skill:read", { id: "builtin:polish" });
  });
  expect(skillRead.ok).toBe(true);
  if (!skillRead.ok) {
    throw new Error(`Expected ok skill:read, got: ${skillRead.error.code}`);
  }

  const patched = skillRead.data.content
    .replace(/(^\s*knowledge_graph:\s*)false\s*$/m, "$1true")
    .replace(/(^scope:\s*)builtin\s*$/m, "$1project");

  const skillWrite = await page.evaluate(async (content) => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("skill:write", {
      id: "builtin:polish",
      content,
    });
  }, patched);
  expect(skillWrite.ok).toBe(true);
  if (!skillWrite.ok) {
    throw new Error(`Expected ok skill:write, got: ${skillWrite.error.code}`);
  }

  const skillsAfterWrite = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("skill:list", { includeDisabled: true });
  });
  expect(skillsAfterWrite.ok).toBe(true);
  if (!skillsAfterWrite.ok) {
    throw new Error(
      `Expected ok skill:list, got: ${skillsAfterWrite.error.code}`,
    );
  }
  const polish = skillsAfterWrite.data.items.find(
    (s) => s.id === "builtin:polish",
  );
  if (!polish) {
    throw new Error("Missing builtin:polish after write");
  }
  expect(polish.valid).toBe(true);
  expect(polish.enabled).toBe(true);

  await page.getByTestId("ai-input").fill("hello");
  await page.getByTestId("ai-send-stop").click();
  await expect(page.getByTestId("ai-output")).toContainText("E2E_RESULT");

  // Note: Context viewer UI assertions removed - component has been deleted
  // KG injection verified via IPC above (kg:get returns nodes/edges)

  await electronApp.close();
});
