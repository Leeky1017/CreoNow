import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useVersionHistoryController } from "@/features/version-history/useVersionHistoryController";

describe("useVersionHistoryController", () => {
  it("humanizes snapshot list errors instead of exposing backend messages", async () => {
    const api = {
      listSnapshots: vi.fn(async () => ({
        ok: false as const,
        error: {
          code: "VERSION_ROLLBACK_CONFLICT" as const,
          message: "SQLITE_CONSTRAINT: raw backend message",
        },
      })),
      readSnapshot: vi.fn(),
      rollbackSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
    };

    const { result } = renderHook(() =>
      useVersionHistoryController({
        activeDocument: {
          documentId: "doc-1",
          projectId: "project-1",
        },
        api,
        enabled: false,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.errorMessage).toBe("数据已发生变化，请刷新后重试。");
    expect(result.current.errorMessage).not.toContain("SQLITE_CONSTRAINT");
  });
});
