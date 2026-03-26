import assert from "node:assert/strict";

import { rankHybridRagCandidates } from "../hybridRagRanking";

const EPSILON = 1e-6;

// Scenario Mapping: S3-HR-S2
{
  const ranked = rankHybridRagCandidates({
    ftsCandidates: [
      {
        documentId: "doc_a",
        chunkId: "chunk_1",
        text: "abandoned warehouse old photo",
        score: 6,
        updatedAt: 300,
      },
      {
        documentId: "doc_b",
        chunkId: "chunk_2",
        text: "bridge clue",
        score: 4,
        updatedAt: 250,
      },
    ],
    semanticCandidates: [
      {
        documentId: "doc_a",
        chunkId: "chunk_1",
        text: "abandoned warehouse old photo",
        score: 0.8,
        updatedAt: 300,
      },
      {
        documentId: "doc_b",
        chunkId: "chunk_2",
        text: "bridge clue",
        score: 0.3,
        updatedAt: 250,
      },
    ],
    minFinalScore: 0,
  });

  assert.equal(ranked.length, 2);
  assert.ok(ranked[0] && ranked[1]);
  assert.ok((ranked[0]?.finalScore ?? 0) >= (ranked[1]?.finalScore ?? 0));

  for (const item of ranked) {
    const expected =
      0.55 * item.scoreBreakdown.bm25 +
      0.35 * item.scoreBreakdown.semantic +
      0.1 * item.scoreBreakdown.recency;
    assert.ok(
      Math.abs(item.finalScore - expected) <= EPSILON,
      `finalScore mismatch for ${item.documentId}::${item.chunkId}`,
    );
  }
}
