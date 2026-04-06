/**
 * embeddingQueue — debounce, deduplication, dispose
 *
 * Covers: basic enqueue, debounce coalescing, dispose cleanup, error handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createEmbeddingQueue } from "../embeddingQueue";

describe("embeddingQueue — basic behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs task after debounce period", () => {
    const run = vi.fn();
    const queue = createEmbeddingQueue({ run, debounceMs: 100 });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "hello",
      updatedAt: 1000,
    });

    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "d1" }),
    );

    queue.dispose();
  });

  it("coalesces rapid enqueues for same documentId", () => {
    const run = vi.fn();
    const queue = createEmbeddingQueue({ run, debounceMs: 100 });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "first",
      updatedAt: 1000,
    });

    vi.advanceTimersByTime(50);

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "second",
      updatedAt: 1001,
    });

    vi.advanceTimersByTime(100);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ contentText: "second" }),
    );

    queue.dispose();
  });

  it("processes different documentIds independently", () => {
    const run = vi.fn();
    const queue = createEmbeddingQueue({ run, debounceMs: 100 });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "doc1",
      updatedAt: 1000,
    });
    queue.enqueue({
      projectId: "p1",
      documentId: "d2",
      contentText: "doc2",
      updatedAt: 1000,
    });

    vi.advanceTimersByTime(100);

    expect(run).toHaveBeenCalledTimes(2);

    queue.dispose();
  });
});

describe("embeddingQueue — dispose", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels pending tasks on dispose", () => {
    const run = vi.fn();
    const queue = createEmbeddingQueue({ run, debounceMs: 100 });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "hello",
      updatedAt: 1000,
    });

    queue.dispose();
    vi.advanceTimersByTime(200);

    expect(run).not.toHaveBeenCalled();
  });
});

describe("embeddingQueue — error handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onError when run throws", async () => {
    const onError = vi.fn();
    const run = vi.fn().mockRejectedValue(new Error("compute failed"));
    const queue = createEmbeddingQueue({ run, debounceMs: 50, onError });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "hello",
      updatedAt: 1000,
    });

    vi.advanceTimersByTime(50);
    // Wait for the promise rejection to be caught
    await vi.advanceTimersByTimeAsync(0);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ documentId: "d1" }),
    );

    queue.dispose();
  });
});

describe("embeddingQueue — default debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to 120ms debounce when not specified", () => {
    const run = vi.fn();
    const queue = createEmbeddingQueue({ run });

    queue.enqueue({
      projectId: "p1",
      documentId: "d1",
      contentText: "hello",
      updatedAt: 1000,
    });

    vi.advanceTimersByTime(119);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);

    queue.dispose();
  });
});
