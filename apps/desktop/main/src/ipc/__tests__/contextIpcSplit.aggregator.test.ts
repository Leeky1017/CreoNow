import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contextPath = path.resolve(__dirname, "../context.ts");
const source = readFileSync(contextPath, "utf8");

// SCIS-S2: context.ts must only orchestrate three sub-registrars.
const assemblyCall = "registerContextAssemblyHandlers(registrationDeps);";
const budgetCall = "registerContextBudgetHandlers(registrationDeps);";
const fsCall = "registerContextFsHandlers(registrationDeps);";

const assemblyIndex = source.indexOf(assemblyCall);
const budgetIndex = source.indexOf(budgetCall);
const fsIndex = source.indexOf(fsCall);

assert.ok(assemblyIndex >= 0, "SCIS-S2: missing assembly delegation call");
assert.ok(budgetIndex >= 0, "SCIS-S2: missing budget delegation call");
assert.ok(fsIndex >= 0, "SCIS-S2: missing fs delegation call");
assert.ok(
  assemblyIndex < budgetIndex && budgetIndex < fsIndex,
  "SCIS-S2: delegation order must be assembly -> budget -> fs",
);

const inlineHandlePattern = /deps\.ipcMain\s*\.\s*handle\s*\(/u;
assert.equal(
  inlineHandlePattern.test(source),
  false,
  "SCIS-S2: context.ts must not inline ipcMain.handle registrations",
);
