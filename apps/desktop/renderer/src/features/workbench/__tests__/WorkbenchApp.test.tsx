import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EditorBridge, EditorBridgeOptions } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { WorkbenchApp } from "@/features/workbench/WorkbenchApp";
import {
  GLOBAL_ERROR_TOAST_EVENT,
  installGlobalErrorHandlers,
  resetGlobalErrorToastStateForTests,
} from "@/lib/globalErrorBridge";
import type { LegacyCreonowBridge, PreloadApi } from "@/lib/preloadApi";

let bridgeOptions: EditorBridgeOptions | undefined;
let globalErrorCleanup: (() => void) | null = null;

const bridgeMock: EditorBridge = {
  destroy: vi.fn(),
  focus: vi.fn(),
  getContent: vi.fn(() => ({ type: "doc" })),
  getSelection: vi.fn(() => null),
  getTextContent: vi.fn(() => "风从北方来"),
  mount: vi.fn(),
  replaceSelection: vi.fn(() => ({ ok: true as const })),
  setContent: vi.fn(),
  view: null,
};

vi.mock("@/editor/bridge", () => ({
  createEditorBridge: (options: EditorBridgeOptions = {}) => {
    bridgeOptions = options;
    return bridgeMock;
  },
}));

function createSelection(text: string, from = 1): SelectionRef {
  return {
    from,
    to: from + text.length,
    text,
    selectionTextHash: `${text}-hash`,
  };
}

function createDeferred<TResult>() {
  let resolvePromise!: (value: TResult | PromiseLike<TResult>) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<TResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject: rejectPromise,
    resolve: resolvePromise,
  };
}

function installLegacyLogBridge(invoke = vi.fn(async () => ({ ok: true as const, data: { logged: true as const } }))) {
  window.creonow = {
    api: window.api as PreloadApi,
    invoke: invoke as LegacyCreonowBridge["invoke"],
    stream: {
      registerAiStreamConsumer: () => ({ ok: true, data: { subscriptionId: "sub-1" } }),
      releaseAiStreamConsumer: () => undefined,
    },
  };

  return invoke;
}

function createApiMock(): PreloadApi {
  return {
    ai: {
      runSkill: vi.fn(async () => ({ ok: true, data: { executionId: "exec-1", runId: "run-1", outputText: "改写后的句子" } })),
      submitSkillFeedback: vi.fn(async () => ({ ok: true, data: { recorded: true } })),
    },
    file: {
      createDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-2" } })),
      getCurrentDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1" } })),
      listDocuments: vi.fn(async () => ({ ok: true, data: { items: [{ documentId: "doc-1", title: "第一章", type: "chapter", status: "draft", sortOrder: 0, updatedAt: 1 }] } })),
      readDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1", projectId: "project-1", title: "第一章", type: "chapter", status: "draft", sortOrder: 0, contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }), contentText: "风从北方来", contentMd: "", contentHash: "hash", createdAt: 1, updatedAt: 1 } })),
      saveDocument: vi.fn(async () => ({ ok: true, data: { updatedAt: 2, contentHash: "hash-2" } })),
      setCurrentDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1" } })),
    },
    project: {
      create: vi.fn(async () => ({ ok: true, data: { projectId: "project-1", rootPath: "/workspace/project-1" } })),
      getCurrent: vi.fn(async () => ({ ok: true, data: { projectId: "project-1", rootPath: "/workspace/project-1" } })),
      list: vi.fn(async () => ({ ok: true, data: { items: [{ projectId: "project-1", name: "默认项目", rootPath: "/workspace/project-1", updatedAt: 1 }] } })),
      setCurrent: vi.fn(async () => ({ ok: true, data: { projectId: "project-1", rootPath: "/workspace/project-1" } })),
    },
    version: {
      listSnapshots: vi.fn(async () => ({ ok: true, data: { items: [] } })),
    },
  } as PreloadApi;
}

describe("WorkbenchApp", () => {
  afterEach(() => {
    globalErrorCleanup?.();
    globalErrorCleanup = null;
    resetGlobalErrorToastStateForTests();
    vi.useRealTimers();
    delete window.creonow;
  });

  beforeEach(() => {
    bridgeOptions = undefined;
    vi.clearAllMocks();
    window.localStorage.clear();
    window.api = createApiMock();
  });

  it("keeps the AI reference sticky until clear, replacement, send, and new chat", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const firstSelection = createSelection("第一段风从北方来。", 1);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(firstSelection);
    });

    expect(await screen.findByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第一段风从北方来。");

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(null);
    });
    expect(screen.getByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第一段风从北方来。");

    const replacementSelection = createSelection("第二段已经接管上下文。", 24);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(replacementSelection);
    });
    expect(screen.getByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第二段已经接管上下文。");

    fireEvent.click(screen.getByRole("button", { name: "清除引用" }));
    expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(replacementSelection);
    });
    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({ selection: replacementSelection }));
    });
    expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("第三段在新对话前挂住。", 48));
    });
    expect(await screen.findByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第三段在新对话前挂住。");

    fireEvent.click(screen.getByRole("button", { name: "新对话" }));
    expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();
    expect(screen.queryByText("改写后的句子")).toBeNull();
  });

  it("submits the AI request on Enter and clears the sticky selection", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const selection = createSelection("按下回车后也要消费选区。", 12);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(selection);
    });

    const textarea = screen.getByLabelText("指令");
    fireEvent.change(textarea, { target: { value: "请直接润色" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        input: expect.stringContaining("请直接润色"),
        selection,
      }));
    });
    expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();
  });

  it("serializes an in-flight autosave behind accept so stale content cannot overwrite the accepted save", async () => {
    window.api = createApiMock();

    const autosaveResult = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const acceptResult = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveResult.promise)
      .mockImplementationOnce(async () => acceptResult.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    const staleDraft = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受前的旧草稿" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("已起跑 autosave 完成后也不能盖掉 accept。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(staleDraft);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(staleDraft),
    }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      autosaveResult.resolve({
        ok: false,
        error: { code: "DB_ERROR", message: "stale autosave failed" },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(2);
    expect(saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      actor: "ai",
      reason: "ai-accept",
      contentJson: JSON.stringify(acceptedDocument),
    }));

    await act(async () => {
      acceptResult.resolve({ ok: true, data: { updatedAt: 3, contentHash: "hash-3" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("改写后的句子")).toBeNull();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
    expect(screen.queryByText("数据层暂时不可用，请稍后重试。")).toBeNull();
  });

  it("preserves autosave protection for real edits made while accept is still running", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };
    const continuedDraft = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受过程中继续写下去" }] }],
    };

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("accept 期间继续输入也必须保留 autosave 保护。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "ai",
      reason: "ai-accept",
      contentJson: JSON.stringify(acceptedDocument),
    }));

    await act(async () => {
      currentContent = continuedDraft;
      bridgeOptions?.onDocumentChange?.(continuedDraft);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      acceptResult.resolve({ ok: true, data: { updatedAt: 3, contentHash: "hash-3" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(2);
    expect(saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(continuedDraft),
    }));
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });


  it("does not roll back when users edit after accept and later return to the accepted content", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: false;
      error: { code: "DB_ERROR"; message: string };
    }>();
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };
    const continuedDraft = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受失败前先改成别的" }] }],
    };

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.mocked(bridgeMock.setContent).mockClear();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("接受失败前回到同值也不能被误回滚。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      currentContent = continuedDraft;
      bridgeOptions?.onDocumentChange?.(continuedDraft);
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "ai",
      reason: "ai-accept",
      contentJson: JSON.stringify(acceptedDocument),
    }));

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(bridgeMock.setContent).not.toHaveBeenCalled();
    expect(saveDocument).toHaveBeenCalledTimes(2);
    expect(saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(acceptedDocument),
    }));
    expect(screen.getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("does not roll back newer user edits when accept save fails after later typing", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: false;
      error: { code: "DB_ERROR"; message: string };
    }>();
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };
    const continuedDraft = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受失败时继续写下去" }] }],
    };

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.mocked(bridgeMock.setContent).mockClear();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("accept 保存失败时，继续输入不能被回滚。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      currentContent = continuedDraft;
      bridgeOptions?.onDocumentChange?.(continuedDraft);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "ai",
      reason: "ai-accept",
      contentJson: JSON.stringify(acceptedDocument),
    }));

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(bridgeMock.setContent).not.toHaveBeenCalled();
    expect(saveDocument).toHaveBeenCalledTimes(2);
    expect(saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(continuedDraft),
    }));
    expect(screen.getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("keeps the accept flow saved but surfaces feedback failure when submitSkillFeedback returns ok:false", async () => {
    window.api = createApiMock();
    window.api.ai.submitSkillFeedback = vi.fn(async () => ({
      ok: false as const,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof window.api.ai.submitSkillFeedback;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("接受建议后应该仍然视为已保存。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(screen.queryByText("改写后的句子")).toBeNull();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledWith(expect.objectContaining({
      actor: "ai",
      reason: "ai-accept",
    }));
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
  });

  it("keeps the preview visible when reject feedback returns ok:false", async () => {
    window.api = createApiMock();
    window.api.ai.submitSkillFeedback = vi.fn(async () => ({
      ok: false as const,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof window.api.ai.submitSkillFeedback;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("拒绝建议时反馈失败不能假装成功。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "拒绝" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
    expect(screen.getByText("改写后的句子")).toBeInTheDocument();
  });

  it("restores persisted shell layout and supports resizing with clamp and reset", async () => {
    window.localStorage.setItem("creonow.layout.activeLeftPanel", "knowledgeGraph");
    window.localStorage.setItem("creonow.layout.sidebarWidth", "300");
    window.localStorage.setItem("creonow.layout.activePanelTab", "info");
    window.localStorage.setItem("creonow.layout.panelWidth", "360");

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const frame = screen.getByTestId("workbench-frame");
    expect(frame.style.getPropertyValue("--left-sidebar-width")).toBe("300px");
    expect(frame.style.getPropertyValue("--right-panel-width")).toBe("360px");
    expect(screen.getByRole("heading", { name: "知识图谱" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "信息" })).toHaveAttribute("aria-selected", "true");

    const leftHandle = screen.getByRole("separator", { name: "调整左侧边栏宽度" });
    fireEvent.mouseDown(leftHandle, { button: 0, clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 700 });
    expect(frame.style.getPropertyValue("--left-sidebar-width")).toBe("400px");
    fireEvent.mouseUp(window);
    await waitFor(() => {
      expect(window.localStorage.getItem("creonow.layout.sidebarWidth")).toBe("400");
    });

    fireEvent.doubleClick(leftHandle);
    await waitFor(() => {
      expect(frame.style.getPropertyValue("--left-sidebar-width")).toBe("240px");
      expect(window.localStorage.getItem("creonow.layout.sidebarWidth")).toBe("240");
    });

    const rightHandle = screen.getByRole("separator", { name: "调整右侧面板宽度" });
    fireEvent.mouseDown(rightHandle, { button: 0, clientX: 900 });
    fireEvent.mouseMove(window, { clientX: 1200 });
    expect(frame.style.getPropertyValue("--right-panel-width")).toBe("280px");
    fireEvent.mouseUp(window);
    await waitFor(() => {
      expect(window.localStorage.getItem("creonow.layout.panelWidth")).toBe("280");
    });

    fireEvent.doubleClick(rightHandle);
    await waitFor(() => {
      expect(frame.style.getPropertyValue("--right-panel-width")).toBe("320px");
      expect(window.localStorage.getItem("creonow.layout.panelWidth")).toBe("320");
    });
  });

  it("shows a user-visible toast when cn:global-error-toast is dispatched", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      window.dispatchEvent(new CustomEvent(GLOBAL_ERROR_TOAST_EVENT, {
        detail: {
          source: "error",
          name: "WindowError",
          message: "boom",
          timestamp: new Date(0).toISOString(),
        },
      }));
    });

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("工作台发生异常");
    expect(toast).toHaveTextContent("系统已记录该异常，请稍后再试或重新执行刚才的操作。");
  });

  it("replays a pre-mount window.error into a visible toast after the app mounts", async () => {
    const invoke = installLegacyLogBridge();
    globalErrorCleanup = installGlobalErrorHandlers();

    await act(async () => {
      window.dispatchEvent(new ErrorEvent("error", {
        error: new Error("startup boom"),
        message: "startup boom",
      }));
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "app:renderer:logerror",
        expect.objectContaining({
          source: "error",
          message: "startup boom",
        }),
      );
    });

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("工作台发生异常");
  });

  it("replays a pre-mount unhandled rejection into a visible toast after the app mounts", async () => {
    const invoke = installLegacyLogBridge();
    globalErrorCleanup = installGlobalErrorHandlers();

    const event = new Event("unhandledrejection") as Event & { reason: unknown };
    Object.defineProperty(event, "reason", { value: new Error("startup rejection") });
    await act(async () => {
      window.dispatchEvent(event);
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "app:renderer:logerror",
        expect.objectContaining({
          source: "unhandledrejection",
          message: "startup rejection",
        }),
      );
    });

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("工作台发生异常");
  });

  it("logs unhandled rejections and surfaces a visible global error toast", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const invoke = installLegacyLogBridge();
    globalErrorCleanup = installGlobalErrorHandlers();

    const event = new Event("unhandledrejection") as Event & { reason: unknown };
    Object.defineProperty(event, "reason", { value: new Error("preview exploded") });
    await act(async () => {
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "app:renderer:logerror",
        expect.objectContaining({
          source: "unhandledrejection",
          message: "preview exploded",
        }),
      );
    });

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("工作台发生异常");
  });

  it("deduplicates duplicate window.error toasts while preserving both log entries", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const invoke = installLegacyLogBridge();
    let now = 1_700_000_000_000;
    globalErrorCleanup = installGlobalErrorHandlers({ now: () => now });

    await act(async () => {
      window.dispatchEvent(new ErrorEvent("error", { error: new Error("same boom"), message: "same boom" }));
      now += 500;
      window.dispatchEvent(new ErrorEvent("error", { error: new Error("same boom"), message: "same boom" }));
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findAllByText("工作台发生异常")).toHaveLength(1);
  });

  it("implements the workbench shell icon order, sidebar toggle, right tabs, and panel collapse", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    const iconRail = screen.getByLabelText("CreoNow 工作台");
    const railButtons = within(iconRail).getAllByRole("button");
    expect(railButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "文件",
      "搜索",
      "大纲",
      "历史版本",
      "记忆",
      "人物",
      "知识图谱",
      "设置",
    ]);
    expect(screen.getByRole("button", { name: "文件" })).toHaveClass("rail-button--active");

    fireEvent.click(screen.getByRole("button", { name: "文件" }));
    expect(screen.queryByLabelText("左侧边栏")).toBeNull();
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "知识图谱" }));
    expect(await screen.findByLabelText("左侧边栏")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "知识图谱" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "知识图谱" })).toHaveClass("rail-button--active");
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe("knowledgeGraph");

    fireEvent.click(screen.getByRole("tab", { name: "信息" }));
    expect(screen.getByRole("heading", { name: "信息" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "历史记录" })).toBeNull();
    expect(screen.queryByRole("button", { name: "新对话" })).toBeNull();
    expect(window.localStorage.getItem("creonow.layout.activePanelTab")).toBe("info");

    fireEvent.click(screen.getByRole("tab", { name: "质量" }));
    expect(screen.getByRole("heading", { name: "质量" })).toBeInTheDocument();
    expect(window.localStorage.getItem("creonow.layout.activePanelTab")).toBe("quality");

    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(screen.queryByLabelText("右侧面板")).toBeNull();
    expect(screen.getByRole("button", { name: "打开 AI 面板" })).toBeInTheDocument();
    expect(window.localStorage.getItem("creonow.layout.panelCollapsed")).toBe("true");

    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(await screen.findByLabelText("右侧面板")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "AI" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新对话" })).toBeInTheDocument();
    expect(window.localStorage.getItem("creonow.layout.activePanelTab")).toBe("ai");
    expect(window.localStorage.getItem("creonow.layout.panelCollapsed")).toBe("false");
  });
});
