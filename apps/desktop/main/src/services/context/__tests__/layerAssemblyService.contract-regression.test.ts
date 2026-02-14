import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const contextDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const topologyFiles = [
  "layerAssemblyService.ts",
  "types.ts",
  "utils/formatEntity.ts",
  "fetchers/rulesFetcher.ts",
  "fetchers/retrievedFetcher.ts",
  "fetchers/settingsFetcher.ts",
] as const;

for (const relativePath of topologyFiles) {
  await access(path.join(contextDir, relativePath));
}

const topologyFileSet = new Set<string>(topologyFiles);

function resolveImportToTopologyFile(args: {
  importer: string;
  specifier: string;
}): string | null {
  if (!args.specifier.startsWith(".")) {
    return null;
  }

  const importerAbsPath = path.join(contextDir, args.importer);
  const resolvedBase = path.resolve(
    path.dirname(importerAbsPath),
    args.specifier,
  );
  const candidates = [
    `${resolvedBase}.ts`,
    path.join(resolvedBase, "index.ts"),
  ];

  for (const candidate of candidates) {
    const relativePath = path
      .relative(contextDir, candidate)
      .replaceAll("\\", "/");
    if (topologyFileSet.has(relativePath)) {
      return relativePath;
    }
  }

  return null;
}

const graph = new Map<string, string[]>();
for (const file of topologyFiles) {
  const source = await readFile(path.join(contextDir, file), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => Boolean(specifier));

  const edges = imports
    .map((specifier) =>
      resolveImportToTopologyFile({ importer: file, specifier }),
    )
    .filter((edge): edge is string => edge !== null);

  graph.set(file, edges);
}

const visiting = new Set<string>();
const visited = new Set<string>();
const trail: string[] = [];
let cyclePath: string[] | null = null;

function visit(node: string): void {
  if (cyclePath) {
    return;
  }
  if (visited.has(node)) {
    return;
  }
  if (visiting.has(node)) {
    const startIndex = trail.indexOf(node);
    cyclePath = [...trail.slice(startIndex), node];
    return;
  }

  visiting.add(node);
  trail.push(node);

  for (const neighbor of graph.get(node) ?? []) {
    visit(neighbor);
    if (cyclePath) {
      return;
    }
  }

  trail.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const node of topologyFiles) {
  visit(node);
  if (cyclePath) {
    break;
  }
}

const cyclePathValue = cyclePath as string[] | null;
const cyclePathText =
  cyclePathValue === null ? "" : cyclePathValue.join(" -> ");
assert.equal(
  cyclePath,
  null,
  `context topology must not contain cycles: ${cyclePathText}`,
);

const service = createContextLayerAssemblyService({
  rules: async () => ({
    chunks: [{ source: "rules:test", content: "Rule content" }],
  }),
  settings: async () => ({
    chunks: [{ source: "settings:test", content: "Setting content" }],
  }),
  retrieved: async () => ({
    chunks: [{ source: "retrieved:test", content: "Retrieved content" }],
  }),
  immediate: async () => ({
    chunks: [{ source: "immediate:test", content: "Immediate content" }],
  }),
});

const request = {
  projectId: "proj-contract",
  documentId: "doc-contract",
  cursorPosition: 11,
  skillId: "continue-writing",
};

const first = await service.assemble(request);
const second = await service.assemble(request);

assert.deepEqual(first.assemblyOrder, [
  "rules",
  "settings",
  "retrieved",
  "immediate",
]);
assert.equal(typeof first.prompt, "string");
assert.equal(first.prompt.includes("## Rules"), true);
assert.equal(first.prompt.includes("## Settings"), true);
assert.equal(first.prompt.includes("## Retrieved"), true);
assert.equal(first.prompt.includes("## Immediate"), true);
assert.equal(first.layers.rules.source[0], "rules:test");
assert.equal(first.layers.settings.source[0], "settings:test");
assert.equal(first.layers.retrieved.source[0], "retrieved:test");
assert.equal(first.layers.immediate.source[0], "immediate:test");
assert.equal(typeof first.stablePrefixHash, "string");
assert.equal(first.stablePrefixHash.length > 0, true);
assert.equal(first.stablePrefixUnchanged, false);
assert.equal(second.stablePrefixUnchanged, true);
assert.equal(typeof first.tokenCount, "number");
assert.equal(first.tokenCount > 0, true);
assert.equal(Array.isArray(first.warnings), true);
