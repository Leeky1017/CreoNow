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

function formatWorkbenchTimestamp(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
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
      confirmSkill: vi.fn(async ({ executionId, action }) => ({
        ok: true,
        data: {
          executionId,
          runId: "run-1",
          status: action === "accept" ? "completed" : "rejected",
          outputText: "改写后的句子",
        },
      })),
      cancelSkill: vi.fn(async () => ({ ok: true, data: { canceled: true } })),
      runSkill: vi.fn(async () => ({ ok: true, data: { executionId: "exec-1", runId: "run-1", status: "preview" as const, previewId: "exec-1", outputText: "改写后的句子" } })),
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
    await waitFor(() => {
      expect(screen.getByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第一段风从北方来。");
    });

    const replacementSelection = createSelection("第二段已经接管上下文。", 24);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(replacementSelection);
    });
    await waitFor(() => {
      expect(screen.getByRole("note", { name: "引用自编辑器" })).toHaveTextContent("第二段已经接管上下文。");
    });

    fireEvent.click(screen.getByRole("button", { name: "清除引用" }));
    await waitFor(() => {
      expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();
    });

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
    await waitFor(() => {
      expect(screen.queryByRole("note", { name: "引用自编辑器" })).toBeNull();
      expect(screen.queryByText("改写后的句子")).toBeNull();
    });
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
      data: { executionId: string; runId: string; status: "completed"; outputText: string };
    }>();
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveResult.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;
    window.api.ai.confirmSkill = vi.fn(async () => acceptResult.promise) as typeof window.api.ai.confirmSkill;

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

    expect(window.api.ai.confirmSkill).toHaveBeenCalledTimes(1);
    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
    });

    await act(async () => {
      acceptResult.resolve({
        ok: true,
        data: { executionId: "exec-1", runId: "run-1", status: "completed", outputText: "改写后的句子" },
      });
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
      data: { executionId: string; runId: string; status: "completed"; outputText: string };
    }>();
    const saveDocument = vi.fn()
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;
    window.api.ai.confirmSkill = vi.fn(async () => acceptResult.promise) as typeof window.api.ai.confirmSkill;

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

    expect(window.api.ai.confirmSkill).toHaveBeenCalledTimes(1);
    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
    });

    await act(async () => {
      currentContent = continuedDraft;
      bridgeOptions?.onDocumentChange?.(continuedDraft);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(0);

    await act(async () => {
      acceptResult.resolve({
        ok: true,
        data: { executionId: "exec-1", runId: "run-1", status: "completed", outputText: "改写后的句子" },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
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
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;
    window.api.ai.confirmSkill = vi.fn(async () => acceptResult.promise) as typeof window.api.ai.confirmSkill;

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

    expect(window.api.ai.confirmSkill).toHaveBeenCalledTimes(1);
    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
    });

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(bridgeMock.setContent).not.toHaveBeenCalled();
    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(acceptedDocument),
    }));
    expect(screen.queryByText("数据层暂时不可用，请稍后重试。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存失败" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "接受" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒绝" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("clears stale accept failure UI after later edits invalidate the accept path", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: false;
      error: { code: "DB_ERROR"; message: string };
    }>();
    const saveDocument = vi.fn()
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 4, contentHash: "hash-4" } });
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;
    window.api.ai.confirmSkill = vi.fn(async () => acceptResult.promise) as typeof window.api.ai.confirmSkill;

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

    expect(window.api.ai.confirmSkill).toHaveBeenCalledTimes(1);
    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
    });

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(bridgeMock.setContent).not.toHaveBeenCalled();
    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(continuedDraft),
    }));
    expect(screen.queryByText("数据层暂时不可用，请稍后重试。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存失败" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "接受" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒绝" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("clears accept-scoped failure UI when resetting the AI conversation", async () => {
    window.api = createApiMock();

    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };

    const confirmSkill = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "DB_ERROR", message: "accept save failed" } });
    window.api.ai.confirmSkill = confirmSkill as typeof window.api.ai.confirmSkill;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.replaceSelection).mockImplementation(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("reset AI 会话必须清掉旧 accept 失败残留。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(confirmSkill).toHaveBeenCalledWith({ executionId: "exec-1", action: "accept" });
    expect(await screen.findByText("数据层暂时不可用，请稍后重试。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存失败" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接受" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒绝" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新对话" }));

    expect(screen.queryByText("数据层暂时不可用，请稍后重试。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存失败" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "接受" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒绝" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "就绪" })).toBeInTheDocument();
  });

  it("retries the failed accept save from the status bar through the accept controller", async () => {
    window.api = createApiMock();

    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "改写后的句子" }] }],
    };

    const confirmSkill = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "DB_ERROR", message: "accept save failed" } })
      .mockResolvedValueOnce({ ok: true as const, data: { executionId: "exec-1", runId: "run-1", status: "completed", outputText: "改写后的句子" } });
    window.api.ai.confirmSkill = confirmSkill as typeof window.api.ai.confirmSkill;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });
    vi.mocked(bridgeMock.replaceSelection).mockImplementation(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("accept 保存失败后，状态栏必须重试 accept 本身。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(confirmSkill).toHaveBeenCalledTimes(1);
    expect(confirmSkill).toHaveBeenNthCalledWith(1, { executionId: "exec-1", action: "accept" });
    expect(screen.getByRole("button", { name: "保存失败" })).toBeInTheDocument();
    expect(screen.getAllByText("数据层暂时不可用，请稍后重试。").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(confirmSkill).toHaveBeenCalledTimes(2);
    expect(confirmSkill).toHaveBeenNthCalledWith(2, { executionId: "exec-1", action: "accept" });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
    expect(screen.queryByText("改写后的句子")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("flushes a pending autosave before switching documents so doc A draft persists and doc B UI stays untouched", async () => {
    window.api = createApiMock();

    const docAUpdatedAt = Date.UTC(2024, 0, 1, 8, 0);
    const docBUpdatedAt = Date.UTC(2024, 0, 2, 9, 30);
    const flushedUpdatedAt = Date.UTC(2024, 0, 4, 10, 45);
    const autosaveFlush = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: docAUpdatedAt,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: docBUpdatedAt,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 尚未落盘的草稿" }] }],
    };
    const docBContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-2"
        ? {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(docBContent),
          contentText: "文档 B 当前内容",
          contentMd: "",
          contentHash: "hash-b",
          createdAt: docBUpdatedAt,
          updatedAt: docBUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: docAUpdatedAt,
          updatedAt: docAUpdatedAt,
        },
    })) as typeof window.api.file.readDocument;
    const saveDocument = vi.fn(async () => autosaveFlush.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));
    expect(window.api.file.setCurrentDocument).not.toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-2" }));
    expect(screen.queryByRole("heading", { name: "第二章" })).toBeNull();

    await act(async () => {
      autosaveFlush.resolve({ ok: true, data: { updatedAt: flushedUpdatedAt, contentHash: "hash-doc-a-flushed" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(await screen.findByRole("heading", { name: "第二章" })).toBeInTheDocument();
    expect(currentContent).toEqual(docBContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(docBUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByText(formatWorkbenchTimestamp(flushedUpdatedAt))).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("flushes a pending autosave before creating a document so doc A draft persists and the new document UI stays untouched", async () => {
    window.api = createApiMock();

    const docAUpdatedAt = Date.UTC(2024, 0, 1, 8, 0);
    const createdDocumentUpdatedAt = Date.UTC(2024, 0, 3, 11, 15);
    const flushedUpdatedAt = Date.UTC(2024, 0, 4, 10, 45);
    const autosaveFlush = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: docAUpdatedAt,
    } as const;
    const createdDocument = {
      documentId: "doc-3",
      title: "新建文档",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: createdDocumentUpdatedAt,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 尚未落盘的草稿" }] }],
    };
    const createdDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "新建文档内容" }] }],
    };

    window.api.file.createDocument = vi.fn(async () => ({ ok: true, data: { documentId: "doc-3" } })) as typeof window.api.file.createDocument;
    window.api.file.listDocuments = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [firstDocument] } })
      .mockResolvedValue({ ok: true, data: { items: [firstDocument, createdDocument] } }) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-3"
        ? {
          documentId: "doc-3",
          projectId: "project-1",
          title: "新建文档",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(createdDocumentContent),
          contentText: "新建文档内容",
          contentMd: "",
          contentHash: "hash-c",
          createdAt: createdDocumentUpdatedAt,
          updatedAt: createdDocumentUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: docAUpdatedAt,
          updatedAt: docAUpdatedAt,
        },
    })) as typeof window.api.file.readDocument;
    const saveDocument = vi.fn(async () => autosaveFlush.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));
    expect(window.api.file.createDocument).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "新建文档" })).toBeNull();

    await act(async () => {
      autosaveFlush.resolve({ ok: true, data: { updatedAt: flushedUpdatedAt, contentHash: "hash-doc-a-flushed" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(await screen.findByRole("heading", { name: "新建文档" })).toBeInTheDocument();
    expect(currentContent).toEqual(createdDocumentContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(createdDocumentUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByText(formatWorkbenchTimestamp(flushedUpdatedAt))).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("waits for an in-flight autosave before switching documents so doc A finishes saving and doc B UI stays untouched", async () => {
    window.api = createApiMock();

    const docAUpdatedAt = Date.UTC(2024, 0, 1, 8, 0);
    const docBUpdatedAt = Date.UTC(2024, 0, 2, 9, 30);
    const flushedUpdatedAt = Date.UTC(2024, 0, 4, 10, 45);
    const autosaveInFlight = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: docAUpdatedAt,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: docBUpdatedAt,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 定时器已触发，保存仍在路上" }] }],
    };
    const docBContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-2"
        ? {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(docBContent),
          contentText: "文档 B 当前内容",
          contentMd: "",
          contentHash: "hash-b",
          createdAt: docBUpdatedAt,
          updatedAt: docBUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: docAUpdatedAt,
          updatedAt: docAUpdatedAt,
        },
    })) as typeof window.api.file.readDocument;
    const saveDocument = vi.fn(async () => autosaveInFlight.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.setCurrentDocument).not.toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-2" }));
    expect(screen.queryByRole("heading", { name: "第二章" })).toBeNull();
    expect(currentContent).toEqual(docAEditedContent);

    await act(async () => {
      autosaveInFlight.resolve({ ok: true, data: { updatedAt: flushedUpdatedAt, contentHash: "hash-doc-a-flushed" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(await screen.findByRole("heading", { name: "第二章" })).toBeInTheDocument();
    expect(currentContent).toEqual(docBContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(docBUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByText(formatWorkbenchTimestamp(flushedUpdatedAt))).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("waits for an in-flight autosave before creating a document so doc A finishes saving and the new document UI stays untouched", async () => {
    window.api = createApiMock();

    const docAUpdatedAt = Date.UTC(2024, 0, 1, 8, 0);
    const createdDocumentUpdatedAt = Date.UTC(2024, 0, 3, 11, 15);
    const flushedUpdatedAt = Date.UTC(2024, 0, 4, 10, 45);
    const autosaveInFlight = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: docAUpdatedAt,
    } as const;
    const createdDocument = {
      documentId: "doc-3",
      title: "新建文档",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: createdDocumentUpdatedAt,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 定时器已触发，创建前仍要等它落盘" }] }],
    };
    const createdDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "新建文档内容" }] }],
    };

    window.api.file.createDocument = vi.fn(async () => ({ ok: true, data: { documentId: "doc-3" } })) as typeof window.api.file.createDocument;
    window.api.file.listDocuments = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [firstDocument] } })
      .mockResolvedValue({ ok: true, data: { items: [firstDocument, createdDocument] } }) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-3"
        ? {
          documentId: "doc-3",
          projectId: "project-1",
          title: "新建文档",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(createdDocumentContent),
          contentText: "新建文档内容",
          contentMd: "",
          contentHash: "hash-c",
          createdAt: createdDocumentUpdatedAt,
          updatedAt: createdDocumentUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: docAUpdatedAt,
          updatedAt: docAUpdatedAt,
        },
    })) as typeof window.api.file.readDocument;
    const saveDocument = vi.fn(async () => autosaveInFlight.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);
    expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.createDocument).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "新建文档" })).toBeNull();
    expect(currentContent).toEqual(docAEditedContent);

    await act(async () => {
      autosaveInFlight.resolve({ ok: true, data: { updatedAt: flushedUpdatedAt, contentHash: "hash-doc-a-flushed" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(await screen.findByRole("heading", { name: "新建文档" })).toBeInTheDocument();
    expect(currentContent).toEqual(createdDocumentContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(createdDocumentUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByText(formatWorkbenchTimestamp(flushedUpdatedAt))).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("blocks document switching when an in-flight autosave fails so doc A loss is surfaced instead of dropped as stale", async () => {
    window.api = createApiMock();

    const autosaveInFlight = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A in-flight autosave 失败必须阻断切换" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    const saveDocument = vi.fn(async () => autosaveInFlight.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.setCurrentDocument).not.toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-2" }));

    await act(async () => {
      autosaveInFlight.resolve({ ok: false, error: { code: "DB_ERROR", message: "autosave failed before switch" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(screen.getByRole("heading", { name: "第一章" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "第二章" })).toBeNull();
    expect(currentContent).toEqual(docAEditedContent);
    expect(screen.getAllByText("数据层暂时不可用，请稍后重试。").length).toBeGreaterThan(0);
  });

  it("blocks document creation when an in-flight autosave fails so doc A loss is surfaced instead of dropped as stale", async () => {
    window.api = createApiMock();

    const autosaveInFlight = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A in-flight autosave 失败必须阻断新建" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument] } })) as typeof window.api.file.listDocuments;
    const saveDocument = vi.fn(async () => autosaveInFlight.promise);
    window.api.file.saveDocument = saveDocument as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(saveDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.createDocument).not.toHaveBeenCalled();

    await act(async () => {
      autosaveInFlight.resolve({ ok: false, error: { code: "DB_ERROR", message: "autosave failed before create" } });
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(screen.getByRole("heading", { name: "第一章" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "新建文档" })).toBeNull();
    expect(currentContent).toEqual(docAEditedContent);
    expect(screen.getAllByText("数据层暂时不可用，请稍后重试。").length).toBeGreaterThan(0);
  });

  it("clears the blocked switch autosave alert after the authoritative retry succeeds", async () => {
    window.api = createApiMock();

    const autosaveInFlight = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "blocked switch 后旧警报必须随着重试成功一起熄灭" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveInFlight.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 9, contentHash: "hash-doc-a-retried" } }) as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    const aiPreviewPanel = screen.getByRole("region", { name: "AI 预览" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      autosaveInFlight.resolve({ ok: false, error: { code: "DB_ERROR", message: "autosave failed before switch" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(within(aiPreviewPanel).getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));
    expect(within(aiPreviewPanel).queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("clears the blocked create autosave alert after the authoritative retry succeeds", async () => {
    window.api = createApiMock();

    const autosaveInFlight = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "blocked create 后旧警报必须随着重试成功一起熄灭" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveInFlight.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 10, contentHash: "hash-doc-a-create-retried" } }) as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    const aiPreviewPanel = screen.getByRole("region", { name: "AI 预览" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      autosaveInFlight.resolve({ ok: false, error: { code: "DB_ERROR", message: "autosave failed before create" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(within(aiPreviewPanel).getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));
    expect(within(aiPreviewPanel).queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
  });

  it("shows the saved badge for 2 seconds after autosave succeeds, then returns to idle on the same document", async () => {
    window.api = createApiMock();

    const editedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "自动保存成功后应在 2 秒后回到空闲" }] }],
    };

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(editedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    vi.useRealTimers();

    expect(screen.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已保存" })).toBeNull();
  });

  it("cancels the previous saved decay when a newer save succeeds so the latest badge keeps its own 2 second window", async () => {
    window.api = createApiMock();

    const firstEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "第一次保存" }] }],
    };
    const secondEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "第二次保存应重置倒计时" }] }],
    };

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(firstEditedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
      bridgeOptions?.onDocumentChange?.(secondEditedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    vi.useRealTimers();

    expect(screen.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已保存" })).toBeNull();
  });

  it("retries the failed autosave from the status bar and returns to idle after the success decay", async () => {
    window.api = createApiMock();

    const retriedUpdatedAt = Date.UTC(2024, 0, 4, 9, 45);
    const editedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "状态栏重试必须重新提交同一份 autosave 草稿" }] }],
    };

    window.api.file.saveDocument = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "DB_ERROR", message: "autosave failed" } })
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: retriedUpdatedAt, contentHash: "hash-retried" } }) as typeof window.api.file.saveDocument;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(editedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(1);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(editedContent),
    }));
    expect(screen.getByRole("button", { name: "保存失败" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(editedContent),
    }));
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    expect(screen.getByRole("button", { name: "就绪" })).toBeInTheDocument();
  });

  it("retries the failed autosave from the toast action and closes the loop with a success toast", async () => {
    window.api = createApiMock();

    const retriedUpdatedAt = Date.UTC(2024, 0, 4, 10, 30);
    const editedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "toast 上的重试动作必须闭合 autosave 成功链路" }] }],
    };

    window.api.file.saveDocument = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "DB_ERROR", message: "autosave failed" } })
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: retriedUpdatedAt, contentHash: "hash-toast-retried" } }) as typeof window.api.file.saveDocument;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(editedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    const aiPreviewPanel = screen.getByRole("region", { name: "AI 预览" });
    expect(within(aiPreviewPanel).getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
    expect(screen.getByText("自动保存失败")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "重试" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(editedContent),
    }));
    expect(within(aiPreviewPanel).queryByRole("alert")).toBeNull();
    expect(screen.getByText("自动保存完成")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    expect(screen.getByRole("button", { name: "就绪" })).toBeInTheDocument();
  });

  it("retries the blocked doc A autosave from the error state instead of targeting a later document", async () => {
    window.api = createApiMock();

    const autosaveInFlight = createDeferred<{
      ok: false;
      error: { code: string; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;
    const docAEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 的失败 autosave 必须由文档 A 自己完成重试" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveInFlight.promise)
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 9, contentHash: "hash-doc-a-retried" } }) as typeof window.api.file.saveDocument;

    let currentContent = { type: "doc" };
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      currentContent = docAEditedContent;
      bridgeOptions?.onDocumentChange?.(docAEditedContent);
      await vi.advanceTimersByTimeAsync(800);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      autosaveInFlight.resolve({ ok: false, error: { code: "DB_ERROR", message: "autosave failed before switch" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "第一章" })).toBeInTheDocument();
    expect(window.api.file.setCurrentDocument).not.toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-2" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(window.api.file.saveDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      documentId: "doc-1",
      actor: "auto",
      reason: "autosave",
      contentJson: JSON.stringify(docAEditedContent),
    }));
    expect(screen.getByRole("heading", { name: "第一章" })).toBeInTheDocument();
  });

  it("ignores a stale retry handle after a newer autosave request has already succeeded", async () => {
    window.api = createApiMock();

    const firstEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "第一次 autosave 失败后会留下旧的 retry handle" }] }],
    };
    const secondEditedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "新的 autosave 成功后旧 retry handle 不得再发请求" }] }],
    };

    window.api.file.saveDocument = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "DB_ERROR", message: "first autosave failed" } })
      .mockResolvedValueOnce({ ok: true as const, data: { updatedAt: 10, contentHash: "hash-second-success" } }) as typeof window.api.file.saveDocument;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.useFakeTimers();

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(firstEditedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    const staleRetryButton = screen.getByRole("button", { name: "重试" });

    await act(async () => {
      bridgeOptions?.onDocumentChange?.(secondEditedContent);
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(staleRetryButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.api.file.saveDocument).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ignores a stale preview response after switching documents", async () => {
    window.api = createApiMock();

    const previewResult = createDeferred<{
      ok: true;
      data: { executionId: string; runId: string; status: "preview"; previewId: string; outputText: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;
    const docAContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const docBContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };

    window.api.ai.runSkill = vi.fn(async () => previewResult.promise) as typeof window.api.ai.runSkill;
    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-2"
        ? {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(docBContent),
          contentText: "文档 B 当前内容",
          contentMd: "",
          contentHash: "hash-b",
          createdAt: 2,
          updatedAt: 2,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(docAContent),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: 1,
          updatedAt: 1,
        },
    })) as typeof window.api.file.readDocument;

    let currentContent = docAContent;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("文档 A 的选区", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
    expect(await screen.findByRole("heading", { name: "第二章" })).toBeInTheDocument();
    expect(currentContent).toEqual(docBContent);

    await act(async () => {
      previewResult.resolve({ ok: true, data: { executionId: "exec-stale", runId: "run-stale", status: "preview", previewId: "exec-stale", outputText: "文档 A 晚到建议" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("文档 A 晚到建议")).toBeNull();
    expect(screen.queryByRole("button", { name: "接受" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(currentContent).toEqual(docBContent);
    expect(window.api.ai.confirmSkill).not.toHaveBeenCalled();
  });

  it("ignores a stale preview response after creating a new document so accept cannot save into the new active doc", async () => {
    window.api = createApiMock();

    const previewResult = createDeferred<{
      ok: true;
      data: { executionId: string; runId: string; status: "preview"; previewId: string; outputText: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const createdDocument = {
      documentId: "doc-3",
      title: "新建文档",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 3,
    } as const;
    const docAContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const createdDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "新建文档内容" }] }],
    };

    window.api.ai.runSkill = vi.fn(async () => previewResult.promise) as typeof window.api.ai.runSkill;
    window.api.file.createDocument = vi.fn(async () => ({ ok: true, data: { documentId: "doc-3" } })) as typeof window.api.file.createDocument;
    window.api.file.listDocuments = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [firstDocument] } })
      .mockResolvedValue({ ok: true, data: { items: [firstDocument, createdDocument] } }) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-3"
        ? {
          documentId: "doc-3",
          projectId: "project-1",
          title: "新建文档",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(createdDocumentContent),
          contentText: "新建文档内容",
          contentMd: "",
          contentHash: "hash-c",
          createdAt: 3,
          updatedAt: 3,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(docAContent),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: 1,
          updatedAt: 1,
        },
    })) as typeof window.api.file.readDocument;

    let currentContent = docAContent;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("文档 A 的选区", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
    expect(await screen.findByRole("heading", { name: "新建文档" })).toBeInTheDocument();
    expect(currentContent).toEqual(createdDocumentContent);

    await act(async () => {
      previewResult.resolve({ ok: true, data: { executionId: "exec-stale", runId: "run-stale", status: "preview", previewId: "exec-stale", outputText: "文档 A 晚到建议" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("文档 A 晚到建议")).toBeNull();
    expect(screen.queryByRole("button", { name: "接受" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(currentContent).toEqual(createdDocumentContent);
    expect(window.api.ai.confirmSkill).not.toHaveBeenCalled();
  });

  it("keeps a switched document save UI isolated from an earlier accept save success", async () => {
    window.api = createApiMock();

    const docAUpdatedAt = Date.UTC(2024, 0, 1, 8, 0);
    const docBUpdatedAt = Date.UTC(2024, 0, 2, 9, 30);
    const staleAcceptUpdatedAt = Date.UTC(2024, 0, 5, 18, 45);
    const acceptResult = createDeferred<{
      ok: true;
      data: { updatedAt: number; contentHash: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: docAUpdatedAt,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: docBUpdatedAt,
    } as const;
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 接受后的文稿" }] }],
    };
    const secondDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-2"
        ? {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(secondDocumentContent),
          contentText: "文档 B 当前内容",
          contentMd: "",
          contentHash: "hash-b",
          createdAt: docBUpdatedAt,
          updatedAt: docBUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(beforeApply),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: docAUpdatedAt,
          updatedAt: docAUpdatedAt,
        },
    })) as typeof window.api.file.readDocument;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise) as typeof window.api.file.saveDocument;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.mocked(bridgeMock.setContent).mockClear();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("切文档后旧 accept 成功也不能污染新文档状态。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
    await screen.findByRole("heading", { name: "第二章" });
    expect(currentContent).toEqual(secondDocumentContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(docBUpdatedAt))).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      acceptResult.resolve({ ok: true, data: { updatedAt: staleAcceptUpdatedAt, contentHash: "hash-stale" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "第二章" })).toBeInTheDocument();
    expect(currentContent).toEqual(secondDocumentContent);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(docBUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByRole("button", { name: "已保存" })).toBeNull();
    expect(statusBarView.queryByText(formatWorkbenchTimestamp(staleAcceptUpdatedAt))).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(bridgeMock.setContent).not.toHaveBeenCalledWith(beforeApply);
  });

  it("does not let a failed accept rollback overwrite a document switch", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: false;
      error: { code: "DB_ERROR"; message: string };
    }>();
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 接受后的文稿" }] }],
    };
    const secondDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };

    window.api.file.listDocuments = vi.fn(async () => ({ ok: true, data: { items: [firstDocument, secondDocument] } })) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-2"
        ? {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(secondDocumentContent),
          contentText: "文档 B 当前内容",
          contentMd: "",
          contentHash: "hash-b",
          createdAt: 2,
          updatedAt: 2,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(beforeApply),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: 1,
          updatedAt: 1,
        },
    })) as typeof window.api.file.readDocument;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise) as typeof window.api.file.saveDocument;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.mocked(bridgeMock.setContent).mockClear();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("切文档期间不能再被旧 accept 回滚。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /第二章/ }));
    await screen.findByRole("heading", { name: "第二章" });
    expect(currentContent).toEqual(secondDocumentContent);

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "第二章" })).toBeInTheDocument();
    expect(currentContent).toEqual(secondDocumentContent);
    expect(bridgeMock.setContent).not.toHaveBeenCalledWith(beforeApply);
  });

  it("does not let a failed accept rollback overwrite a newly created document", async () => {
    window.api = createApiMock();

    const acceptResult = createDeferred<{
      ok: false;
      error: { code: "DB_ERROR"; message: string };
    }>();
    const createdDocumentUpdatedAt = Date.UTC(2024, 0, 3, 11, 15);
    const firstDocument = {
      documentId: "doc-1",
      title: "第一章",
      type: "chapter",
      status: "draft",
      sortOrder: 0,
      updatedAt: 1,
    } as const;
    const createdDocument = {
      documentId: "doc-3",
      title: "新建文档",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: createdDocumentUpdatedAt,
    } as const;
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 接受后的文稿" }] }],
    };
    const createdDocumentContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "新建文档内容" }] }],
    };

    window.api.file.createDocument = vi.fn(async () => ({ ok: true, data: { documentId: "doc-3" } })) as typeof window.api.file.createDocument;
    window.api.file.listDocuments = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [firstDocument] } })
      .mockResolvedValue({ ok: true, data: { items: [firstDocument, createdDocument] } }) as typeof window.api.file.listDocuments;
    window.api.file.setCurrentDocument = vi.fn(async ({ documentId }) => ({ ok: true, data: { documentId } })) as typeof window.api.file.setCurrentDocument;
    window.api.file.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: documentId === "doc-3"
        ? {
          documentId: "doc-3",
          projectId: "project-1",
          title: "新建文档",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify(createdDocumentContent),
          contentText: "新建文档内容",
          contentMd: "",
          contentHash: "hash-c",
          createdAt: createdDocumentUpdatedAt,
          updatedAt: createdDocumentUpdatedAt,
        }
        : {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(beforeApply),
          contentText: "文档 A 原文",
          contentMd: "",
          contentHash: "hash-a",
          createdAt: 1,
          updatedAt: 1,
        },
    })) as typeof window.api.file.readDocument;
    window.api.file.saveDocument = vi.fn()
      .mockImplementationOnce(async () => acceptResult.promise) as typeof window.api.file.saveDocument;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = acceptedDocument;
      bridgeOptions?.onDocumentChange?.(acceptedDocument);
      return { ok: true as const };
    });

    const { container } = render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    vi.mocked(bridgeMock.setContent).mockClear();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("新建文档期间不能再被旧 accept 回滚。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "接受" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
    await screen.findByRole("heading", { name: "新建文档" });
    expect(currentContent).toEqual(createdDocumentContent);

    const statusBar = container.querySelector(".status-bar");
    expect(statusBar).not.toBeNull();
    const statusBarView = within(statusBar as HTMLElement);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(createdDocumentUpdatedAt))).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      acceptResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "accept save failed" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "新建文档" })).toBeInTheDocument();
    expect(currentContent).toEqual(createdDocumentContent);
    expect(statusBarView.getByRole("button", { name: "就绪" })).toBeInTheDocument();
    expect(statusBarView.getByText(formatWorkbenchTimestamp(createdDocumentUpdatedAt))).toBeInTheDocument();
    expect(statusBarView.queryByRole("button", { name: "保存失败" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(bridgeMock.setContent).not.toHaveBeenCalledWith(beforeApply);
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

    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
    });
    expect(screen.getByRole("button", { name: "已保存" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("数据层暂时不可用，请稍后重试。");
  });

  it("treats ok:true rejected accept as a failed rollback path instead of saved success", async () => {
    window.api = createApiMock();
    window.api.ai.confirmSkill = vi.fn(async () => ({
      ok: true as const,
      data: {
        executionId: "exec-1",
        runId: "run-1",
        status: "rejected" as const,
        outputText: "改写后的句子",
      },
    })) as typeof window.api.ai.confirmSkill;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("accept 被权限拒绝时不能伪装成已保存。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByText("改写后的句子")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "接受" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("当前账号没有执行该操作的权限。");
    expect(screen.getByRole("button", { name: "保存失败" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已保存" })).toBeNull();
    expect(screen.getByText("改写后的句子")).toBeInTheDocument();
    expect(bridgeMock.setContent).toHaveBeenCalled();
  });

  it("surfaces reject confirm failures without dismissing the preview", async () => {
    window.api = createApiMock();
    window.api.ai.confirmSkill = vi.fn(async () => ({
      ok: false as const,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof window.api.ai.confirmSkill;

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
    expect(window.api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "reject",
    });
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
