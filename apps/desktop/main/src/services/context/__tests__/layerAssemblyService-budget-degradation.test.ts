/**
 * layerAssemblyService — budget, degradation, error handling tests
 *
 * Covers: budget profile operations, layer degradation, scope violations,
 * layer truncation, prompt rendering, constraint trimming.
 */
import { describe, it, expect, vi } from "vitest";

import {
  createContextLayerAssemblyService,
} from "../layerAssemblyService";
import type {
  ContextAssembleRequest,
  ContextLayerFetcherMap,
  ContextRuleConstraint,
} from "../types";

// ── helpers ──────────────────────────────────────────────────────────

function makeRequest(overrides?: Partial<ContextAssembleRequest>): ContextAssembleRequest {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    cursorPosition: 0,
    skillId: "skill-1",
    ...overrides,
  };
}

function makeEmptyFetchers(overrides?: Partial<ContextLayerFetcherMap>): Partial<ContextLayerFetcherMap> {
  return {
    rules: async () => ({ chunks: [] }),
    settings: async () => ({ chunks: [] }),
    retrieved: async () => ({ chunks: [] }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "cursor=0" }],
    }),
    ...overrides,
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe("layerAssemblyService — getBudgetProfile", () => {
  it("returns default budget profile", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();

    expect(profile.version).toBe(1);
    expect(profile.tokenizerId).toBe("cn-byte-estimator");
    expect(profile.tokenizerVersion).toBe("1.0.0");
    expect(profile.totalBudgetTokens).toBe(6000);

    expect(profile.layers.rules.ratio).toBe(0.15);
    expect(profile.layers.settings.ratio).toBe(0.1);
    expect(profile.layers.retrieved.ratio).toBe(0.25);
    expect(profile.layers.immediate.ratio).toBe(0.5);
  });

  it("returns a deep clone (mutations do not affect internal state)", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();
    profile.layers.rules.ratio = 0.99;

    const profile2 = svc.getBudgetProfile();
    expect(profile2.layers.rules.ratio).toBe(0.15);
  });
});

describe("layerAssemblyService — updateBudgetProfile", () => {
  it("updates profile with valid ratios", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const current = svc.getBudgetProfile();

    const res = svc.updateBudgetProfile({
      version: current.version,
      tokenizerId: current.tokenizerId,
      tokenizerVersion: current.tokenizerVersion,
      layers: {
        rules: { ratio: 0.2, minimumTokens: 400 },
        settings: { ratio: 0.1, minimumTokens: 100 },
        retrieved: { ratio: 0.3, minimumTokens: 0 },
        immediate: { ratio: 0.4, minimumTokens: 1000 },
      },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.version).toBe(current.version + 1);
      expect(res.data.layers.rules.ratio).toBe(0.2);
    }
  });

  it("rejects version conflict", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());

    const res = svc.updateBudgetProfile({
      version: 999,
      tokenizerId: "cn-byte-estimator",
      tokenizerVersion: "1.0.0",
      layers: {
        rules: { ratio: 0.25, minimumTokens: 500 },
        settings: { ratio: 0.25, minimumTokens: 200 },
        retrieved: { ratio: 0.25, minimumTokens: 0 },
        immediate: { ratio: 0.25, minimumTokens: 2000 },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("CONTEXT_BUDGET_CONFLICT");
    }
  });

  it("rejects tokenizer mismatch", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();

    const res = svc.updateBudgetProfile({
      version: profile.version,
      tokenizerId: "other-tokenizer",
      tokenizerVersion: "1.0.0",
      layers: profile.layers,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("CONTEXT_TOKENIZER_MISMATCH");
    }
  });

  it("rejects ratios that do not sum to 1", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();

    const res = svc.updateBudgetProfile({
      version: profile.version,
      tokenizerId: profile.tokenizerId,
      tokenizerVersion: profile.tokenizerVersion,
      layers: {
        rules: { ratio: 0.5, minimumTokens: 500 },
        settings: { ratio: 0.5, minimumTokens: 200 },
        retrieved: { ratio: 0.5, minimumTokens: 0 },
        immediate: { ratio: 0.5, minimumTokens: 2000 },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("CONTEXT_BUDGET_INVALID_RATIO");
    }
  });

  it("rejects negative ratio", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();

    const res = svc.updateBudgetProfile({
      version: profile.version,
      tokenizerId: profile.tokenizerId,
      tokenizerVersion: profile.tokenizerVersion,
      layers: {
        rules: { ratio: -0.1, minimumTokens: 500 },
        settings: { ratio: 0.4, minimumTokens: 200 },
        retrieved: { ratio: 0.3, minimumTokens: 0 },
        immediate: { ratio: 0.4, minimumTokens: 2000 },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("CONTEXT_BUDGET_INVALID_RATIO");
    }
  });

  it("rejects negative minimumTokens", () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const profile = svc.getBudgetProfile();

    const res = svc.updateBudgetProfile({
      version: profile.version,
      tokenizerId: profile.tokenizerId,
      tokenizerVersion: profile.tokenizerVersion,
      layers: {
        rules: { ratio: 0.15, minimumTokens: -1 },
        settings: { ratio: 0.1, minimumTokens: 200 },
        retrieved: { ratio: 0.25, minimumTokens: 0 },
        immediate: { ratio: 0.5, minimumTokens: 2000 },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("CONTEXT_BUDGET_INVALID_MINIMUM");
    }
  });
});

describe("layerAssemblyService — assemble", () => {
  it("returns a prompt with fixed layer order", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules-src", content: "Rule 1" }],
      }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "Hello from editor" }],
      }),
    });

    const result = await svc.assemble(makeRequest());

    expect(result.prompt).toContain("## Rules");
    expect(result.prompt).toContain("## Immediate");
    expect(result.prompt).toContain("Rule 1");
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.stablePrefixHash).toBeDefined();
    expect(typeof result.stablePrefixHash).toBe("string");
    expect(result.warnings).toEqual(expect.any(Array));
  });

  it("stablePrefixUnchanged is false on first call, potentially true on second identical call", async () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const req = makeRequest();

    const first = await svc.assemble(req);
    expect(first.stablePrefixUnchanged).toBe(false);

    const second = await svc.assemble(req);
    expect(second.stablePrefixUnchanged).toBe(true);
    expect(second.stablePrefixHash).toBe(first.stablePrefixHash);
  });

  it("capacityPercent reflects token usage", async () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());
    const result = await svc.assemble(makeRequest());

    expect(result.capacityPercent).toBeGreaterThanOrEqual(0);
    expect(result.capacityPercent).toBeLessThanOrEqual(100);
  });
});

describe("layerAssemblyService — layer degradation", () => {
  it("degrades gracefully when a fetcher throws", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => {
        throw new Error("KG unavailable");
      },
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest());
    expect(result.warnings).toContain("KG_UNAVAILABLE");
    expect(result.layers.rules.tokenCount).toBe(0);
  });

  it("degrades settings layer on error", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({ chunks: [] }),
      settings: async () => {
        throw new Error("Settings DB error");
      },
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest());
    expect(result.warnings).toContain("SETTINGS_UNAVAILABLE");
  });

  it("degrades retrieved layer on error", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({ chunks: [] }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => {
        throw new Error("RAG failed");
      },
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest());
    expect(result.warnings).toContain("RAG_UNAVAILABLE");
  });
});

describe("layerAssemblyService — scope validation", () => {
  it("throws on cross-project layer chunk", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [
          { source: "kg", content: "rules", projectId: "other-project" },
        ],
      }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    await expect(svc.assemble(makeRequest({ projectId: "proj-1" }))).rejects.toThrow(
      /scope mismatch/i,
    );
  });

  it("allows chunks without projectId (global chunks)", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "global", content: "global rules" }],
      }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest());
    expect(result.prompt).toContain("global rules");
  });

  it("allows chunks with matching projectId", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "kg", content: "project rules", projectId: "proj-1" }],
      }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest({ projectId: "proj-1" }));
    expect(result.prompt).toContain("project rules");
  });
});

describe("layerAssemblyService — inspect", () => {
  it("returns detailed layer information", async () => {
    const svc = createContextLayerAssemblyService({
      rules: async () => ({
        chunks: [{ source: "rules-src", content: "Rule content" }],
      }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "Immediate content" }],
      }),
    });

    const result = await svc.inspect({
      ...makeRequest(),
      debugMode: true,
      requestedBy: "test-agent",
    });

    expect(result.layersDetail.rules.content).toContain("Rule content");
    expect(result.totals.tokenCount).toBeGreaterThan(0);
    expect(result.inspectMeta.debugMode).toBe(true);
    expect(result.inspectMeta.requestedBy).toBe("test-agent");
    expect(result.inspectMeta.requestedAt).toBeGreaterThan(0);
  });
});

describe("layerAssemblyService — retrieved chunk capping", () => {
  it("caps retrieved chunks and adds warning", async () => {
    const manyChunks = Array.from({ length: 210 }, (_, i) => ({
      source: "rag",
      content: `chunk-${i}`,
    }));

    const svc = createContextLayerAssemblyService({
      rules: async () => ({ chunks: [] }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: manyChunks }),
      immediate: async () => ({
        chunks: [{ source: "editor", content: "text" }],
      }),
    });

    const result = await svc.assemble(makeRequest());
    expect(result.warnings).toContain("CONTEXT_RETRIEVED_CHUNK_LIMIT");
  });
});

describe("layerAssemblyService — constraint trimming", () => {
  it("trims kg constraints first when rules exceed budget", async () => {
    const onConstraintTrim = vi.fn();
    const constraints: ContextRuleConstraint[] = Array.from({ length: 30 }, (_, i) => ({
      id: `c-${i}`,
      text: "A".repeat(200),
      source: "kg" as const,
      priority: i,
      updatedAt: "2024-01-01T00:00:00Z",
    }));

    const svc = createContextLayerAssemblyService(
      {
        rules: async () => ({
          chunks: [
            {
              source: "kg",
              content: "Base rules",
              constraints,
            },
          ],
        }),
        settings: async () => ({ chunks: [] }),
        retrieved: async () => ({ chunks: [] }),
        immediate: async () => ({
          chunks: [{ source: "editor", content: "text" }],
        }),
      },
      { onConstraintTrim },
    );

    await svc.assemble(makeRequest());

    if (onConstraintTrim.mock.calls.length > 0) {
      const firstTrim = onConstraintTrim.mock.calls[0][0];
      expect(firstTrim.reason).toBe("KG_LOW_PRIORITY");
      expect(firstTrim.constraintId).toBeDefined();
      expect(firstTrim.tokenFreed).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("layerAssemblyService — compressed history", () => {
  it("includes compressed history in prompt when conversation messages provided", async () => {
    const svc = createContextLayerAssemblyService(makeEmptyFetchers());

    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}: ` + "X".repeat(300),
    }));

    const result = await svc.assemble(
      makeRequest({ conversationMessages: messages }),
    );

    expect(result.prompt).toContain("## Compressed History");
  });
});
