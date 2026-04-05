/**
 * useExportProgress — unit tests
 *
 * Verifies that the hook wires the preload stream API to DOM CustomEvents
 * and exposes the latest export progress state to production callers.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXPORT_PROGRESS_CHANNEL, type ExportProgressEvent } from "@shared/types/export";

import { useExportProgress } from "../useExportProgress";

const mockRegister = vi.fn(() => ({ ok: true as const, data: { subscriptionId: "sub-export-test" } }));
const mockRelease = vi.fn();

beforeEach(() => {
  mockRegister.mockClear();
  mockRelease.mockClear();

  window.creonow = {
    api: window.api ?? ({} as never),
    invoke: vi.fn(),
    stream: {
      registerAiStreamConsumer: vi.fn(() => ({ ok: true as const, data: { subscriptionId: "sub-ai-1" } })),
      releaseAiStreamConsumer: vi.fn(),
      registerExportProgressConsumer: mockRegister,
      releaseExportProgressConsumer: mockRelease,
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function dispatchProgressEvent(event: ExportProgressEvent): void {
  window.dispatchEvent(
    new CustomEvent<ExportProgressEvent>(EXPORT_PROGRESS_CHANNEL, { detail: event }),
  );
}

describe("useExportProgress", () => {
  it("registers a consumer on mount and releases it on unmount", () => {
    const { unmount } = renderHook(() => useExportProgress());

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRelease).not.toHaveBeenCalled();

    unmount();

    expect(mockRelease).toHaveBeenCalledWith("sub-export-test");
  });

  it("returns idle state before any progress event", () => {
    const { result } = renderHook(() => useExportProgress());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.event).toBeNull();
  });

  it("updates state when a DOM ExportProgress event is dispatched", () => {
    const { result } = renderHook(() => useExportProgress());

    const progressEvent: ExportProgressEvent = {
      type: "export-progress",
      exportId: "exp-001",
      stage: "converting",
      progress: 42,
      currentDocument: "Chapter 1",
    };

    act(() => {
      dispatchProgressEvent(progressEvent);
    });

    expect(result.current.isExporting).toBe(true);
    expect(result.current.event).toEqual(progressEvent);
  });

  it("reflects the latest event when multiple events arrive", () => {
    const { result } = renderHook(() => useExportProgress());

    const first: ExportProgressEvent = {
      type: "export-progress",
      exportId: "exp-001",
      stage: "parsing",
      progress: 10,
      currentDocument: "Chapter 1",
    };
    const second: ExportProgressEvent = {
      type: "export-progress",
      exportId: "exp-001",
      stage: "writing",
      progress: 80,
      currentDocument: "Chapter 2",
    };

    act(() => {
      dispatchProgressEvent(first);
      dispatchProgressEvent(second);
    });

    expect(result.current.event).toEqual(second);
    expect(result.current.event?.progress).toBe(80);
  });

  it("stops listening after unmount — no state updates post-cleanup", () => {
    const { result, unmount } = renderHook(() => useExportProgress());

    unmount();

    const postUnmountEvent: ExportProgressEvent = {
      type: "export-progress",
      exportId: "exp-999",
      stage: "writing",
      progress: 99,
      currentDocument: "Epilogue",
    };

    act(() => {
      dispatchProgressEvent(postUnmountEvent);
    });

    // State should still be idle — the listener was removed
    expect(result.current.isExporting).toBe(false);
    expect(result.current.event).toBeNull();
  });
});
