import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ScenariosPanel } from "../ScenariosPanel";

const scenarios = [
  {
    id: "novel",
    labelKey: "scenario.novel",
    profileKey: "sidebar.scenarios.profile.novel",
    description: "长线叙事与章节推进",
  },
  {
    id: "script",
    labelKey: "scenario.script",
    profileKey: "sidebar.scenarios.profile.script",
    description: "场次切换与对白节奏",
  },
];

function renderPanel(override: Partial<ComponentProps<typeof ScenariosPanel>> = {}) {
  const onRetry = vi.fn();
  const onSelectScenario = vi.fn();
  render(
    <ScenariosPanel
      activeScenarioId="novel"
      errorMessage={null}
      onRetry={onRetry}
      onSelectScenario={onSelectScenario}
      scenarios={scenarios}
      status="ready"
      {...override}
    />,
  );
  return { onRetry, onSelectScenario };
}

describe("ScenariosPanel", () => {
  it("ready 态渲染列表并支持选择场景", () => {
    const { onSelectScenario } = renderPanel();
    expect(screen.getByTestId("scenarios-list")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("scenario-card-script"));
    expect(onSelectScenario).toHaveBeenCalledWith("script");
  });

  it("搜索无命中时渲染 no-match", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("scenarios-search"), { target: { value: "不存在的场景" } });
    expect(screen.getByTestId("scenarios-no-match")).toBeInTheDocument();
  });

  it("loading 与 error 状态可渲染，并支持重试", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ScenariosPanel
        activeScenarioId="novel"
        errorMessage={null}
        onRetry={() => {}}
        onSelectScenario={() => {}}
        scenarios={scenarios}
        status="loading"
      />,
    );
    expect(screen.getByTestId("scenarios-loading")).toBeInTheDocument();

    rerender(
      <ScenariosPanel
        activeScenarioId="novel"
        errorMessage="failed"
        onRetry={onRetry}
        onSelectScenario={() => {}}
        scenarios={scenarios}
        status="error"
      />,
    );
    const errorState = screen.getByTestId("scenarios-error");
    expect(errorState).toBeInTheDocument();
    fireEvent.click(within(errorState).getByRole("button"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("ready 但无模板时渲染 empty", () => {
    renderPanel({ scenarios: [] });
    expect(screen.getByTestId("scenarios-empty")).toBeInTheDocument();
  });
});
