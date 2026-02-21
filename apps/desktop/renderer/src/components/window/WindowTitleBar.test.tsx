import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { WindowTitleBar } from "./WindowTitleBar";
import {
  createProjectStore,
  ProjectStoreProvider,
} from "../../stores/projectStore";

type InvokeMock = ReturnType<typeof vi.fn>;

function createProjectStoreWrapper(children: React.ReactNode): JSX.Element {
  const invoke = vi.fn().mockResolvedValue({ ok: true, data: { items: [] } });
  const store = createProjectStore({
    invoke,
    flushPendingAutosave: async () => undefined,
    getOperatorId: () => "renderer-test",
    createTraceId: () => "trace-test",
  });

  store.setState({
    items: [
      {
        projectId: "p-1",
        name: "Project Polaris",
        rootPath: "/tmp/polaris",
        type: "novel",
        stage: "draft",
        updatedAt: Date.now(),
      },
    ],
    current: {
      projectId: "p-1",
      rootPath: "/tmp/polaris",
    },
  });

  return <ProjectStoreProvider store={store}>{children}</ProjectStoreProvider>;
}

describe("WindowTitleBar", () => {
  let originalCreonow: Window["creonow"];
  let invokeMock: InvokeMock;

  beforeEach(() => {
    originalCreonow = window.creonow;
    invokeMock = vi.fn(async (channel: string) => {
      if (channel === "app:window:getstate") {
        return {
          ok: true,
          data: {
            controlsEnabled: true,
            isMaximized: false,
            isMinimized: false,
            isFullScreen: false,
            platform: "win32",
          },
        };
      }
      return { ok: true, data: {} };
    });
    const typedInvoke = ((channel, payload) =>
      (invokeMock as unknown as (c: string, p: unknown) => Promise<unknown>)(
        channel as string,
        payload,
      )) as NonNullable<Window["creonow"]>["invoke"];

    window.creonow = {
      invoke: typedInvoke,
      stream: undefined,
    };
  });

  afterEach(() => {
    window.creonow = originalCreonow;
  });

  it("shows current project title on supported window controls", async () => {
    render(createProjectStoreWrapper(<WindowTitleBar />));

    await waitFor(() => {
      expect(screen.getByTestId("window-titlebar")).toBeInTheDocument();
    });

    expect(screen.getByText("Project Polaris")).toBeInTheDocument();
  });

  it("invokes window control IPC channels", async () => {
    render(createProjectStoreWrapper(<WindowTitleBar />));

    await waitFor(() => {
      expect(screen.getByTestId("window-titlebar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Minimize" }));
    fireEvent.click(screen.getByRole("button", { name: "Maximize" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("app:window:minimize", {});
      expect(invokeMock).toHaveBeenCalledWith("app:window:togglemaximized", {});
      expect(invokeMock).toHaveBeenCalledWith("app:window:close", {});
    });
  });

  it("hides itself when controls are disabled", async () => {
    invokeMock.mockImplementation(async (channel: string) => {
      if (channel === "app:window:getstate") {
        return {
          ok: true,
          data: {
            controlsEnabled: false,
            isMaximized: false,
            isMinimized: false,
            isFullScreen: false,
            platform: "linux",
          },
        };
      }
      return { ok: true, data: {} };
    });

    render(createProjectStoreWrapper(<WindowTitleBar />));

    await waitFor(() => {
      expect(screen.queryByTestId("window-titlebar")).not.toBeInTheDocument();
    });
  });
});
