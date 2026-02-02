/**
 * Deterministic token-hash embedding utilities.
 *
 * Why: CN V1 needs a local-only, dependency-free embedding baseline that can be
 * used for reranking (without a vector DB) and for tests where a model must be "ready".
 */

function fnv1a32(text: string): number {
  const data = new TextEncoder().encode(text);
  let hash = 0x811c9dc5;
  for (const b of data) {
    hash ^= b;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Embed a text into a unit vector (L2-normalized).
 */
export function embedTextToUnitVector(args: {
  text: string;
  dimension: number;
}): number[] {
  const dim = Math.max(1, Math.floor(args.dimension));
  const v = new Array<number>(dim).fill(0);
  const tokens = tokenize(args.text);
  for (const token of tokens) {
    const idx = fnv1a32(token) % dim;
    v[idx] = (v[idx] ?? 0) + 1;
  }

  let norm = 0;
  for (const x of v) {
    norm += x * x;
  }
  norm = Math.sqrt(norm);

  if (!Number.isFinite(norm) || norm <= 0) {
    return v;
  }

  return v.map((x) => x / norm);
}

/**
 * Dot product for two same-length vectors.
 *
 * Why: when vectors are normalized, dot(v1,v2) equals cosine similarity.
 */
export function dotProduct(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

