import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Shell } from "./shell";

describe("Shell", () => {
  // 防回归：Shell 必须渲染包含 IconRail 的布局
  it("renders layout with navigation and main content area", () => {
    render(<Shell>Content here</Shell>);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  // 防回归：children 必须渲染在 main 区域
  it("renders children in the main content area", () => {
    render(
      <Shell>
        <p>Test Content</p>
      </Shell>,
    );
    expect(screen.getByRole("main")).toHaveTextContent("Test Content");
  });
});
