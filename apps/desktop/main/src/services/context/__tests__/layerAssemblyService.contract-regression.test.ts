import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const contextDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const topologyFiles = [
  "layerAssemblyService.ts",
  "synopsisStore.ts",
  "types.ts",
  "utils/formatEntity.ts",
  "fetchers/rulesFetcher.ts",
  "fetchers/retrievedFetcher.ts",
  "fetchers/settingsFetcher.ts",
  "fetchers/synopsisFetcher.ts",
] as const;

function resolveImportToTopologyFile(args: {
  importer: string;
  specifier: string;
}): string | null {
  if (!args.specifier.startsWith(".")) {
    return null;
  }

  const importerAbsPath = path.join(contextDir, args.importer);
  const resolvedBase = path.resolve(path.dirname(importerAbsPath), args.specifier);
  const candidates = [`${resolvedBase}.ts`, path.join(resolvedBase, "index.ts")];

  for (const candidate of candidates) {
    const relativePath = path.relative(contextDir, candidate).replaceAll("\\", "/");
    if (new Set<string>(topologyFiles).has(relativePath)) {
      return relativePath;
    }
  }

  return null;
}

async function detectTopologyCycle(): Promise<string[] | null> {
  for (const relativePath of topologyFiles) {
    await access(path.join(contextDir, relativePath));
  }

  const topologyFileSet = new Set<string>(topologyFiles);
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
      .filter(
        (edge): edge is string => edge !== null && topologyFileSet.has(edge),
      );

    graph.set(file, edges);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const trail: string[] = [];
  let cyclePath: string[] | null = null;

  const visit = (node: string): void => {
    if (cyclePath || visited.has(node)) {
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
  };

  for (const node of topologyFiles) {
    visit(node);
    if (cyclePath) {
      break;
    }
  }

  return cyclePath;
}

describe("createContextLayerAssemblyService contract regression", () => {
  it("keeps the context topology acyclic", async () => {
    const cyclePath = await detectTopologyCycle();
    expect(cyclePath, cyclePath?.join(" -> ")).toBeNull();
  });

  it("keeps the public P1 contract phase-cut to rules + immediate even when later layers are populated", async () => {
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

    expect(first.prompt.includes("## Rules")).toBe(true);
    expect(first.prompt.includes("## Settings")).toBe(false);
    expect(first.prompt.includes("## Retrieved")).toBe(false);
    expect(first.prompt.includes("## Immediate")).toBe(true);
    expect(first.layers.rules.source[0]).toBe("rules:test");
    expect("settings" in first.layers).toBe(false);
    expect("retrieved" in first.layers).toBe(false);
    expect(first.layers.immediate.source[0]).toBe("immediate:test");
    expect(first.stablePrefixHash.length > 0).toBe(true);
    expect(first.stablePrefixUnchanged).toBe(false);
    expect(second.stablePrefixUnchanged).toBe(true);
    expect(first.tokenCount > 0).toBe(true);
    expect(first.capacityPercent).toBeCloseTo((first.tokenCount / 6000) * 100);
    expect(Array.isArray(first.warnings)).toBe(true);
  });
});
