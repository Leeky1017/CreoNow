import { describe, expect, it } from "vitest";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const request = {
  projectId: "proj-cursor-window",
  documentId: "doc-1",
  cursorPosition: 37,
  skillId: "continue-writing",
};

describe("createContextLayerAssemblyService cursor window regression", () => {
  it("preserves explicit cursorPosition in the immediate layer instead of degrading to 0", async () => {
    const service = createContextLayerAssemblyService({
      rules: async () => ({ chunks: [] }),
      settings: async () => ({ chunks: [] }),
      retrieved: async () => ({ chunks: [] }),
    });

    const assembleResult = await service.assemble(request);
    const inspectResult = await service.inspect({
      ...request,
      debugMode: true,
      requestedBy: "unit-test",
    });

    expect(assembleResult.prompt.includes("cursor=37")).toBe(true);
    expect(assembleResult.prompt.includes("cursor=0")).toBe(false);
    expect(inspectResult.layersDetail.immediate.content).toBe("cursor=37");
    expect(inspectResult.layersDetail.immediate.source).toEqual([
      "editor:cursor-window",
    ]);
  });
});
