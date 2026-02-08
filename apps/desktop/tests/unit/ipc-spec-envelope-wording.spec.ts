import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

const targetSpecs = [
  "openspec/specs/ipc/spec.md",
  "openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md",
  "openspec/changes/archive/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md",
] as const;

for (const relPath of targetSpecs) {
  const absPath = path.join(repoRoot, relPath);
  const content = await fs.readFile(absPath, "utf8");

  assert.match(
    content,
    /\{\s*ok:\s*(true|false)\b/,
    `${relPath} should contain ok-envelope examples`,
  );

  assert.equal(
    /\{\s*success:\s*(true|false)\b/.test(content),
    false,
    `${relPath} should not contain legacy success-envelope examples`,
  );
}

console.log("ipc-spec-envelope-wording.spec.ts: all assertions passed");
