import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceByFile = {
  context: readFileSync(path.resolve(__dirname, "../context.ts"), "utf8"),
  contextAssembly: readFileSync(
    path.resolve(__dirname, "../contextAssembly.ts"),
    "utf8",
  ),
  contextBudget: readFileSync(
    path.resolve(__dirname, "../contextBudget.ts"),
    "utf8",
  ),
  contextFs: readFileSync(path.resolve(__dirname, "../contextFs.ts"), "utf8"),
};

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1;
}

// SCIS-S3: dependency instances are created once in aggregator and injected down.
const factoryTokens = [
  "createKnowledgeGraphService(",
  "createMemoryService(",
  "createContextLayerAssemblyService(",
];

for (const token of factoryTokens) {
  assert.equal(
    countOccurrences(sourceByFile.context, token),
    1,
    `SCIS-S3: expected exactly one ${token} call in context.ts`,
  );

  assert.equal(
    sourceByFile.contextAssembly.includes(token),
    false,
    `SCIS-S3: contextAssembly.ts must not call ${token}`,
  );
  assert.equal(
    sourceByFile.contextBudget.includes(token),
    false,
    `SCIS-S3: contextBudget.ts must not call ${token}`,
  );
  assert.equal(
    sourceByFile.contextFs.includes(token),
    false,
    `SCIS-S3: contextFs.ts must not call ${token}`,
  );
}
