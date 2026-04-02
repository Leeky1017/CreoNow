import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const facadePath = path.resolve(currentDir, "../documentService.ts");
const facadeSource = readFileSync(facadePath, "utf8");

describe("documentService facade source", () => {
  it("delegates CRUD and version implementations only", () => {
    expect(facadeSource).toMatch(/createDocumentCrudService/);
    expect(facadeSource).toMatch(/createVersionService/);
    expect(facadeSource).not.toMatch(/createBranchService/);
  });

  it("keeps legacy SQL and later-phase branch wiring out of the facade", () => {
    for (const marker of [
      "INSERT INTO documents",
      "INSERT INTO document_versions",
      "INSERT INTO document_branches",
      "INSERT INTO document_merge_sessions",
    ] as const) {
      expect(facadeSource.includes(marker)).toBe(false);
    }
  });
});
