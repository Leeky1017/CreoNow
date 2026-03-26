export type HybridRagInputCandidate = {
  documentId: string;
  chunkId: string;
  text: string;
  score: number;
  updatedAt: number;
};

export type HybridRagScoreBreakdown = {
  bm25: number;
  semantic: number;
  recency: number;
};

export type HybridRagRankedItem = {
  documentId: string;
  chunkId: string;
  text: string;
  updatedAt: number;
  finalScore: number;
  scoreBreakdown: HybridRagScoreBreakdown;
};

export type HybridRagTruncatedChunk = {
  documentId: string;
  chunkId: string;
  text: string;
  score: number;
  tokenEstimate: number;
};

const EPSILON = 1e-12;
const SCORE_ROUND_DIGITS = 6;

function roundScore(value: number): number {
  const factor = 10 ** SCORE_ROUND_DIGITS;
  return Math.round(value * factor) / factor;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

type WorkingCandidate = {
  key: string;
  documentId: string;
  chunkId: string;
  text: string;
  updatedAt: number;
  bm25Raw: number;
  semanticRaw: number;
};

function upsertCandidate(
  map: Map<string, WorkingCandidate>,
  candidate: WorkingCandidate,
): void {
  const existing = map.get(candidate.key);
  if (!existing) {
    map.set(candidate.key, candidate);
    return;
  }

  map.set(candidate.key, {
    ...existing,
    text:
      candidate.text.length > existing.text.length
        ? candidate.text
        : existing.text,
    updatedAt: Math.max(existing.updatedAt, candidate.updatedAt),
    bm25Raw: Math.max(existing.bm25Raw, candidate.bm25Raw),
    semanticRaw: Math.max(existing.semanticRaw, candidate.semanticRaw),
  });
}

function normalizeBm25(candidates: WorkingCandidate[]): Map<string, number> {
  const values = candidates
    .map((candidate) => candidate.bm25Raw)
    .filter((value) => Number.isFinite(value) && value > 0);
  const normalized = new Map<string, number>();
  if (values.length === 0) {
    return normalized;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const span = max - min;
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.bm25Raw) || candidate.bm25Raw <= 0) {
      normalized.set(candidate.key, 0);
      continue;
    }
    if (span < EPSILON) {
      normalized.set(candidate.key, 1);
      continue;
    }
    normalized.set(candidate.key, clamp01((candidate.bm25Raw - min) / span));
  }

  return normalized;
}

function normalizeRecency(candidates: WorkingCandidate[]): Map<string, number> {
  const normalized = new Map<string, number>();
  if (candidates.length === 0) {
    return normalized;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    min = Math.min(min, candidate.updatedAt);
    max = Math.max(max, candidate.updatedAt);
  }

  const span = max - min;
  for (const candidate of candidates) {
    if (span < EPSILON) {
      normalized.set(candidate.key, 1);
      continue;
    }
    normalized.set(candidate.key, clamp01((candidate.updatedAt - min) / span));
  }

  return normalized;
}

export function rankHybridRagCandidates(args: {
  ftsCandidates: HybridRagInputCandidate[];
  semanticCandidates: HybridRagInputCandidate[];
  minFinalScore: number;
}): HybridRagRankedItem[] {
  const merged = new Map<string, WorkingCandidate>();

  for (const candidate of args.ftsCandidates) {
    const key = `${candidate.documentId}::${candidate.chunkId}`;
    upsertCandidate(merged, {
      key,
      documentId: candidate.documentId,
      chunkId: candidate.chunkId,
      text: candidate.text,
      updatedAt: candidate.updatedAt,
      bm25Raw: candidate.score,
      semanticRaw: 0,
    });
  }

  for (const candidate of args.semanticCandidates) {
    const key = `${candidate.documentId}::${candidate.chunkId}`;
    upsertCandidate(merged, {
      key,
      documentId: candidate.documentId,
      chunkId: candidate.chunkId,
      text: candidate.text,
      updatedAt: candidate.updatedAt,
      bm25Raw: 0,
      semanticRaw: candidate.score,
    });
  }

  const candidates = [...merged.values()];
  const bm25ByKey = normalizeBm25(candidates);
  const recencyByKey = normalizeRecency(candidates);
  const minFinalScore = Number.isFinite(args.minFinalScore)
    ? args.minFinalScore
    : 0;

  return candidates
    .map((candidate) => {
      const bm25 = roundScore(clamp01(bm25ByKey.get(candidate.key) ?? 0));
      const semantic = roundScore(clamp01(candidate.semanticRaw));
      const recency = roundScore(clamp01(recencyByKey.get(candidate.key) ?? 0));
      const finalScore = roundScore(
        0.55 * bm25 + 0.35 * semantic + 0.1 * recency,
      );

      return {
        documentId: candidate.documentId,
        chunkId: candidate.chunkId,
        text: candidate.text,
        updatedAt: candidate.updatedAt,
        finalScore,
        scoreBreakdown: {
          bm25,
          semantic,
          recency,
        },
      } satisfies HybridRagRankedItem;
    })
    .filter((item) => item.finalScore >= minFinalScore)
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      if (b.updatedAt !== a.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      const docOrder = a.documentId.localeCompare(b.documentId);
      if (docOrder !== 0) {
        return docOrder;
      }
      return a.chunkId.localeCompare(b.chunkId);
    });
}

export function truncateHybridRagCandidates(args: {
  ranked: HybridRagRankedItem[];
  topK: number;
  maxTokens: number;
  estimateTokens: (text: string) => number;
}): {
  chunks: HybridRagTruncatedChunk[];
  truncated: boolean;
  usedTokens: number;
} {
  const topK =
    Number.isFinite(args.topK) && Number.isInteger(args.topK) && args.topK > 0
      ? args.topK
      : args.ranked.length;
  const maxTokens =
    Number.isFinite(args.maxTokens) &&
    Number.isInteger(args.maxTokens) &&
    args.maxTokens > 0
      ? args.maxTokens
      : 0;

  const chunks: HybridRagTruncatedChunk[] = [];
  let usedTokens = 0;
  let truncated = false;

  for (const item of args.ranked) {
    if (chunks.length >= topK) {
      truncated = true;
      break;
    }

    const tokenEstimate = Math.max(
      0,
      Math.floor(args.estimateTokens(item.text)),
    );
    if (usedTokens + tokenEstimate > maxTokens) {
      truncated = true;
      break;
    }

    chunks.push({
      documentId: item.documentId,
      chunkId: item.chunkId,
      text: item.text,
      score: item.finalScore,
      tokenEstimate,
    });
    usedTokens += tokenEstimate;
  }

  if (!truncated && chunks.length < args.ranked.length) {
    truncated = true;
  }

  return { chunks, truncated, usedTokens };
}
