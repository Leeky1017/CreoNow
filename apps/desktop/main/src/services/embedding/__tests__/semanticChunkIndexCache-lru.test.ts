/**
 * semanticChunkIndexCache — LRU eviction, TTL expiry, scope isolation
 *
 * Covers: basic get/set, TTL-based expiry, LRU eviction on overflow,
 * recency refresh on access, delete, clear, edge cases.
 */
import { describe, it, expect } from "vitest";

import { createSemanticChunkIndexCache } from "../semanticChunkIndexCache";

describe("semanticChunkIndexCache — basic operations", () => {
  it("stores and retrieves a value", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    cache.set("key-1", "value-1");
    expect(cache.get("key-1")).toBe("value-1");
  });

  it("returns undefined for missing key", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("overwrites existing key", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    cache.set("key-1", "old");
    cache.set("key-1", "new");
    expect(cache.get("key-1")).toBe("new");
  });
});

describe("semanticChunkIndexCache — TTL expiry", () => {
  it("expires entries after TTL", () => {
    let clock = 1000;
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 100,
      now: () => clock,
    });

    cache.set("key-1", "value-1");
    expect(cache.get("key-1")).toBe("value-1");

    clock = 1101; // past TTL
    expect(cache.get("key-1")).toBeUndefined();
  });

  it("does not expire entries before TTL", () => {
    let clock = 1000;
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 100,
      now: () => clock,
    });

    cache.set("key-1", "value-1");
    clock = 1099; // just before TTL
    expect(cache.get("key-1")).toBe("value-1");
  });
});

describe("semanticChunkIndexCache — LRU eviction", () => {
  it("evicts oldest entry when exceeding maxSize", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 2,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    cache.set("key-2", "v2");
    cache.set("key-3", "v3"); // should evict key-1

    expect(cache.get("key-1")).toBeUndefined();
    expect(cache.get("key-2")).toBe("v2");
    expect(cache.get("key-3")).toBe("v3");
  });

  it("refreshes recency on access", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 2,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    cache.set("key-2", "v2");

    // Access key-1 to make it more recent
    cache.get("key-1");

    // key-2 should be evicted since key-1 was refreshed
    cache.set("key-3", "v3");

    expect(cache.get("key-1")).toBe("v1");
    expect(cache.get("key-2")).toBeUndefined();
    expect(cache.get("key-3")).toBe("v3");
  });
});

describe("semanticChunkIndexCache — delete", () => {
  it("removes a specific key", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    cache.set("key-2", "v2");
    cache.delete("key-1");

    expect(cache.get("key-1")).toBeUndefined();
    expect(cache.get("key-2")).toBe("v2");
  });

  it("is a noop for nonexistent key", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    cache.delete("nonexistent");
    // should not throw
  });
});

describe("semanticChunkIndexCache — clear", () => {
  it("removes all entries", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    cache.set("key-2", "v2");
    cache.clear();

    expect(cache.get("key-1")).toBeUndefined();
    expect(cache.get("key-2")).toBeUndefined();
  });
});

describe("semanticChunkIndexCache — edge cases", () => {
  it("normalizes maxSize=0 to 1", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 0,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    expect(cache.get("key-1")).toBe("v1");

    cache.set("key-2", "v2");
    // maxSize=1 means key-1 should be evicted
    expect(cache.get("key-1")).toBeUndefined();
    expect(cache.get("key-2")).toBe("v2");
  });

  it("normalizes negative ttlMs to 1", () => {
    let clock = 1000;
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 10,
      ttlMs: -100,
      now: () => clock,
    });

    cache.set("key-1", "v1");
    // TTL is normalized to 1ms, so at clock=1001 it should expire
    clock = 1002;
    expect(cache.get("key-1")).toBeUndefined();
  });

  it("handles NaN maxSize gracefully", () => {
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: NaN,
      ttlMs: 60_000,
    });

    cache.set("key-1", "v1");
    expect(cache.get("key-1")).toBe("v1");
  });

  it("stores complex object values", () => {
    const cache = createSemanticChunkIndexCache<{ id: number; data: string }>({
      maxSize: 10,
      ttlMs: 60_000,
    });

    const value = { id: 42, data: "test" };
    cache.set("complex", value);
    expect(cache.get("complex")).toEqual(value);
  });
});

describe("semanticChunkIndexCache — expired entries evicted on set", () => {
  it("cleans up expired entries when setting new ones", () => {
    let clock = 1000;
    const cache = createSemanticChunkIndexCache<string>({
      maxSize: 100,
      ttlMs: 50,
      now: () => clock,
    });

    cache.set("old-1", "v1");
    cache.set("old-2", "v2");

    clock = 1060; // past TTL for both old entries

    cache.set("new-1", "v3");
    // Old entries should be expired on the eviction sweep
    expect(cache.get("old-1")).toBeUndefined();
    expect(cache.get("old-2")).toBeUndefined();
    expect(cache.get("new-1")).toBe("v3");
  });
});
