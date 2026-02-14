import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const contextDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const fetcherFiles = [
  "fetchers/rulesFetcher.ts",
  "fetchers/retrievedFetcher.ts",
  "fetchers/settingsFetcher.ts",
] as const;

for (const relativePath of fetcherFiles) {
  const absolutePath = path.join(contextDir, relativePath);
  const source = await readFile(absolutePath, "utf8");

  assert.equal(
    source.includes("../layerAssemblyService"),
    false,
    `${relativePath} must not import from ../layerAssemblyService`,
  );

  assert.match(
    source,
    /from\s+["']\.\.\/types["']/,
    `${relativePath} must import context types from ../types`,
  );
}
