import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DocumentError } from "../types";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const typesPath = path.resolve(currentDir, "../types.ts");
const corePath = path.resolve(currentDir, "../documentCoreService.ts");
const derivePath = path.resolve(currentDir, "../derive.ts");

function readSource(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function assertNoIpcTypeCoupling(filePath: string, source: string): void {
  assert.equal(
    /\bIpcError\b/u.test(source) || /\bIpcErrorCode\b/u.test(source),
    false,
    `DOC-S2-SED-S1: ${filePath} must not depend on IpcError/IpcErrorCode`,
  );
}

const typesSource = readSource(typesPath);
assert.match(
  typesSource,
  /export type DocumentErrorCode =/u,
  "DOC-S2-SED-S1: document domain must define dedicated DocumentErrorCode",
);
assert.match(
  typesSource,
  /export type DocumentError =/u,
  "DOC-S2-SED-S1: document domain must define dedicated DocumentError",
);

const sample: DocumentError = {
  code: "INVALID_ARGUMENT",
  message: "invalid payload",
};
assert.equal(
  sample.code,
  "INVALID_ARGUMENT",
  "DOC-S2-SED-S1: DocumentError should be consumable as domain error envelope",
);

assertNoIpcTypeCoupling(typesPath, typesSource);
assertNoIpcTypeCoupling(corePath, readSource(corePath));
assertNoIpcTypeCoupling(derivePath, readSource(derivePath));
