import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExportPublishModal } from "../ExportPublishModal";

function renderModal(override: Partial<ComponentProps<typeof ExportPublishModal>> = {}) {
  const onClose = vi.fn();
  const onExport = vi.fn();
  const onModeChange = vi.fn();
  render(
    <ExportPublishModal
      errorMessage={null}
      exporting={false}
      isOpen
      mode="export"
      onClose={onClose}
      onExport={onExport}
      onModeChange={onModeChange}
      resultPath={null}
      {...override}
    />,
  );
  return { onClose, onExport, onModeChange };
}

describe("ExportPublishModal", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) },
    });
  });

  it("关闭态不渲染", () => {
    render(
      <ExportPublishModal
        errorMessage={null}
        exporting={false}
        isOpen={false}
        mode="export"
        onClose={() => {}}
        onExport={() => {}}
        onModeChange={() => {}}
        resultPath={null}
      />,
    );
    expect(screen.queryByTestId("export-modal")).not.toBeInTheDocument();
  });

  it("导出模式可触发格式导出与关闭", () => {
    const { onClose, onExport } = renderModal();
    fireEvent.click(screen.getByTestId("export-format-pdf"));
    expect(onExport).toHaveBeenCalledWith("pdf");

    fireEvent.click(screen.getByTestId("export-modal-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("发布模式可复制预览链接", async () => {
    const { onModeChange } = renderModal({ mode: "publish" });
    expect(screen.getByTestId("publish-mode-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("publish-copy-link"));
    await waitFor(() =>
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://preview.creonow.local/current-project",
      ),
    );
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("导出成功与错误状态可渲染", () => {
    const { rerender } = render(
      <ExportPublishModal
        errorMessage={null}
        exporting={false}
        isOpen
        mode="export"
        onClose={() => {}}
        onExport={() => {}}
        onModeChange={() => {}}
        resultPath="/tmp/demo.docx"
      />,
    );
    expect(screen.getByTestId("export-modal-success")).toBeInTheDocument();

    rerender(
      <ExportPublishModal
        errorMessage="failed"
        exporting={false}
        isOpen
        mode="export"
        onClose={() => {}}
        onExport={() => {}}
        onModeChange={() => {}}
        resultPath={null}
      />,
    );
    expect(screen.getByTestId("export-modal-error")).toBeInTheDocument();
  });
});
