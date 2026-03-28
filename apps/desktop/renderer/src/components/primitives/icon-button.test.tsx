import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button";

const MockIcon = () => <svg data-testid="mock-icon" />;

describe("IconButton", () => {
  // 防回归：IconButton 必须渲染为有 aria-label 的 button
  it("renders as a button with aria-label", () => {
    render(<IconButton icon={<MockIcon />} label="Search" />);
    expect(
      screen.getByRole("button", { name: "Search" }),
    ).toBeInTheDocument();
  });

  // 防回归：点击事件必须触发
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton icon={<MockIcon />} label="Search" onClick={onClick} />,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // 防回归：selected 状态必须通过 aria-pressed 表达
  it("exposes selected state via aria-pressed", () => {
    render(<IconButton icon={<MockIcon />} label="Files" selected />);
    expect(screen.getByRole("button", { name: "Files" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // 防回归：disabled 状态必须阻止交互
  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton
        icon={<MockIcon />}
        label="Search"
        disabled
        onClick={onClick}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  // 防回归：loading 状态必须有 data-loading 标记
  it("marks loading state with data-loading", () => {
    render(<IconButton icon={<MockIcon />} label="Loading" loading />);
    expect(screen.getByRole("button")).toHaveAttribute("data-loading");
  });
});
