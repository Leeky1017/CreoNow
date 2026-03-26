import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../layerAssemblyService";
import type { SynopsisStore } from "../synopsisStore";

const request = {
  projectId: "proj-synopsis-layer",
  documentId: "doc-current",
  cursorPosition: 21,
  skillId: "continue-writing",
  additionalInput: "继续写下去",
};

// Scenario: S3-SYN-INJ-S2
// keeps continue flow valid when no synopsis exists.
{
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

  assert.equal(listCalls, 1);
  assert.equal(assembled.prompt.includes("## Retrieved"), true);
  assert.deepEqual(assembled.layers.retrieved.source, []);
  assert.equal(assembled.warnings.includes("SYNOPSIS_UNAVAILABLE"), false);
  assert.equal(assembled.tokenCount > 0, true);
}

console.log("layerAssemblyService.synopsis.test.ts: all assertions passed");
