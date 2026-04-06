/**
 * hashEmbedding — deterministic embedding, unit vector, dot product
 *
 * Covers: dimension, normalization, determinism, empty input, unicode,
 * dot product correctness.
 */
import { describe, it, expect } from "vitest";

import { embedTextToUnitVector, dotProduct } from "../hashEmbedding";

describe("hashEmbedding — embedTextToUnitVector", () => {
  it("produces vector of requested dimension", () => {
    const vec = embedTextToUnitVector({ text: "hello world", dimension: 128 });
    expect(vec.length).toBe(128);
  });

  it("produces L2-normalized vector (unit vector)", () => {
    const vec = embedTextToUnitVector({ text: "hello world", dimension: 256 });
    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it("is deterministic for same input", () => {
    const v1 = embedTextToUnitVector({ text: "foo bar baz", dimension: 64 });
    const v2 = embedTextToUnitVector({ text: "foo bar baz", dimension: 64 });
    expect(v1).toEqual(v2);
  });

  it("produces different vectors for different inputs", () => {
    const v1 = embedTextToUnitVector({ text: "alpha", dimension: 64 });
    const v2 = embedTextToUnitVector({ text: "omega", dimension: 64 });
    expect(v1).not.toEqual(v2);
  });

  it("handles empty text (zero vector)", () => {
    const vec = embedTextToUnitVector({ text: "", dimension: 32 });
    expect(vec.length).toBe(32);
    // Empty text has no tokens → zero vector
    expect(vec.every((x) => x === 0)).toBe(true);
  });

  it("handles single-character text", () => {
    const vec = embedTextToUnitVector({ text: "a", dimension: 64 });
    expect(vec.length).toBe(64);
    const nonZero = vec.filter((x) => x !== 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it("handles unicode text", () => {
    const vec = embedTextToUnitVector({ text: "你好世界 αβγ", dimension: 128 });
    expect(vec.length).toBe(128);
    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it("normalizes dimension to at least 1", () => {
    const vec = embedTextToUnitVector({ text: "hello", dimension: 0 });
    expect(vec.length).toBe(1);
  });

  it("handles fractional dimension by flooring", () => {
    const vec = embedTextToUnitVector({ text: "hello", dimension: 3.7 });
    expect(vec.length).toBe(3);
  });
});

describe("hashEmbedding — dotProduct", () => {
  it("computes correct dot product for simple vectors", () => {
    expect(dotProduct([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("returns 1 for identical unit vectors", () => {
    const vec = embedTextToUnitVector({ text: "same text", dimension: 128 });
    expect(dotProduct(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it("handles different-length vectors (uses min length)", () => {
    const result = dotProduct([1, 2, 3, 4], [1, 2]);
    expect(result).toBe(5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it("handles empty vectors", () => {
    expect(dotProduct([], [])).toBe(0);
  });

  it("self-similarity is higher than cross-similarity for distinct texts", () => {
    const v1 = embedTextToUnitVector({ text: "machine learning", dimension: 256 });
    const v2 = embedTextToUnitVector({ text: "cooking recipes", dimension: 256 });

    const selfSim = dotProduct(v1, v1);
    const crossSim = dotProduct(v1, v2);

    expect(selfSim).toBeGreaterThan(crossSim);
  });
});
