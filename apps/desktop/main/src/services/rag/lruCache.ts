/**
 * A tiny bounded LRU cache based on Map insertion order.
 *
 * Why: rerank embedding caches must be bounded to avoid memory leaks, while keeping
 * reads deterministic and cheap (no external deps).
 */
export class LruCache<K, V> {
  private readonly maxEntries: number;
  private readonly map: Map<K, V>;

  constructor(args: { maxEntries: number }) {
    const max = Math.floor(args.maxEntries);
    this.maxEntries = Number.isFinite(max) && max > 0 ? max : 1;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (typeof value === "undefined") {
      return undefined;
    }
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    this.evictIfNeeded();
  }

  private evictIfNeeded(): void {
    while (this.map.size > this.maxEntries) {
      const first = this.map.keys().next();
      if (first.done) {
        return;
      }
      this.map.delete(first.value);
    }
  }
}

