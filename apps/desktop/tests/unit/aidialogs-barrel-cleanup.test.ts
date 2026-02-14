import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as AiDialogsBarrel from "../../renderer/src/components/features/AiDialogs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const barrelPath = path.resolve(
  __dirname,
  "../../renderer/src/components/features/AiDialogs/index.ts",
);
const barrelSource = readFileSync(barrelPath, "utf8");

// S2-DC-BARREL-S1
// runtime exports must remain stable after barrel cleanup.
assert.deepEqual(
  Object.keys(AiDialogsBarrel).sort(),
  ["AiDiffModal", "AiErrorCard", "AiInlineConfirm", "DiffText", "SystemDialog"],
  "S2-DC-BARREL-S1: AiDialogs runtime export surface must stay unchanged",
);

// S2-DC-BARREL-S1
// type export names must remain declared by the barrel.
const requiredTypeExports = [
  "AiErrorType",
  "AiErrorConfig",
  "InlineConfirmState",
  "AiInlineConfirmProps",
  "DiffChange",
  "DiffChangeState",
  "AiDiffModalProps",
  "AiErrorCardProps",
  "SystemDialogType",
  "SystemDialogProps",
];
for (const typeName of requiredTypeExports) {
  assert.equal(
    barrelSource.includes(typeName),
    true,
    `S2-DC-BARREL-S1: AiDialogs barrel must keep type export ${typeName}`,
  );
}

// S2-DC-BARREL-S1
// noisy example block should be removed while keeping exports.
assert.equal(
  barrelSource.includes("@example"),
  false,
  "S2-DC-BARREL-S1: AiDialogs barrel should drop oversized example comment",
);
