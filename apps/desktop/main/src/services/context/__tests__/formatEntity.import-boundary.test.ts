import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const contextDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const utilsPath = path.join(contextDir, "utils/formatEntity.ts");
const rulesFetcherPath = path.join(contextDir, "fetchers/rulesFetcher.ts");
const retrievedFetcherPath = path.join(
  contextDir,
  "fetchers/retrievedFetcher.ts",
);

await access(utilsPath);

const { formatEntityForContext } = await import("../utils/formatEntity");
assert.equal(typeof formatEntityForContext, "function");

const formatted = formatEntityForContext({
  name: "林默",
  type: "character",
  description: "侦探",
  attributes: { age: "28", skill: "推理" },
});
assert.equal(formatted.includes("## 角色：林默"), true);
assert.equal(formatted.includes("age=28"), true);
assert.equal(formatted.includes("skill=推理"), true);

const rulesFetcherSource = await readFile(rulesFetcherPath, "utf8");
const retrievedFetcherSource = await readFile(retrievedFetcherPath, "utf8");

assert.match(rulesFetcherSource, /from\s+["']\.\.\/utils\/formatEntity["']/);
assert.match(
  retrievedFetcherSource,
  /from\s+["']\.\.\/utils\/formatEntity["']/,
);
assert.equal(retrievedFetcherSource.includes('from "./rulesFetcher"'), false);
assert.equal(retrievedFetcherSource.includes("from './rulesFetcher'"), false);
assert.equal(
  rulesFetcherSource.includes("export function formatEntityForContext"),
  false,
  "rulesFetcher should consume formatEntityForContext from shared utility",
);
