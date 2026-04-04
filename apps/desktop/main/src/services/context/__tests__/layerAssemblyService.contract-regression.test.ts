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

  it("P2 组装结果暴露 compressed-history 与 compressionApplied", async () => {
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
    expect(first.prompt.includes("## Compressed History")).toBe(true);
    expect(first.prompt.includes("## Immediate")).toBe(true);
    expect(first.layers.rules.source[0]).toBe("rules:test");
    expect(first.layers.compressedHistory.source).toContain("compressed-history");
    expect(first.layers.compressedHistory.compressed).toBe(false);
    expect(first.layers.immediate.source[0]).toBe("immediate:test");
    expect(first.compressionApplied).toBe(false);
    expect(first.stablePrefixHash.length > 0).toBe(true);
    expect(first.stablePrefixUnchanged).toBe(false);
    expect(second.stablePrefixUnchanged).toBe(true);
    expect(first.tokenCount > 0).toBe(true);
    expect(first.capacityPercent).toBeCloseTo((first.tokenCount / 6000) * 100);
    expect(Array.isArray(first.warnings)).toBe(true);
  });

  it("超长上下文会在真实 assemble 路径生成 compressed-history", async () => {
    const service = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules:test", content: "Rule content" }],
      }),
      immediate: async () => ({
        chunks: [
          {
            source: "editor:cursor-window",
            content: Array.from({ length: 8 }, (_, index) =>
              `第${index + 1}段：${"林远先观察门缝里的光，再听见门后的脚步声。".repeat(8)}`,
            ).join("\n"),
          },
        ],
      }),
    });

    const result = await service.assemble({
      projectId: "proj-long",
      documentId: "doc-long",
      cursorPosition: 4096,
      skillId: "continue-writing",
      additionalInput: "林远先观察门缝里的光，再听见门后的脚步声。".repeat(8),
      conversationMessages: Array.from({ length: 18 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `第${index + 1}轮：${"林远先观察门缝里的光，再听见门后的脚步声。".repeat(6)}`,
      })),
    });

    expect(result.compressionApplied).toBe(true);
    expect(result.layers.compressedHistory.compressed).toBe(true);
    expect(result.layers.compressedHistory.tokenCount).toBeGreaterThan(0);
    expect(result.layers.compressedHistory.compressionRatio).toBeLessThan(1);
    expect(result.prompt).toContain("## Compressed History");
    expect(result.layers.compressedHistory.source).toContain("compressed-history");
  });
});
