import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useDebouncedCallback } from "./useDebouncedCallback";

describe("useDebouncedCallback", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call the callback immediately on first invocation", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));

    act(() => {
      result.current();
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should suppress subsequent calls within the debounce window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(350);
  });

  it("should allow a new call after the debounce window expires", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));

    act(() => {
      result.current();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      result.current();
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should clean up timer on unmount", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 300));

    act(() => {
      result.current();
    });

    unmount();

    // No error should occur when timer fires after unmount
    vi.advanceTimersByTime(350);
  });

  it("should forward arguments to the callback", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn as (...args: never[]) => void, 300),
    );

    act(() => {
      (result.current as (...args: unknown[]) => void)("arg1", "arg2");
    });

    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });
});
