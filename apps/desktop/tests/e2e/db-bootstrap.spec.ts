import { _electron as electron, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create a unique E2E userData directory.
 *
 * Why: Windows E2E must verify DB/log outputs in an isolated, non-ASCII-safe path.
 */
async function createIsolatedUserDataDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow E2E 世界 ");
  const dir = await fs.mkdtemp(base);
  const nested = path.join(dir, `profile ${randomUUID()}`);
  await fs.mkdir(nested, { recursive: true });
  return nested;
}

test("db bootstrap: db + tables + main.log evidence", async () => {
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

  const tables = await page.evaluate(async () => {
    if (!window.creonow) {
      throw new Error("Missing window.creonow bridge");
    }
    return await window.creonow.invoke("db:debug:tableNames", {});
  });
  expect(tables.ok).toBe(true);
  if (tables.ok) {
    for (const required of [
      "projects",
      "documents",
      "document_versions",
      "settings",
      "skills",
      "user_memory",
      "kg_entities",
      "kg_relations",
    ]) {
      expect(tables.data.tableNames).toContain(required);
    }
  }

  await electronApp.close();

  const dbPath = path.join(userDataDir, "data", "creonow.db");
  const logPath = path.join(userDataDir, "logs", "main.log");

  const dbStat = await fs.stat(dbPath);
  expect(dbStat.isFile()).toBe(true);

  const log = await fs.readFile(logPath, "utf8");
  expect(log.length).toBeGreaterThan(0);
  expect(log).toContain("db_ready");
});
