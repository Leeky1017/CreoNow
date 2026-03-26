import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const facadePath = path.resolve(currentDir, "../documentService.ts");
const facadeSource = readFileSync(facadePath, "utf8");

assert.match(
  facadeSource,
  /createDocumentCrudService/,
  "S1-DSE-S3: facade should delegate CRUD implementation",
);

assert.match(
  facadeSource,
  /createVersionService/,
  "S1-DSE-S3: facade should delegate version implementation",
);

assert.match(
  facadeSource,
  /createBranchService/,
  "S1-DSE-S3: facade should delegate branch implementation",
);

const legacySqlMarkers = [
  "INSERT INTO documents",
  "INSERT INTO document_versions",
  "INSERT INTO document_branches",
  "INSERT INTO document_merge_sessions",
] as const;

for (const marker of legacySqlMarkers) {
  assert.equal(
    facadeSource.includes(marker),
    false,
    `S1-DSE-S3: facade should not keep legacy SQL implementation marker: ${marker}`,
  );
}
