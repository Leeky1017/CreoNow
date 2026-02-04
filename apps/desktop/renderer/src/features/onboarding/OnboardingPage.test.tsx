import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { OnboardingPage } from "./OnboardingPage";

describe("OnboardingPage", () => {
  it("renders the onboarding page with logo and title", () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-logo")).toBeInTheDocument();
    expect(screen.getByText("欢迎使用 CreoNow")).toBeInTheDocument();
    expect(screen.getByText("AI 驱动的文字创作 IDE")).toBeInTheDocument();
  });

  it("renders all four feature cards", () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    expect(screen.getByTestId("feature-card-ai-writing")).toBeInTheDocument();
    expect(screen.getByTestId("feature-card-character")).toBeInTheDocument();
    expect(screen.getByTestId("feature-card-knowledge-graph")).toBeInTheDocument();
    expect(screen.getByTestId("feature-card-version-history")).toBeInTheDocument();

    expect(screen.getByText("AI 辅助写作")).toBeInTheDocument();
    expect(screen.getByText("角色管理")).toBeInTheDocument();
    expect(screen.getByText("知识图谱")).toBeInTheDocument();
    expect(screen.getByText("版本历史")).toBeInTheDocument();
  });

  it("renders the start button", () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    expect(screen.getByTestId("onboarding-start")).toBeInTheDocument();
    expect(screen.getByText("开始使用")).toBeInTheDocument();
  });

  it("calls onComplete when start button is clicked", () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    const startButton = screen.getByTestId("onboarding-start");
    fireEvent.click(startButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("displays feature descriptions correctly", () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    expect(
      screen.getByText("智能续写、润色与灵感激发，让创作不再卡顿。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("深度构建角色档案与关系网，保持人设一致性。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("可视化管理世界观与剧情线索，掌控复杂叙事。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("全自动保存，随时回溯创作轨迹，安全无忧。"),
    ).toBeInTheDocument();
  });
});
