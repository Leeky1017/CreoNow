import { describe, expect, it } from "vitest";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const request = {
  projectId: "proj-memory-injection",
  documentId: "doc-1",
  cursorPosition: 12,
  skillId: "continue-writing",
  additionalInput: "继续写这一段动作场景",
};

describe("createContextLayerAssemblyService P1 phase cut", () => {
  it("keeps settings and retrieved layers out of the default public result", async () => {
    let previewInjectionCalls = 0;
    let entityListCalls = 0;
    let synopsisCalls = 0;
    let semanticRuleCalls = 0;

    const service = createContextLayerAssemblyService(
      {
        rules: async () => ({
          chunks: [{ source: "rules:test", content: "规则约束" }],
        }),
        immediate: async () => ({
          chunks: [{ source: "immediate:test", content: "当前正文" }],
        }),
      },
      {
        memoryService: {
          previewInjection: () => {
            previewInjectionCalls += 1;
            return {
              ok: true,
              data: {
                mode: "deterministic",
                items: [
                  {
                    id: "m-1",
                    type: "preference",
                    scope: "project",
                    origin: "learned",
                    content: "动作场景偏好短句",
                    reason: { kind: "deterministic" },
                  },
                ],
              },
            };
          },
        },
        kgService: {
          entityList: () => {
            entityListCalls += 1;
            return {
              ok: true,
              data: {
                items: [],
                totalCount: 0,
              },
            };
          },
        },
        synopsisStore: {
          listRecentByProject: () => {
            synopsisCalls += 1;
            return { ok: true, data: { items: [], truncated: false } };
          },
        },
        episodicMemoryService: {
          listSemanticMemory: () => {
            semanticRuleCalls += 1;
            return { ok: true, data: { items: [], conflictQueue: [] } };
          },
        },
      },
    );

    const assembleResult = await service.assemble(request);
    const inspectResult = await service.inspect({
      ...request,
      debugMode: true,
      requestedBy: "unit-test",
    });

    expect("settings" in assembleResult.layers).toBe(false);
    expect("retrieved" in assembleResult.layers).toBe(false);
    expect(assembleResult.prompt.includes("## Settings")).toBe(false);
    expect(assembleResult.prompt.includes("## Retrieved")).toBe(false);
    expect(assembleResult.prompt.includes("动作场景偏好短句")).toBe(false);
    expect(assembleResult.capacityPercent).toBeCloseTo(
      (assembleResult.tokenCount / 6000) * 100,
    );
    expect("settings" in inspectResult.layersDetail).toBe(false);
    expect("retrieved" in inspectResult.layersDetail).toBe(false);
    expect(previewInjectionCalls).toBe(0);
    expect(entityListCalls).toBe(0);
    expect(synopsisCalls).toBe(0);
    expect(semanticRuleCalls).toBe(0);
  });
});
