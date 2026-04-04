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
          content: `第${index + 1}轮：${"林远先观察门缝里的光，再听见门后的脚步声。".repeat(28)}`,
        })),
      });

    expect(result.compressionApplied).toBe(true);
    expect(result.layers.compressedHistory.compressed).toBe(true);
    expect(result.layers.compressedHistory.tokenCount).toBeGreaterThan(0);
    expect(result.layers.compressedHistory.compressionRatio).toBeLessThan(1);
    expect(result.prompt).toContain("## Compressed History");
    expect(result.layers.compressedHistory.source).toContain("compressed-history");
  });

  it("低 token 多轮对话在 shouldCompress=false 时仍以原文注入 compressed-history", async () => {
    const service = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules:test", content: "Rule content" }],
      }),
      immediate: async () => ({
        chunks: [
          {
            source: "editor:cursor-window",
            content: "EDITOR_SURFACE_LOW_TOKEN",
          },
        ],
      }),
    });

    const conversationMessages = [
      { role: "user" as const, content: "LOW_TOKEN_USER_1：先别推门。" },
      { role: "assistant" as const, content: "LOW_TOKEN_ASSISTANT_1：我先记住门轴声。" },
      { role: "user" as const, content: "LOW_TOKEN_USER_2：再看地上的灰。" },
      { role: "assistant" as const, content: "LOW_TOKEN_ASSISTANT_2：灰里只有一串脚印。" },
      { role: "user" as const, content: "LOW_TOKEN_USER_3：窗缝也记下来。" },
      { role: "assistant" as const, content: "LOW_TOKEN_ASSISTANT_3：窗缝透着冷风。" },
      { role: "user" as const, content: "LOW_TOKEN_USER_4：最后只写手背发凉。" },
    ];
    const rawHistory = conversationMessages.map((message) => message.content).join("\n");
    const request = {
      projectId: "proj-low-token-many-rounds",
      documentId: "doc-low-token-many-rounds",
      cursorPosition: 96,
      skillId: "continue-writing",
      conversationMessages,
    };

    const assembled = await service.assemble(request);
    const inspected = await service.inspect(request);

    expect(assembled.compressionApplied).toBe(false);
    expect(assembled.layers.compressedHistory.compressed).toBe(false);
    expect(assembled.prompt).toContain("## Compressed History");
    expect(assembled.prompt).toContain(rawHistory);
    expect(assembled.prompt).not.toContain("[最近保留的");
    expect(assembled.prompt).toContain("EDITOR_SURFACE_LOW_TOKEN");

    expect(inspected.layersDetail.compressedHistory.compressed).toBe(false);
    expect(inspected.layersDetail.compressedHistory.content).toBe(rawHistory);
    expect(inspected.layersDetail.compressedHistory.content).not.toContain(
      "[最近保留的",
    );
    expect(inspected.layersDetail.immediate.content).toBe("EDITOR_SURFACE_LOW_TOKEN");
  });

  it("长对话压缩时仍保留最近 keepRecentRounds 轮原始对话", async () => {
    const service = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules:test", content: "Rule content" }],
      }),
      immediate: async () => ({
        chunks: [
          {
            source: "editor:cursor-window",
            content: "EDITOR_IMMEDIATE_UNCHANGED",
          },
        ],
      }),
    });

    const conversationMessages = [
      ...Array.from({ length: 8 }, (_, index) => ({
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `早期历史第${index + 1}条：${"林远在旧楼里反复核对脚步声。".repeat(80)}`,
      })),
      { role: "user" as const, content: "UNIQUE_RECENT_USER_ROUND_1：别动门把，先记住走廊尽头的滴水声。" },
      { role: "assistant" as const, content: "UNIQUE_RECENT_ASSISTANT_ROUND_1：我会保留滴水声与走廊方位。" },
      { role: "user" as const, content: "UNIQUE_RECENT_USER_ROUND_2：把那枚铜钥匙藏进左侧口袋，不要写成右侧。" },
      { role: "assistant" as const, content: "UNIQUE_RECENT_ASSISTANT_ROUND_2：铜钥匙在左侧口袋，这一细节不会丢。" },
      { role: "user" as const, content: "UNIQUE_RECENT_USER_ROUND_3：最后一轮暂时没有助手回复，也必须原样保留。" },
    ];

    const request = {
      projectId: "proj-recent-rounds",
      documentId: "doc-recent-rounds",
      cursorPosition: 2048,
      skillId: "continue-writing",
      additionalInput: "林远在门后听见了第二个人的呼吸。".repeat(6),
      conversationMessages,
    };

    const assembled = await service.assemble(request);
    const inspected = await service.inspect(request);

    expect(assembled.compressionApplied).toBe(true);
    expect(assembled.layers.compressedHistory.compressed).toBe(true);
    expect(assembled.prompt).toContain("## Compressed History");
    expect(assembled.prompt).toContain("UNIQUE_RECENT_USER_ROUND_1");
    expect(assembled.prompt).toContain("UNIQUE_RECENT_ASSISTANT_ROUND_1");
    expect(assembled.prompt).toContain("UNIQUE_RECENT_USER_ROUND_2");
    expect(assembled.prompt).toContain("UNIQUE_RECENT_ASSISTANT_ROUND_2");
    expect(assembled.prompt).toContain("UNIQUE_RECENT_USER_ROUND_3");
    expect(assembled.prompt).toContain("EDITOR_IMMEDIATE_UNCHANGED");
    expect(assembled.layers.immediate.source).toContain("editor:cursor-window");

    expect(inspected.layersDetail.compressedHistory.compressed).toBe(true);
    expect(inspected.layersDetail.compressedHistory.content).toContain(
      "UNIQUE_RECENT_USER_ROUND_1",
    );
    expect(inspected.layersDetail.compressedHistory.content).toContain(
      "UNIQUE_RECENT_ASSISTANT_ROUND_2",
    );
    expect(inspected.layersDetail.compressedHistory.content).toContain(
      "UNIQUE_RECENT_USER_ROUND_3",
    );
    expect(inspected.layersDetail.immediate.content).toContain(
      "EDITOR_IMMEDIATE_UNCHANGED",
    );
    expect(inspected.layersDetail.immediate.content).not.toContain(
      "UNIQUE_RECENT_USER_ROUND_1",
    );
  });

  it("短对话在不压缩时仍以原文注入 compressed-history", async () => {
    const service = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules:test", content: "Rule content" }],
      }),
      immediate: async () => ({
        chunks: [{ source: "immediate:test", content: "Immediate content" }],
      }),
    });

    const conversationMessages = [
      { role: "user" as const, content: "第一问：门缝后的风声是不是有人在呼吸？" },
      { role: "assistant" as const, content: "第一答：像呼吸，但更像旧楼管道里回转的气。 " },
      { role: "user" as const, content: "第二问：那我先别推门，继续听三秒。" },
    ];
    const rawHistory = conversationMessages.map((message) => message.content).join("\n");
    const request = {
      projectId: "proj-short",
      documentId: "doc-short",
      cursorPosition: 64,
      skillId: "continue-writing",
      conversationMessages,
    };

    const assembled = await service.assemble(request);
    const inspected = await service.inspect(request);

    expect(assembled.compressionApplied).toBe(false);
    expect(assembled.layers.compressedHistory.compressed).toBe(false);
    expect(assembled.prompt).toContain("## Compressed History");
    expect(assembled.prompt).not.toContain("## Compressed History\n(none)");
    expect(assembled.prompt).toContain(rawHistory);

    expect(inspected.layersDetail.compressedHistory.compressed).toBe(false);
    expect(inspected.layersDetail.compressedHistory.content).toBe(rawHistory);
    expect(inspected.layersDetail.compressedHistory.content).not.toBe("");
    expect(inspected.layersDetail.compressedHistory.truncated).toBe(false);
    expect(inspected.layersDetail.compressedHistory.tokenCount).toBeGreaterThan(0);
  });
});
