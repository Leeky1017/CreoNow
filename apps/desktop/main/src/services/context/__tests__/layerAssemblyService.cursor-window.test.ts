import { describe, expect, it } from "vitest";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const baseRequest = {
  projectId: "proj-cursor-window",
  documentId: "doc-1",
  cursorPosition: 37,
  skillId: "continue-writing",
};

function makeService() {
  return createContextLayerAssemblyService({
    rules: async () => ({ chunks: [] }),
    settings: async () => ({ chunks: [] }),
    retrieved: async () => ({ chunks: [] }),
  });
}

describe("createContextLayerAssemblyService cursor window regression", () => {
  it("preserves explicit cursorPosition in the immediate layer instead of degrading to 0", async () => {
    const service = makeService();

    const assembleResult = await service.assemble(baseRequest);
    const inspectResult = await service.inspect({
      ...baseRequest,
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

  describe("builtin:continue cursor-window with additionalInput", () => {
    // Regression: different cursorPosition values must produce different context/prompt windows
    // even when additionalInput is the same non-empty string.  Previously the immediate layer
    // used additionalInput verbatim, completely ignoring cursorPosition.

    it("cursorPosition=3 with additionalInput produces preceding-text slice as cursor window", async () => {
      const service = makeService();
      const result = await service.assemble({
        projectId: "p",
        documentId: "d",
        cursorPosition: 3,
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
      });
      const inspect = await service.inspect({
        projectId: "p",
        documentId: "d",
        cursorPosition: 3,
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
        debugMode: true,
        requestedBy: "unit-test",
      });

      // immediate layer must contain the text BEFORE cursor (first 3 chars), not the full text
      expect(inspect.layersDetail.immediate.content).toBe("甲乙丙");
      expect(inspect.layersDetail.immediate.source).toEqual(["editor:cursor-window"]);
      expect(result.prompt).toContain("甲乙丙");
      // must NOT contain the char after cursor
      expect(result.prompt).not.toContain("丁");
    });

    it("different cursorPosition values on same additionalInput produce different prompts", async () => {
      const service = makeService();
      const common = {
        projectId: "p",
        documentId: "d",
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
      };

      const resultAt0 = await service.assemble({ ...common, cursorPosition: 0 });
      const resultAt3 = await service.assemble({ ...common, cursorPosition: 3 });

      // Core regression assertion: prompts must differ when cursor is in different positions
      expect(resultAt0.prompt).not.toBe(resultAt3.prompt);
    });

    it("cursorPosition=0 with additionalInput falls back to cursor=0 (no preceding text)", async () => {
      const service = makeService();
      const inspect = await service.inspect({
        projectId: "p",
        documentId: "d",
        cursorPosition: 0,
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
        debugMode: true,
        requestedBy: "unit-test",
      });

      // No preceding text at position 0; must not contain document content in immediate layer
      expect(inspect.layersDetail.immediate.content).toBe("cursor=0");
    });

    it("cursorPosition beyond additionalInput length uses full text (clamps to end)", async () => {
      const service = makeService();
      const inspect = await service.inspect({
        projectId: "p",
        documentId: "d",
        cursorPosition: 999,
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
        debugMode: true,
        requestedBy: "unit-test",
      });

      // cursorPosition > text length → whole text is preceding context
      expect(inspect.layersDetail.immediate.content).toBe("甲乙丙丁");
    });
  });
});
