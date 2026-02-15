import assert from "node:assert/strict";

import type { SynopsisStore } from "../synopsisStore";
import { createSynopsisFetcher } from "../fetchers/synopsisFetcher";

const BASE_REQUEST = {
  projectId: "proj-synopsis-fetcher",
  documentId: "doc-current",
  cursorPosition: 42,
  skillId: "continue-writing",
};

// Scenario: S3-SYN-INJ-S1
// injects previous chapter synopsis in deterministic chapter order.
{
  const calls: Array<Parameters<SynopsisStore["listRecentByProject"]>[0]> = [];

  const synopsisStore: SynopsisStore = {
    upsert: () => {
      throw new Error("not used in this test");
    },
    listRecentByProject: (args) => {
      calls.push(args);
      return {
        ok: true,
        data: {
          items: [
            {
              synopsisId: "syn-3",
              projectId: "proj-synopsis-fetcher",
              documentId: "doc-3",
              chapterOrder: 3,
              synopsisText: "第三章摘要",
              createdAt: 1701000000003,
              updatedAt: 1701000001003,
            },
            {
              synopsisId: "syn-1",
              projectId: "proj-synopsis-fetcher",
              documentId: "doc-1",
              chapterOrder: 1,
              synopsisText: "第一章摘要",
              createdAt: 1701000000001,
              updatedAt: 1701000001001,
            },
            {
              synopsisId: "syn-2",
              projectId: "proj-synopsis-fetcher",
              documentId: "doc-2",
              chapterOrder: 2,
              synopsisText: "第二章摘要",
              createdAt: 1701000000002,
              updatedAt: 1701000001002,
            },
          ],
        },
      };
    },
  };

  const fetcher = createSynopsisFetcher({
    synopsisStore,
    chapterLimit: 3,
  });

  const result = await fetcher(BASE_REQUEST);

  assert.deepEqual(calls, [
    {
      projectId: "proj-synopsis-fetcher",
      excludeDocumentId: "doc-current",
      limit: 3,
    },
  ]);
  assert.equal(result.chunks.length, 3);
  assert.equal(result.chunks[0]?.source, "synopsis:chapter:1:doc-1");
  assert.equal(result.chunks[1]?.source, "synopsis:chapter:2:doc-2");
  assert.equal(result.chunks[2]?.source, "synopsis:chapter:3:doc-3");
  assert.equal(result.chunks[0]?.content.includes("第一章摘要"), true);
  assert.equal(result.chunks[1]?.content.includes("第二章摘要"), true);
  assert.equal(result.chunks[2]?.content.includes("第三章摘要"), true);
}

console.log("synopsisFetcher.test.ts: all assertions passed");
