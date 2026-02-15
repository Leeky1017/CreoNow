import assert from "node:assert/strict";

import {
  rankHybridRagCandidates,
  truncateHybridRagCandidates,
} from "../hybridRagRanking";

// Scenario Mapping: S3-HR-S3
{
  const ranked = rankHybridRagCandidates({
    ftsCandidates: [
      {
        documentId: "doc_a",
        chunkId: "chunk_1",
        text: "aaaa",
        score: 9,
        updatedAt: 3,
      },
      {
        documentId: "doc_b",
        chunkId: "chunk_2",
        text: "bbbb",
        score: 8,
        updatedAt: 2,
      },
      {
        documentId: "doc_c",
        chunkId: "chunk_3",
        text: "cccc",
        score: 7,
        updatedAt: 1,
      },
    ],
    semanticCandidates: [
      {
        documentId: "doc_a",
        chunkId: "chunk_1",
        text: "aaaa",
        score: 0.9,
        updatedAt: 3,
      },
      {
        documentId: "doc_b",
        chunkId: "chunk_2",
        text: "bbbb",
        score: 0.8,
        updatedAt: 2,
      },
      {
        documentId: "doc_c",
        chunkId: "chunk_3",
        text: "cccc",
        score: 0.7,
        updatedAt: 1,
      },
    ],
    minFinalScore: 0,
  });

  const first = truncateHybridRagCandidates({
    ranked,
    topK: 5,
    maxTokens: 8,
    estimateTokens: (text) => text.length,
  });
  const second = truncateHybridRagCandidates({
    ranked,
    topK: 5,
    maxTokens: 8,
    estimateTokens: (text) => text.length,
  });

  assert.equal(first.truncated, true);
  assert.equal(first.usedTokens, 8);
  assert.deepEqual(
    first.chunks.map((item) => `${item.documentId}::${item.chunkId}`),
    ["doc_a::chunk_1", "doc_b::chunk_2"],
  );
  assert.deepEqual(first, second);
}
