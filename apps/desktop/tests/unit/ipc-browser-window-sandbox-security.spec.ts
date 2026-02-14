import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const mainIndexPath = path.join(repoRoot, "apps/desktop/main/src/index.ts");
const mainSource = await fs.readFile(mainIndexPath, "utf8");

const webPreferencesMatch = mainSource.match(
  /(?:export\s+)?function createMainWindow\([^)]*\):\s*BrowserWindow\s*\{[\s\S]*?webPreferences:\s*\{([\s\S]*?)\},/m,
);

// SSE-S1: BrowserWindow 必须在 sandbox 下创建 [ADDED]
assert.ok(
  webPreferencesMatch,
  "createMainWindow webPreferences block should exist",
);

const webPreferencesSource = webPreferencesMatch[1];
assert.match(
  webPreferencesSource,
  /\bsandbox:\s*true\b/,
  "main window webPreferences must enable sandbox",
);
assert.equal(
  /\bsandbox:\s*false\b/.test(webPreferencesSource),
  false,
  "main window webPreferences must not fallback to sandbox: false",
);

console.log(
  "ipc-browser-window-sandbox-security.spec.ts: all assertions passed",
);
