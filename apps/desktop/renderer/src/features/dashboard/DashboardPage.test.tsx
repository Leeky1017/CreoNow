import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./DashboardPage";
import type { Project } from "./mockData";

function makeProjects(): Project[] {
  return [
    { id: "p1", title: "Alpha", type: "novel", updatedAt: 6000 },
    { id: "p2", title: "Beta", type: "novel", updatedAt: 5000 },
    { id: "p3", title: "Gamma", type: "short-collection", updatedAt: 4000 },
    { id: "p4", title: "Delta", type: "screenplay", updatedAt: 3000 },
    { id: "p5", title: "Epsilon", type: "media", updatedAt: 2000 },
    { id: "p6", title: "Zeta", type: "novel", updatedAt: 1000 },
  ];
}

describe("DashboardPage", () => {
  it("recent 筛选仅保留最近 5 个项目（按 updatedAt）", () => {
    render(<DashboardPage projects={makeProjects()} />);

    fireEvent.click(screen.getByTestId("dashboard-filter-recent"));

    expect(screen.getByTestId("dashboard-project-card-p1")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-project-card-p5")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-project-card-p6")).not.toBeInTheDocument();
  });

  it("搜索过滤按项目名生效（大小写不敏感）", () => {
    render(<DashboardPage projects={makeProjects()} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alp" } });

    expect(screen.getByTestId("dashboard-project-card-p1")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-project-card-p2")).not.toBeInTheDocument();
  });

  it("点击项目卡片会触发打开项目回调", () => {
    const onOpenProject = vi.fn();
    render(<DashboardPage projects={makeProjects()} onOpenProject={onOpenProject} />);

    fireEvent.click(screen.getByTestId("dashboard-project-card-p3"));

    expect(onOpenProject).toHaveBeenCalledTimes(1);
    expect(onOpenProject).toHaveBeenCalledWith("p3");
  });

  it("点击新建项目按钮会触发创建回调", () => {
    const onCreateProject = vi.fn();
    render(<DashboardPage projects={makeProjects()} onCreateProject={onCreateProject} />);

    fireEvent.click(screen.getByTestId("dashboard-create-project-btn"));

    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});
