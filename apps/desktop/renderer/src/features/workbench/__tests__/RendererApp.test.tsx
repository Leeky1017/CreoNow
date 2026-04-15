import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/workbench/WorkbenchApp", () => ({
  WorkbenchApp: () => <div data-testid="workbench-app" />,
}));

import { RendererApp } from "@/features/workbench/RendererApp";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function createProjectApi() {
  return {
    getCurrent: vi.fn(async () => ({ ok: false, error: { code: "NOT_FOUND", message: "missing" } })),
    list: vi.fn(async () => ({
      ok: true,
      data: {
        items: [
          {
            projectId: "proj-1",
            name: "暗流",
            rootPath: "/projects/proj-1",
            type: "novel",
            stage: "draft",
            updatedAt: 123,
            archivedAt: null,
          },
        ],
      },
    })),
    setCurrent: vi.fn(async () => ({ ok: true, data: { projectId: "proj-1", rootPath: "/projects/proj-1" } })),
    stats: vi.fn(async () => ({
      ok: true,
      data: {
        total: 1,
        active: 1,
        archived: 0,
        totalWordCount: 1234,
        overallProgressPercent: 56,
        perProject: [{ projectId: "proj-1", wordCount: 1234, targetWordCount: 2200, progressPercent: 56 }],
      },
    })),
    create: vi.fn(async () => ({ ok: true, data: { projectId: "proj-2", rootPath: "/projects/proj-2" } })),
    switchProject: vi.fn(async ({ projectId }) => ({
      ok: true,
      data: { currentProjectId: projectId, switchedAt: "2026-01-01T00:00:00.000Z" },
    })),
  };
}

describe("RendererApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("无当前项目时进入 Dashboard，并可点击项目卡片进入 Workbench", async () => {
    const projectApi = createProjectApi();
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
    expect(projectApi.stats).toHaveBeenCalledTimes(1);
    const projectCard = screen.getByTestId("dashboard-project-card-proj-1");
    expect(screen.getByTestId("dashboard-project-stage-proj-1")).toBeInTheDocument();

    fireEvent.click(projectCard);

    await waitFor(() =>
      expect(projectApi.switchProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-1", fromProjectId: "dashboard" }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });

  it("点击新建项目会创建并切换到新项目", async () => {
    const projectApi = createProjectApi();
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-create-project-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("dashboard-create-project-btn"));

    await waitFor(() => expect(projectApi.create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(projectApi.switchProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-2", fromProjectId: "dashboard" }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });

  it("项目切换进行中会阻止重复触发并展示 loading 反馈", async () => {
    const deferredSwitch = createDeferred<{
      ok: true;
      data: { currentProjectId: string; switchedAt: string };
    }>();
    const projectApi = createProjectApi();
    projectApi.switchProject = vi.fn(() => deferredSwitch.promise);
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-project-card-proj-1")).toBeInTheDocument());
    const projectCard = screen.getByTestId("dashboard-project-card-proj-1");

    fireEvent.click(projectCard);
    fireEvent.click(projectCard);
    fireEvent.click(screen.getByTestId("dashboard-create-project-btn"));

    await waitFor(() => expect(projectApi.switchProject).toHaveBeenCalledTimes(1));
    expect(projectApi.create).not.toHaveBeenCalled();
    expect(screen.getByTestId("dashboard-project-switching")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();

    deferredSwitch.resolve({
      ok: true,
      data: { currentProjectId: "proj-1", switchedAt: "2026-01-01T00:00:00.000Z" },
    });

    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });

  it("项目切换超时时保留可见重试入口，并按原目标重试", async () => {
    const projectApi = createProjectApi();
    projectApi.switchProject = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "PROJECT_SWITCH_TIMEOUT", message: "switch timeout" },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { currentProjectId: "proj-1", switchedAt: "2026-01-01T00:00:00.000Z" },
      });
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-project-card-proj-1")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("dashboard-project-card-proj-1"));

    await waitFor(() => expect(projectApi.switchProject).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("dashboard-error-banner")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-error-retry-btn")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("dashboard-error-retry-btn"));

    await waitFor(() => expect(projectApi.switchProject).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });
});
