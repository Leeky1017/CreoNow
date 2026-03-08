import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

import { useAutosaveToast } from "./useAutosaveToast";
import type { AutosaveStatus } from "../../stores/editorStore";
import type { ToastState } from "../../components/primitives/Toast";

function ToastHarness(props: {
  autosaveStatus: AutosaveStatus;
  documentId: string | null;
  showToast: (toast: Omit<ToastState, "open">) => void;
  retryLastAutosave: () => Promise<void>;
}): JSX.Element {
  useAutosaveToast(props);
  return <div data-testid="toast-harness" />;
}

describe("useAutosaveToast — Toast 触发 (AC-2, AC-4)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("autosaveStatus 从 saving 变为 error 时触发 error Toast", () => {
    const showToast = vi.fn();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Auto-save failed",
        variant: "error",
        action: expect.objectContaining({
          label: "Retry",
        }),
      }),
    );
  });

  it("error Toast 的 action 按钮调用 retryLastAutosave", () => {
    const showToast = vi.fn();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    const callArg = showToast.mock.calls[0][0] as Omit<ToastState, "open"> & {
      action?: { onClick: () => void };
    };
    callArg.action?.onClick();
    expect(retryLastAutosave).toHaveBeenCalledTimes(1);
  });

  it("重试成功后触发 success Toast", () => {
    const showToast = vi.fn();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    // Start at saving
    const { rerender } = render(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // Error
    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );
    expect(showToast).toHaveBeenCalledTimes(1);

    // Retrying (saving again)
    rerender(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // Retry succeeds
    rerender(
      <ToastHarness
        autosaveStatus="saved"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    expect(showToast).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Save recovered",
        variant: "success",
      }),
    );
  });
});

describe("useAutosaveToast — 连续失败去重 (AC-5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("同一 documentId 的连续两次 error 仅触发一次 Toast", () => {
    const showToast = vi.fn();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // First error
    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );
    expect(showToast).toHaveBeenCalledTimes(1);

    // Back to saving then error again (same doc)
    rerender(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );
    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // Still only 1 toast
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("切换到新 documentId 后再次失败触发新的 Toast", () => {
    const showToast = vi.fn();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // First doc error
    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-1"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );
    expect(showToast).toHaveBeenCalledTimes(1);

    // Switch to new doc
    rerender(
      <ToastHarness
        autosaveStatus="saving"
        documentId="doc-2"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    // New doc error
    rerender(
      <ToastHarness
        autosaveStatus="error"
        documentId="doc-2"
        showToast={showToast}
        retryLastAutosave={retryLastAutosave}
      />,
    );

    expect(showToast).toHaveBeenCalledTimes(2);
  });
});
