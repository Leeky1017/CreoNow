import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function runContractGenerate(): Promise<void> {
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  await execFileAsync(pnpmBin, ["contract:generate"], {
    cwd: repoRoot,
    env: process.env,
  });
}

async function readGenerated(): Promise<string> {
  const outPath = path.join(repoRoot, "packages/shared/types/ipc-generated.ts");
  return await fs.readFile(outPath, "utf8");
}

await runContractGenerate();
const first = await readGenerated();

await runContractGenerate();
const second = await readGenerated();

assert.equal(first, second);
