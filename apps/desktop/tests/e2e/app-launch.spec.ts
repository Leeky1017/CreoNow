import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E 世界 ");
  const dir = await fs.mkdtemp(base);
  // Add another segment to ensure path has spaces + unicode on Windows.
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

test("app launches (E2E mode)", async () => {
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

  await page.waitForFunction(
    () => typeof window.creonow?.invoke === "function",
  );

  const ping = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return window.creonow.invoke("app:system:ping", {});
  });
  expect(ping.ok).toBe(true);

  await electronApp.close();
});

test("security: renderer cannot access ipcRenderer/require while bridge remains available", async () => {
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

  const sandboxEnabled = await electronApp.evaluate(({ BrowserWindow }) => {
    const [mainWindow] = BrowserWindow.getAllWindows();
    if (!mainWindow) {
      throw new Error("Main window not found");
    }

    const webContentsWithPrefs = mainWindow.webContents as unknown as {
      getLastWebPreferences?: () => { sandbox?: boolean };
    };

    return webContentsWithPrefs.getLastWebPreferences?.().sandbox ?? false;
  });

  expect(sandboxEnabled).toBe(true);

  const securitySnapshot = await page.evaluate(() => ({
    creonowInvokeType: typeof window.creonow?.invoke,
    ipcRendererType: typeof (window as unknown as Record<string, unknown>)
      .ipcRenderer,
    requireType: typeof (window as unknown as Record<string, unknown>).require,
  }));

  expect(securitySnapshot.creonowInvokeType).toBe("function");
  expect(securitySnapshot.ipcRendererType).toBe("undefined");
  expect(securitySnapshot.requireType).toBe("undefined");

  const ping = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return window.creonow.invoke("app:system:ping", {});
  });
  expect(ping.ok).toBe(true);

  await electronApp.close();
});
