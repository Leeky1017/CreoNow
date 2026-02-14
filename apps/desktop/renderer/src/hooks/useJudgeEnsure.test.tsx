import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IpcInvokeResult } from "@shared/types/ipc-generated";
import { useJudgeEnsure } from "./useJudgeEnsure";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/ipcClient", () => ({
  invoke: invokeMock,
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useJudgeEnsure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario: 两个调用点复用同一 hook 状态语义（busy/downloading/error）", async () => {
    const first = createDeferred<IpcInvokeResult<"judge:model:ensure">>();
    const second = createDeferred<IpcInvokeResult<"judge:model:ensure">>();
    invokeMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const callsiteA = renderHook(() => useJudgeEnsure());
    const callsiteB = renderHook(() => useJudgeEnsure());

    let ensureA: Promise<unknown> | undefined;
    let ensureB: Promise<unknown> | undefined;
    await act(async () => {
      ensureA = callsiteA.result.current.ensure();
      ensureB = callsiteB.result.current.ensure();
    });

    expect(callsiteA.result.current.busy).toBe(true);
    expect(callsiteA.result.current.downloading).toBe(true);
    expect(callsiteA.result.current.error).toBeNull();
    expect(callsiteB.result.current.busy).toBe(true);
    expect(callsiteB.result.current.downloading).toBe(true);
    expect(callsiteB.result.current.error).toBeNull();

    first.resolve({
      ok: true,
      data: { state: { status: "ready" } },
    });
    second.resolve({
      ok: true,
      data: { state: { status: "ready" } },
    });

    await act(async () => {
      await ensureA;
      await ensureB;
    });

    expect(callsiteA.result.current.busy).toBe(false);
    expect(callsiteA.result.current.downloading).toBe(false);
    expect(callsiteA.result.current.error).toBeNull();
    expect(callsiteB.result.current.busy).toBe(false);
    expect(callsiteB.result.current.downloading).toBe(false);
    expect(callsiteB.result.current.error).toBeNull();
  });

  it("Scenario: ensure 失败后状态复位（busy/downloading=false，error 可展示）", async () => {
    invokeMock.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "MODEL_NOT_READY",
        message: "download failed",
      },
    } satisfies IpcInvokeResult<"judge:model:ensure">);

    const { result } = renderHook(() => useJudgeEnsure());

    await act(async () => {
      await result.current.ensure();
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
      expect(result.current.downloading).toBe(false);
    });

    expect(result.current.error?.code).toBe("MODEL_NOT_READY");
    expect(result.current.error?.message).toBe("download failed");
  });
});
