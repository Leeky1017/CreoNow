import { describe, expect, it } from "vitest";

import { createContextLayerAssemblyService } from "../layerAssemblyService";
import type { SynopsisStore } from "../synopsisStore";

const request = {
  projectId: "proj-synopsis-layer",
  documentId: "doc-current",
  cursorPosition: 21,
  skillId: "continue-writing",
  additionalInput: "继续写下去",
};

describe("createContextLayerAssemblyService synopsis fallback", () => {
  it("keeps the default P1 public result on the rules + immediate path", async () => {
    let listCalls = 0;

    const synopsisStore: SynopsisStore = {
      upsert: () => {
        throw new Error("not used in this test");
      },
      listRecentByProject: () => {
        listCalls += 1;
        return {
          ok: true,
          data: {
            items: [],
          },
        };
      },
    };

    const service = createContextLayerAssemblyService(undefined, {
      synopsisStore,
    });

    const assembled = await service.assemble(request);

    expect(listCalls).toBe(0);
    expect(assembled.prompt.includes("## Retrieved")).toBe(false);
    expect("retrieved" in assembled.layers).toBe(false);
    expect(assembled.warnings.includes("SYNOPSIS_UNAVAILABLE")).toBe(false);
    expect(assembled.tokenCount > 0).toBe(true);
    expect(assembled.capacityPercent).toBeCloseTo(
      (assembled.tokenCount / 6000) * 100,
    );
  });
});
