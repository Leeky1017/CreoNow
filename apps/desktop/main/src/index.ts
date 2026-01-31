import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { BrowserWindow, app, ipcMain } from "electron";

import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function enableE2EUserDataIsolation(): void {
  const userDataDir = process.env.CREONOW_USER_DATA_DIR;
  if (typeof userDataDir !== "string" || userDataDir.length === 0) {
    return;
  }

  // Must be set before app 'ready' for full isolation.
  app.setPath("userData", userDataDir);
}

function resolvePreloadPath(): string {
  const dir = path.join(__dirname, "../preload");
  const candidates = ["index.cjs", "index.js", "index.mjs"];
  for (const fileName of candidates) {
    const p = path.join(dir, fileName);
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(dir, "index.cjs");
}

function createMainWindow(): BrowserWindow {
  const preload = resolvePreloadPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    "app:ping",
    async (): Promise<IpcResponse<Record<string, never>>> => {
      try {
        return { ok: true, data: {} };
      } catch {
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Ping failed" },
        };
      }
    },
  );
}

enableE2EUserDataIsolation();
registerIpcHandlers();

void app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
