import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  // 防回归：Button 必须渲染为可交互的 button 元素
  it("renders as a button with correct text", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  // 防回归：点击事件必须正常触发
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // 防回归：disabled 状态必须阻止点击
  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Disabled" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  // 防回归：loading 状态必须禁止交互且有 data-loading 属性
  it("is non-interactive and marked with data-loading when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-loading");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  // 防回归：不同 variant 必须渲染不同视觉样式
  it("applies variant class for destructive", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });

  // 防回归：icon 尺寸按钮必须正确渲染
  it("renders icon size variant", () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Search">
        🔍
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});
