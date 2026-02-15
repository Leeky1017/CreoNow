import assert from "node:assert/strict";

import { rankHybridRagCandidates } from "../hybridRagRanking";

// Scenario Mapping: S3-HR-S1
{
  const ftsCandidates = [
    {
      documentId: "doc_a",
      chunkId: "chunk_1",
      text: "fts short warehouse note",
      score: 9,
      updatedAt: 110,
    },
    {
      documentId: "doc_b",
      chunkId: "chunk_2",
      text: "fts medium clue",
      score: 8,
      updatedAt: 120,
    },
    {
      documentId: "doc_c",
      chunkId: "chunk_3",
      text: "fts weak signal",
      score: 2,
      updatedAt: 90,
    },
  ];

  const semanticCandidates = [
    {
      documentId: "doc_a",
      chunkId: "chunk_1",
      text: "semantic long warehouse description with details",
      score: 0.7,
      updatedAt: 111,
    },
    {
      documentId: "doc_b",
      chunkId: "chunk_2",
      text: "semantic medium clue",
      score: 0.4,
      updatedAt: 118,
    },
    {
      documentId: "doc_c",
      chunkId: "chunk_3",
      text: "semantic lonely photo memory",
      score: 0.9,
      updatedAt: 90,
    },
  ];

  const first = rankHybridRagCandidates({
    ftsCandidates,
    semanticCandidates,
    minFinalScore: 0.25,
  });
  const second = rankHybridRagCandidates({
    ftsCandidates,
    semanticCandidates,
    minFinalScore: 0.25,
  });

  assert.equal(first.length, 3);
  assert.deepEqual(
    first.map((item) => `${item.documentId}::${item.chunkId}`),
    ["doc_a::chunk_1", "doc_b::chunk_2", "doc_c::chunk_3"],
  );

  const uniqueKeys = new Set(
    first.map((item) => `${item.documentId}::${item.chunkId}`),
  );
  assert.equal(uniqueKeys.size, first.length);

  assert.deepEqual(first, second);
}
