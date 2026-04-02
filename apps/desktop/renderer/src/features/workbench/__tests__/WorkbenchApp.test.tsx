import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EditorBridge, EditorBridgeOptions } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { WorkbenchApp } from "@/features/workbench/WorkbenchApp";
import type { PreloadApi } from "@/lib/preloadApi";

let bridgeOptions: EditorBridgeOptions | undefined;

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
  beforeEach(() => {
    bridgeOptions = undefined;
    vi.clearAllMocks();
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

    fireEvent.click(screen.getByRole("button", { name: "知识图谱" }));
    expect(await screen.findByLabelText("左侧边栏")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "知识图谱" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "知识图谱" })).toHaveClass("rail-button--active");

    fireEvent.click(screen.getByRole("tab", { name: "信息" }));
    expect(screen.getByRole("heading", { name: "信息" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "历史记录" })).toBeNull();
    expect(screen.queryByRole("button", { name: "新对话" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "质量" }));
    expect(screen.getByRole("heading", { name: "质量" })).toBeInTheDocument();

    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(screen.queryByLabelText("右侧面板")).toBeNull();
    expect(screen.getByRole("button", { name: "打开 AI 面板" })).toBeInTheDocument();

    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(await screen.findByLabelText("右侧面板")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "AI" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新对话" })).toBeInTheDocument();
  });
});
