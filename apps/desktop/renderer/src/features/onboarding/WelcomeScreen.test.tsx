import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WelcomeScreen } from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("首屏可进入场景选择步骤", () => {
    render(<WelcomeScreen onComplete={() => {}} />);
    expect(screen.getByRole("dialog", { name: "欢迎来到 CreoNow" })).toBeInTheDocument();
    expect(screen.getByTestId("welcome-start-btn")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("welcome-start-btn"));
    expect(screen.getByTestId("welcome-scenario-novel")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-complete-btn")).toBeDisabled();
  });

  it("选择场景后可完成并回传选择结果", () => {
    const onComplete = vi.fn();
    render(<WelcomeScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("welcome-start-btn"));
    const scenarioButton = screen.getByTestId("welcome-scenario-script");
    expect(scenarioButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(scenarioButton);
    expect(scenarioButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("welcome-complete-btn"));

    expect(onComplete).toHaveBeenCalledWith(["script"]);
  });

  it("选择步骤可返回欢迎首屏", () => {
    render(<WelcomeScreen onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId("welcome-start-btn"));
    fireEvent.click(screen.getByText(/返回|Back/i));
    expect(screen.getByTestId("welcome-start-btn")).toBeInTheDocument();
  });
});
