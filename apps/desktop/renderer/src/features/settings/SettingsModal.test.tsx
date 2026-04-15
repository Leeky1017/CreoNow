import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsModal } from "./SettingsModal";

describe("SettingsModal", () => {
  it("关闭态不渲染", () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId("settings-modal")).not.toBeInTheDocument();
  });

  it("默认渲染 profile，并支持切换标签", () => {
    render(<SettingsModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId("settings-modal-panel-profile")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-modal-tab-agent"));
    expect(screen.getByTestId("settings-modal-panel-agent")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-modal-tab-appearance"));
    expect(screen.getByTestId("settings-modal-panel-appearance")).toBeInTheDocument();
  });

  it("点击关闭按钮触发 onClose", () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByTestId("settings-modal-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
