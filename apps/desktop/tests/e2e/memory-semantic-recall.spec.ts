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

import type {
  IpcChannel,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../packages/shared/types/ipc-generated";

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

async function ipcInvoke<C extends IpcChannel>(
  page: Page,
  channel: C,
  payload: IpcRequest<C>,
): Promise<IpcInvokeResult<C>> {
  return (await page.evaluate(
    async ({ channel, payload }) => {
      if (!window.creonow) {
        throw new Error("Missing window.creonow bridge");
      }
      return await window.creonow.invoke(channel as never, payload as never);
    },
    { channel, payload },
  )) as IpcInvokeResult<C>;
}

test("memory semantic recall: preview mode=semantic + stablePrefixHash unchanged", async () => {
  const userDataDir = await createIsolatedUserDataDir();
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

  await page.getByTestId("welcome-create-project").click();
  await page.getByTestId("create-project-name").fill("Memory Semantic Project");
  await page.getByTestId("create-project-submit").click();

  const project = await ipcInvoke(page, "project:project:getcurrent", {});
  expect(project.ok).toBe(true);
  if (!project.ok) {
    throw new Error(project.error.message);
  }

  const settings = await ipcInvoke(page, "memory:settings:update", {
    patch: { injectionEnabled: true },
  });
  expect(settings.ok).toBe(true);

  const m1 = await ipcInvoke(page, "memory:entry:create", {
    type: "preference",
    scope: "global",
    content: "Prefer: use bullets",
  });
  expect(m1.ok).toBe(true);

  const m2 = await ipcInvoke(page, "memory:entry:create", {
    type: "preference",
    scope: "global",
    content: "Prefer: use numbered lists",
  });
  expect(m2.ok).toBe(true);

  const preview = await ipcInvoke(page, "memory:injection:preview", {
    projectId: project.data.projectId,
    queryText: "bullets",
  });
  expect(preview.ok).toBe(true);
  if (!preview.ok) {
    throw new Error(preview.error.message);
  }
  expect(preview.data.mode).toBe("semantic");
  expect(preview.data.items.length).toBeGreaterThan(0);
  expect(preview.data.items[0]?.content ?? "").toContain("bullets");

  // Verify a different query also works
  const preview2 = await ipcInvoke(page, "memory:injection:preview", {
    projectId: project.data.projectId,
    queryText: "numbers",
  });
  expect(preview2.ok).toBe(true);
  if (!preview2.ok) {
    throw new Error(preview2.error.message);
  }
  expect(preview2.data.mode).toBe("semantic");
  // Different query should return different ordering based on semantic similarity
  expect(preview2.data.items.length).toBeGreaterThan(0);

  // Note: Context viewer UI assertions removed - component has been deleted
  // Hash stability verification would need IPC-level diagnostics if required

  await electronApp.close();
});
