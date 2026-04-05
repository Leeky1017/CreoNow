/**
 * useExportProgress — unit tests
 *
 * Verifies that the hook wires the preload stream API to DOM CustomEvents
 * and exposes the latest export progress state to production callers.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportLifecycleEvent,
  type ExportProgressEvent,
} from "@shared/types/export";

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
    new CustomEvent<ExportLifecycleEvent>(EXPORT_PROGRESS_CHANNEL, { detail: event }),
  );
}

function dispatchLifecycleEvent(event: ExportLifecycleEvent): void {
  window.dispatchEvent(
    new CustomEvent<ExportLifecycleEvent>(EXPORT_PROGRESS_CHANNEL, { detail: event }),
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

  it("marks export as busy after a start event and clears it after completion", () => {
    const { result } = renderHook(() => useExportProgress());

    act(() => {
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-002",
        projectId: "proj-1",
        format: "markdown",
        currentDocument: "Chapter 1",
        timestamp: 1,
      });
    });

    expect(result.current.isExporting).toBe(true);
    expect(result.current.event?.type).toBe("export-started");

    act(() => {
      dispatchLifecycleEvent({
        type: "export-completed",
        exportId: "exp-002",
        success: true,
        projectId: "proj-1",
        format: "markdown",
        documentCount: 1,
        timestamp: 2,
      });
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.event).toEqual({
      type: "export-completed",
      exportId: "exp-002",
      success: true,
      projectId: "proj-1",
      format: "markdown",
      documentCount: 1,
      timestamp: 2,
    });
  });

  it("clears busy state after a failed export event", () => {
    const { result } = renderHook(() => useExportProgress());

    act(() => {
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-003",
        projectId: "proj-1",
        format: "pdf",
        currentDocument: "Chapter 2",
        timestamp: 3,
      });
      dispatchLifecycleEvent({
        type: "export-failed",
        exportId: "exp-003",
        success: false,
        projectId: "proj-1",
        format: "pdf",
        currentDocument: "Chapter 2",
        error: {
          code: "EXPORT_WRITE_ERROR",
          message: "disk full",
        },
        timestamp: 4,
      });
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.event).toEqual({
      type: "export-failed",
      exportId: "exp-003",
      success: false,
      projectId: "proj-1",
      format: "pdf",
      currentDocument: "Chapter 2",
      error: {
        code: "EXPORT_WRITE_ERROR",
        message: "disk full",
      },
      timestamp: 4,
    });
  });

  it("reflects the latest event when multiple events arrive", () => {
    const { result } = renderHook(() => useExportProgress());

    const first: ExportLifecycleEvent = {
      type: "export-started",
      exportId: "exp-001",
      projectId: "proj-1",
      format: "markdown",
      currentDocument: "Chapter 1",
      timestamp: 10,
    };
    const second: ExportProgressEvent = {
      type: "export-progress",
      exportId: "exp-001",
      stage: "writing",
      progress: 80,
      currentDocument: "Chapter 2",
    };

    act(() => {
      dispatchLifecycleEvent(first);
      dispatchProgressEvent(second);
    });

    expect(result.current.event).toEqual(second);
    expect(result.current.event?.type).toBe("export-progress");
    if (result.current.event?.type !== "export-progress") {
      throw new Error("expected export-progress event");
    }
    expect(result.current.event.progress).toBe(80);
    expect(result.current.isExporting).toBe(true);
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

  it("并发导出：第一个完成后 isExporting 保持 true，直到最后一个完成才回落", () => {
    const { result } = renderHook(() => useExportProgress());

    // Start export A
    act(() => {
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-A",
        projectId: "proj-1",
        format: "markdown",
        currentDocument: "Chapter 1",
        timestamp: 1,
      });
    });

    // Start export B while A is still running
    act(() => {
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-B",
        projectId: "proj-2",
        format: "docx",
        currentDocument: "Chapter 1",
        timestamp: 2,
      });
    });

    expect(result.current.isExporting).toBe(true);

    // Export A completes — B is still running, so isExporting MUST stay true
    act(() => {
      dispatchLifecycleEvent({
        type: "export-completed",
        exportId: "exp-A",
        success: true,
        projectId: "proj-1",
        format: "markdown",
        documentCount: 1,
        timestamp: 3,
      });
    });

    expect(result.current.isExporting).toBe(true);

    // Export B completes — now isExporting falls to false
    act(() => {
      dispatchLifecycleEvent({
        type: "export-completed",
        exportId: "exp-B",
        success: true,
        projectId: "proj-2",
        format: "docx",
        documentCount: 2,
        timestamp: 4,
      });
    });

    expect(result.current.isExporting).toBe(false);
  });

  it("并发导出：其中一个失败不影响另一个的 busy 状态", () => {
    const { result } = renderHook(() => useExportProgress());

    act(() => {
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-C",
        projectId: "proj-3",
        format: "pdf",
        currentDocument: "Part 1",
        timestamp: 10,
      });
      dispatchLifecycleEvent({
        type: "export-started",
        exportId: "exp-D",
        projectId: "proj-4",
        format: "txt",
        currentDocument: "Part 1",
        timestamp: 11,
      });
    });

    expect(result.current.isExporting).toBe(true);

    // Export C fails — D still running
    act(() => {
      dispatchLifecycleEvent({
        type: "export-failed",
        exportId: "exp-C",
        success: false,
        projectId: "proj-3",
        format: "pdf",
        currentDocument: "Part 1",
        error: { code: "EXPORT_WRITE_ERROR", message: "disk full" },
        timestamp: 12,
      });
    });

    expect(result.current.isExporting).toBe(true);

    // Export D completes — now idle
    act(() => {
      dispatchLifecycleEvent({
        type: "export-completed",
        exportId: "exp-D",
        success: true,
        projectId: "proj-4",
        format: "txt",
        documentCount: 3,
        timestamp: 13,
      });
    });

    expect(result.current.isExporting).toBe(false);
  });
});
