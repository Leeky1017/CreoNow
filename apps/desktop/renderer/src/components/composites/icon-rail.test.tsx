import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconRail } from "./icon-rail";

describe("IconRail", () => {
  // 防回归：IconRail 必须渲染导航区域
  it("renders as a navigation landmark", () => {
    render(<IconRail activeItem="files" onItemSelect={() => {}} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  // 防回归：所有预定义图标按钮必须存在
  it("renders all expected navigation items", () => {
    render(<IconRail activeItem="files" onItemSelect={() => {}} />);
    expect(
      screen.getByRole("button", { name: /search/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /files/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  // 防回归：activeItem 对应按钮必须标记为 selected
  it("marks the active item as pressed", () => {
    render(<IconRail activeItem="files" onItemSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /files/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // 防回归：点击图标按钮必须触发 onItemSelect
  it("calls onItemSelect when a nav item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<IconRail activeItem="files" onItemSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /dashboard/i }));
    expect(onSelect).toHaveBeenCalledWith("dashboard");
  });

  // 防回归：当前激活项不应发送重复 select
  it("does not fire onItemSelect for the already active item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<IconRail activeItem="files" onItemSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /files/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
