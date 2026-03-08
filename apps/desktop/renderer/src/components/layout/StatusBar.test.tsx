import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { StatusBar } from "./StatusBar";
import { SaveIndicator } from "./SaveIndicator";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";
import { FileStoreProvider, createFileStore } from "../../stores/fileStore";
import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";

function createMockIpc() {
  return {
    invoke: vi.fn(async () => ({
      ok: true,
      data: { items: [], settings: {}, content: "" },
    })),
    on: (): (() => void) => () => {},
  };
}

function renderStatusBarFixture() {
  const ipc = createMockIpc();
  const projectStore = createProjectStore(
    ipc as Parameters<typeof createProjectStore>[0],
  );
  const fileStore = createFileStore(
    ipc as Parameters<typeof createFileStore>[0],
  );
  const editorStore = createEditorStore(
    ipc as Parameters<typeof createEditorStore>[0],
  );

  const view = render(
    <ProjectStoreProvider store={projectStore}>
      <FileStoreProvider store={fileStore}>
        <EditorStoreProvider store={editorStore}>
          <StatusBar />
        </EditorStoreProvider>
      </FileStoreProvider>
    </ProjectStoreProvider>,
  );

  return { view, projectStore, fileStore, editorStore };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("StatusBar", () => {
  it("should show project/document/word-count/time when context is ready", () => {
    const { projectStore, fileStore, editorStore } = renderStatusBarFixture();

    act(() => {
      projectStore.setState({
        current: { projectId: "project-1", rootPath: "/tmp/project-1" },
        items: [
          {
            projectId: "project-1",
            name: "暗流",
            rootPath: "/tmp/project-1",
            updatedAt: 1700000000000,
          },
        ],
      });
    });
    act(() => {
      fileStore.setState({
        currentDocumentId: "doc-1",
        items: [
          {
            documentId: "doc-1",
            title: "第三章",
            status: "draft",
            type: "chapter",
            sortOrder: 0,
            updatedAt: 1700000000000,
          },
        ],
      });
    });
    act(() => {
      editorStore.setState({
        documentId: "doc-1",
        documentCharacterCount: 3250,
        autosaveStatus: "idle",
      });
    });

    expect(screen.getByTestId("status-project-name")).toHaveTextContent("暗流");
    expect(screen.getByTestId("status-document-name")).toHaveTextContent(
      "第三章",
    );
    expect(screen.getByTestId("status-word-count")).toHaveTextContent(
      "3,250 chars",
    );
    expect(screen.getByTestId("editor-autosave-status")).toHaveTextContent("");
    expect(screen.getByTestId("status-current-time").textContent ?? "").toMatch(
      /^\d{2}:\d{2}$/,
    );
  });

  it("should follow autosave state machine: saving -> saved -> idle", () => {
    vi.useFakeTimers();
    const { editorStore } = renderStatusBarFixture();

    act(() => {
      editorStore.setState({ autosaveStatus: "saving" });
    });
    expect(screen.getByTestId("editor-autosave-status")).toHaveTextContent(
      "Saving...",
    );

    act(() => {
      editorStore.setState({ autosaveStatus: "saved" });
    });
    expect(screen.getByTestId("editor-autosave-status")).toHaveTextContent(
      "Saved",
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("editor-autosave-status")).toHaveTextContent("");
  });

  it("should allow retry from error state", () => {
    const { editorStore } = renderStatusBarFixture();
    const retryLastAutosave = vi.fn().mockResolvedValue(undefined);

    act(() => {
      editorStore.setState({
        autosaveStatus: "error",
        retryLastAutosave,
      });
    });

    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveTextContent("Save failed");
    const retryButton = screen.getByRole("button", { name: "Retry save" });
    fireEvent.click(retryButton);

    expect(retryLastAutosave).toHaveBeenCalledTimes(1);
  });
});

describe("SaveIndicator 四态映射 (AC-1, AC-7, AC-10)", () => {
  it("idle 状态下不渲染可见文本", () => {
    render(<SaveIndicator autosaveStatus="idle" onRetry={vi.fn()} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveTextContent("");
    expect(indicator).toHaveAttribute("data-status", "idle");
  });

  it("saving 状态下渲染保存中文案和旋转图标", () => {
    render(<SaveIndicator autosaveStatus="saving" onRetry={vi.fn()} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveTextContent("Saving...");
    expect(indicator).toHaveAttribute("data-status", "saving");
    // Spinner should be aria-hidden
    const spinner = indicator.querySelector("svg[aria-hidden='true']");
    expect(spinner).not.toBeNull();
  });

  it("saved 状态下渲染成功文案", () => {
    render(<SaveIndicator autosaveStatus="saved" onRetry={vi.fn()} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveTextContent("Saved");
    expect(indicator).toHaveAttribute("data-status", "saved");
  });

  it("saved 状态 2 秒后切换回 idle", () => {
    vi.useFakeTimers();
    render(
      <SaveIndicator autosaveStatus="saved" onRetry={vi.fn()} />,
    );
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveAttribute("data-status", "saved");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("editor-autosave-status")).toHaveAttribute(
      "data-status",
      "idle",
    );
    expect(screen.getByTestId("editor-autosave-status")).toHaveTextContent("");
  });

  it("error 状态下渲染错误指示器，可点击触发重试", () => {
    const onRetry = vi.fn();
    render(<SaveIndicator autosaveStatus="error" onRetry={onRetry} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveTextContent("Save failed");
    expect(indicator).toHaveAttribute("data-status", "error");

    const retryButton = screen.getByRole("button", { name: "Retry save" });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("error 重试区域支持键盘 Enter 触发", () => {
    const onRetry = vi.fn();
    render(<SaveIndicator autosaveStatus="error" onRetry={onRetry} />);
    const retryButton = screen.getByRole("button", { name: "Retry save" });
    fireEvent.keyDown(retryButton, { key: "Enter" });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("SaveIndicator 无障碍 (AC-8)", () => {
  it("保存指示区域具有 role=status 和 aria-live=polite", () => {
    render(<SaveIndicator autosaveStatus="idle" onRetry={vi.fn()} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    expect(indicator).toHaveAttribute("role", "status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
  });

  it("error 态重试具有 role=button 和 aria-label", () => {
    render(<SaveIndicator autosaveStatus="error" onRetry={vi.fn()} />);
    const retryButton = screen.getByRole("button", { name: "Retry save" });
    expect(retryButton).toHaveAttribute("aria-label", "Retry save");
  });

  it("saving 态旋转图标具有 aria-hidden=true", () => {
    render(<SaveIndicator autosaveStatus="saving" onRetry={vi.fn()} />);
    const indicator = screen.getByTestId("editor-autosave-status");
    const svg = indicator.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
