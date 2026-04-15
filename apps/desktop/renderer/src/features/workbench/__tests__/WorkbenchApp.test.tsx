import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXPORT_PROGRESS_CHANNEL,
  type ExportLifecycleEvent,
} from "@shared/types/export";
import type { EditorBridge, EditorBridgeOptions } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import type { VersionHistorySnapshotDetail, VersionHistorySnapshotSummary } from "@/features/version-history/types";
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
  getCursorContext: vi.fn(() => ({ cursorPosition: 5, precedingText: "风从北方来" })),
  getSelection: vi.fn(() => null),
  getSelectionViewportAnchor: vi.fn(() => ({ bottom: 228, left: 640, top: 200 })),
  getTextContent: vi.fn(() => "风从北方来"),
  mount: vi.fn(),
  replaceSelection: vi.fn(() => ({ ok: true as const })),
  setEditable: vi.fn(),
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

function dispatchExportLifecycleEvent(event: ExportLifecycleEvent): void {
  window.dispatchEvent(
    new CustomEvent<ExportLifecycleEvent>(EXPORT_PROGRESS_CHANNEL, {
      detail: event,
    }),
  );
}

function formatWorkbenchTimestamp(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function createSnapshotSummary(overrides: Partial<VersionHistorySnapshotSummary> = {}) {
  return {
    versionId: "snapshot-1",
    actor: "user" as const,
    reason: "manual-save" as const,
    contentHash: "snapshot-hash-1",
    wordCount: 5,
    parentSnapshotId: null,
    createdAt: 1,
    ...overrides,
  };
}

function createSnapshotDetail(overrides: Partial<VersionHistorySnapshotDetail> = {}) {
  return {
    versionId: "snapshot-1",
    documentId: "doc-1",
    projectId: "project-1",
    actor: "user" as const,
    reason: "manual-save" as const,
    contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }] }),
    contentText: "风从北方来",
    contentMd: "风从北方来",
    contentHash: "snapshot-hash-1",
    wordCount: 5,
    parentSnapshotId: null,
    createdAt: 1,
    ...overrides,
  };
}

function installLegacyLogBridge(invoke = vi.fn(async () => ({ ok: true as const, data: { logged: true as const } }))) {
  window.creonow = {
    api: window.api as PreloadApi,
    invoke: invoke as LegacyCreonowBridge["invoke"],
    stream: {
      registerAiStreamConsumer: () => ({ ok: true, data: { subscriptionId: "sub-1" } }),
      releaseAiStreamConsumer: () => undefined,
      registerExportProgressConsumer: () => ({ ok: true, data: { subscriptionId: "sub-export-1" } }),
      releaseExportProgressConsumer: () => undefined,
    },
  };

  return invoke;
}

function createApiMock(): PreloadApi {
  const aiConfig = {
    enabled: true,
    providerMode: "openai-compatible" as const,
    baseUrl: "",
    apiKeyConfigured: false,
    openAiCompatibleBaseUrl: "",
    openAiCompatibleApiKeyConfigured: false,
    openAiByokBaseUrl: "",
    openAiByokApiKeyConfigured: false,
    anthropicByokBaseUrl: "",
    anthropicByokApiKeyConfigured: false,
  };

  return {
    ai: {
      confirmSkill: vi.fn(async ({ executionId, action, projectId }) => ({
        ok: true,
        data: {
          executionId,
          runId: "run-1",
          status: action === "accept" ? "completed" : "rejected",
          outputText: "改写后的句子",
          projectId,
        },
      })),
      cancelSkill: vi.fn(async () => ({ ok: true, data: { canceled: true } })),
      getConfig: vi.fn(async () => ({ ok: true, data: aiConfig })),
      runSkill: vi.fn(async () => ({ ok: true, data: { executionId: "exec-1", runId: "run-1", status: "preview" as const, previewId: "exec-1", outputText: "改写后的句子" } })),
      submitSkillFeedback: vi.fn(async () => ({ ok: true, data: { recorded: true } })),
      testConfig: vi.fn(async () => ({ ok: true, data: { ok: true, latencyMs: 24 } })),
      updateConfig: vi.fn(async () => ({ ok: true, data: aiConfig })),
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
      stats: vi.fn(async () => ({ ok: true, data: { total: 1, active: 1, archived: 0, totalWordCount: 0, overallProgressPercent: 0, perProject: [] } })),
      switchProject: vi.fn(async ({ projectId }) => ({
        ok: true,
        data: { currentProjectId: projectId, switchedAt: "2026-01-01T00:00:00.000Z" },
      })),
    },
    version: {
      listSnapshots: vi.fn(async () => ({ ok: true, data: { items: [] } })),
      readSnapshot: vi.fn(async () => ({
        ok: true,
        data: {
          versionId: "snapshot-1",
          documentId: "doc-1",
          projectId: "project-1",
          actor: "user",
          reason: "manual-save",
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }] }),
          contentText: "风从北方来",
          contentMd: "风从北方来",
          contentHash: "snapshot-hash-1",
          wordCount: 5,
          parentSnapshotId: null,
          createdAt: 1,
        },
      })),
      rollbackSnapshot: vi.fn(async () => ({
        ok: true,
        data: {
          restored: true,
          preRollbackVersionId: "snapshot-current",
          rollbackVersionId: "snapshot-rollback",
        },
      })),
      restoreSnapshot: vi.fn(async () => ({ ok: true, data: { restored: true } })),
    },
    character: {} as PreloadApi["character"],
    location: {} as PreloadApi["location"],
    search: {} as PreloadApi["search"],
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
    vi.mocked(bridgeMock.getCursorContext).mockReturnValue({ cursorPosition: 5, precedingText: "风从北方来" });
    window.localStorage.clear();
    window.api = createApiMock();
    window.creonow = {
      api: window.api,
      invoke: vi.fn(async () => ({ ok: true as const, data: { logged: true as const } })),
      stream: {
        registerAiStreamConsumer: vi.fn(() => ({ ok: true as const, data: { subscriptionId: "sub-ai-1" } })),
        releaseAiStreamConsumer: vi.fn(),
        registerExportProgressConsumer: vi.fn(() => ({ ok: true as const, data: { subscriptionId: "sub-export-1" } })),
        releaseExportProgressConsumer: vi.fn(),
      },
    };
  });

  it("tracks export lifecycle activity on the workbench frame and clears it on completion", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    const frame = screen.getByTestId("workbench-frame");
    expect(frame).not.toHaveAttribute("data-export-active");

    act(() => {
      dispatchExportLifecycleEvent({
        type: "export-started",
        exportId: "exp-1",
        projectId: "project-1",
        format: "markdown",
        currentDocument: "doc-1",
        timestamp: 1,
      });
    });

    expect(frame).toHaveAttribute("data-export-active", "true");

    act(() => {
      dispatchExportLifecycleEvent({
        type: "export-completed",
        exportId: "exp-1",
        success: true,
        projectId: "project-1",
        format: "markdown",
        documentCount: 1,
        timestamp: 2,
      });
    });

    await waitFor(() => {
      expect(frame).not.toHaveAttribute("data-export-active");
    });
  });


  it("renders the P1 polish rewrite continue launcher and keeps rewrite instruction-gated", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    expect(screen.getByRole("button", { name: "润色" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "改写" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "续写" })).toBeInTheDocument();

    const selection = createSelection("需要显式改写的一段文字。", 16);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(selection);
    });

    fireEvent.click(screen.getByRole("button", { name: "改写" }));
    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    expect(window.api?.ai.runSkill).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("请输入改写指令。");

    fireEvent.click(screen.getByRole("button", { name: "润色" }));
    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        skillId: "builtin:polish",
        selection,
      }));
    });
  });

  it("shows the floating editor toolbar for a selection and lets quick polish hit skill IPC", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.change(screen.getByLabelText("指令"), {
      target: { value: "这条旧指令不应被润色快捷动作复用。" },
    });
    const selection = createSelection("需要润色的一段文字。", 16);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(selection);
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    expect(toolbar).toBeInTheDocument();

    fireEvent.click(within(toolbar).getByTestId("editor-selection-toolbar-polish"));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        skillId: "builtin:polish",
        selection,
        userInstruction: "",
      }));
    });
  });

  it("submits a custom rewrite instruction from the floating editor toolbar", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    const selection = createSelection("这一段需要更冷静、更锋利。", 12);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(selection);
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "告诉 AI 如何改写…" }));
    fireEvent.change(await within(toolbar).findByTestId("editor-selection-toolbar-prompt-input"), {
      target: { value: "把这一段改得更克制，但保留压迫感。" },
    });
    fireEvent.click(within(toolbar).getByTestId("editor-selection-toolbar-prompt-submit"));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        skillId: "builtin:rewrite",
        selection,
        userInstruction: "把这一段改得更克制，但保留压迫感。",
      }));
    });
  });

  it("runs rewrite quick actions from the floating editor toolbar with preset instructions", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    const selection = createSelection("语法需要修复的句子。", 8);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(selection);
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByTestId("editor-selection-toolbar-grammar"));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        skillId: "builtin:rewrite",
        selection,
        userInstruction: "请修正语法与拼写，并保留原意。",
      }));
    });
  });

  it("hides the floating editor toolbar when the selection collapses", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("会被取消的选区。", 8));
    });

    expect(await screen.findByTestId("editor-selection-toolbar")).toBeInTheDocument();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(null);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("editor-selection-toolbar")).not.toBeInTheDocument();
    });
  });

  it("hides the floating editor toolbar after editor-area scrolling", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("滚动后应当收起。", 8));
    });

    expect(await screen.findByTestId("editor-selection-toolbar")).toBeInTheDocument();

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.queryByTestId("editor-selection-toolbar")).not.toBeInTheDocument();
    });
  });

  it("keeps custom toolbar instructions intact across anchor-only resize recalculation", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("窗口变化时不该丢输入。", 10));
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "告诉 AI 如何改写…" }));
    const promptInput = await within(toolbar).findByTestId("editor-selection-toolbar-prompt-input");
    fireEvent.change(promptInput, {
      target: { value: "把这段压缩到两句，但保留刺痛感。" },
    });

    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(screen.getByTestId("editor-selection-toolbar-prompt-input")).toHaveValue("把这段压缩到两句，但保留刺痛感。");
    });
  });

  it("keeps the prompt toolbar open when the input takes focus and collapses editor selection", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("输入框拿走焦点时不能掉。", 12));
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "告诉 AI 如何改写…" }));
    const promptInput = await within(toolbar).findByTestId("editor-selection-toolbar-prompt-input");
    fireEvent.change(promptInput, {
      target: { value: "保留现有输入，不要闪退。" },
    });

    fireEvent.mouseDown(promptInput);
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("editor-selection-toolbar-prompt-input")).toHaveValue("保留现有输入，不要闪退。");
    });
  });

  it("dismisses the prompt toolbar when selection collapses from editor focus", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("点击编辑区后应该收起。", 12));
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "告诉 AI 如何改写…" }));
    const promptInput = await within(toolbar).findByTestId("editor-selection-toolbar-prompt-input");
    fireEvent.change(promptInput, {
      target: { value: "这段输入会在点击编辑区后被放弃。" },
    });

    const proseMirrorHost = document.createElement("div");
    proseMirrorHost.className = "ProseMirror";
    proseMirrorHost.tabIndex = -1;
    document.body.append(proseMirrorHost);
    proseMirrorHost.focus();

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(null);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("editor-selection-toolbar")).not.toBeInTheDocument();
    });

    proseMirrorHost.remove();
  });

  it("dismisses the prompt toolbar when creating a new document switches context", async () => {
    const fileApi = window.api!.file!;
    fileApi.createDocument = vi.fn(async () => ({ ok: true, data: { documentId: "doc-2" } })) as typeof fileApi.createDocument;
    fileApi.readDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: {
        documentId,
        projectId: "project-1",
        title: documentId === "doc-2" ? "第二章" : "第一章",
        type: "chapter",
        status: "draft",
        sortOrder: documentId === "doc-2" ? 1 : 0,
        contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
        contentText: documentId === "doc-2" ? "新章节内容" : "风从北方来",
        contentMd: "",
        contentHash: documentId === "doc-2" ? "hash-2" : "hash",
        createdAt: 1,
        updatedAt: documentId === "doc-2" ? 2 : 1,
      },
    })) as typeof fileApi.readDocument;

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.change(screen.getByLabelText("指令"), {
      target: { value: "旧文档的指令不应被带到新文档。" },
    });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("切文档前先打开 prompt。", 10));
    });

    const toolbar = await screen.findByTestId("editor-selection-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: "告诉 AI 如何改写…" }));
    fireEvent.change(await within(toolbar).findByTestId("editor-selection-toolbar-prompt-input"), {
      target: { value: "这条指令不应跨文档残留。" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新建文档" }));

    await screen.findByRole("heading", { name: "第二章" });
    await waitFor(() => {
      expect(screen.queryByTestId("editor-selection-toolbar")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("指令")).toHaveValue("");
  });

  it("dismisses the floating toolbar on outside icon clicks, including svg targets", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("外部 icon 点击也该收起。", 11));
    });

    expect(await screen.findByTestId("editor-selection-toolbar")).toBeInTheDocument();

    const outsideButton = document.createElement("button");
    const outsideSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    outsideButton.append(outsideSvg);
    document.body.append(outsideButton);

    fireEvent.mouseDown(outsideSvg);

    await waitFor(() => {
      expect(screen.queryByTestId("editor-selection-toolbar")).not.toBeInTheDocument();
    });

    outsideButton.remove();
  });

  it("runs continue from cursor context without any selection", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.click(screen.getByRole("button", { name: "续写" }));
    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    await waitFor(() => {
      expect(window.api?.ai.runSkill).toHaveBeenCalledWith(expect.objectContaining({
        skillId: "builtin:continue",
        hasSelection: false,
        cursorPosition: 5,
        precedingText: "风从北方来",
      }));
    });
  });

  it("connects settings panel to AI save/test actions via workbench path", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.click(screen.getByRole("button", { name: /设置|Settings/i }));

    await screen.findByTestId("ai-save-btn");
    fireEvent.click(screen.getByTestId("ai-test-btn"));
    await waitFor(() => {
      expect(window.api?.ai.testConfig).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByTestId("ai-base-url"), {
      target: { value: "https://api.example.com/v1" },
    });
    fireEvent.change(screen.getByTestId("ai-api-key"), {
      target: { value: "sk-test-123" },
    });
    fireEvent.click(screen.getByTestId("ai-save-btn"));

    await waitFor(() => {
      expect(window.api?.ai.updateConfig).toHaveBeenCalledWith({
        patch: expect.objectContaining({
          providerMode: "openai-compatible",
          openAiCompatibleBaseUrl: "https://api.example.com/v1",
          openAiCompatibleApiKey: "sk-test-123",
        }),
      });
    });
  });

  it("shows continue previews as insert-at-cursor diffs before accept writes back", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.click(screen.getByRole("button", { name: "续写" }));
    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));

    expect(await screen.findByText("写回方式")).toBeInTheDocument();
    expect(screen.getByText("将在当前光标处插入，不会替换任何原文。")).toBeInTheDocument();
    expect(screen.getByText("将插入的内容")).toBeInTheDocument();

    const originalColumn = screen.getByRole("heading", { name: "写回方式" }).closest("article");
    expect(originalColumn).not.toBeNull();
    expect(within(originalColumn as HTMLElement).queryByText("风从北方来")).toBeNull();
  });

  it("switches the main editor into read-only snapshot preview and can return to the current version", async () => {
    const listSnapshots = vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          createSnapshotSummary({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "ai-accept",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          }),
          createSnapshotSummary(),
        ],
      },
    }));
    const readSnapshot = vi.fn(async ({ versionId }: { versionId: string }) => ({
      ok: true as const,
      data: versionId === "snapshot-2"
        ? createSnapshotDetail({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "ai-accept",
            contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "AI 改写版本" }] }] }),
            contentText: "AI 改写版本",
            contentMd: "AI 改写版本",
            contentHash: "snapshot-hash-2",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          })
        : createSnapshotDetail(),
    }));
    const rollbackSnapshot = vi.fn(async () => ({
      ok: true as const,
      data: {
        restored: true as const,
        preRollbackVersionId: "snapshot-current",
        rollbackVersionId: "snapshot-rollback",
      },
    }));
    const readDocument = vi.fn()
      .mockResolvedValueOnce({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter" as const,
          status: "draft" as const,
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }] }),
          contentText: "风从北方来",
          contentMd: "",
          contentHash: "hash",
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .mockResolvedValueOnce({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter" as const,
          status: "draft" as const,
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }] }),
          contentText: "风从北方来",
          contentMd: "",
          contentHash: "hash-rollback",
          createdAt: 1,
          updatedAt: 9,
        },
      });

    window.api = {
      ...createApiMock(),
      file: {
        ...createApiMock().file,
        readDocument: readDocument as PreloadApi["file"]["readDocument"],
      },
      version: {
        ...createApiMock().version,
        listSnapshots: listSnapshots as PreloadApi["version"]["listSnapshots"],
        readSnapshot: readSnapshot as PreloadApi["version"]["readSnapshot"],
        rollbackSnapshot: rollbackSnapshot as PreloadApi["version"]["rollbackSnapshot"],
      },
    };

    window.localStorage.setItem("creonow.layout.activeLeftPanel", "versionHistory");
    window.localStorage.setItem("creonow.layout.sidebarCollapsed", "false");

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    expect(await screen.findByText("AI 改写版本")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /AI 接受/ }));

    expect(await screen.findByText(`正在预览 ${formatWorkbenchTimestamp(2)} 的版本`)).toBeInTheDocument();
    await waitFor(() => {
      expect(bridgeMock.setEditable).toHaveBeenCalledWith(false);
    });
    expect(bridgeMock.setContent).toHaveBeenLastCalledWith({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "AI 改写版本" }] }],
    });

    fireEvent.click(screen.getByRole("button", { name: "返回当前版本" }));

    await waitFor(() => {
      expect(bridgeMock.setEditable).toHaveBeenLastCalledWith(true);
      expect(bridgeMock.setContent).toHaveBeenCalledWith({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }],
      });
    });
    expect(screen.queryByText(`正在预览 ${formatWorkbenchTimestamp(2)} 的版本`)).not.toBeInTheDocument();
    expect(window.api?.version.rollbackSnapshot).not.toHaveBeenCalled();
  });

  it("requires confirmation before restoring a previewed snapshot and allows canceling", async () => {
    const listSnapshots = vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          createSnapshotSummary({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "rollback",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          }),
          createSnapshotSummary(),
        ],
      },
    }));
    const readSnapshot = vi.fn(async ({ versionId }: { versionId: string }) => ({
      ok: true as const,
      data: versionId === "snapshot-2"
        ? createSnapshotDetail({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "rollback",
            contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "回退后的版本" }] }] }),
            contentText: "回退后的版本",
            contentMd: "回退后的版本",
            contentHash: "snapshot-hash-2",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          })
        : createSnapshotDetail(),
    }));
    const restoreSnapshot = vi.fn(async () => ({ ok: true as const, data: { restored: true as const } }));
    const readDocument = vi.fn()
      .mockResolvedValueOnce({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter" as const,
          status: "draft" as const,
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风从北方来" }] }] }),
          contentText: "风从北方来",
          contentMd: "",
          contentHash: "hash",
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .mockResolvedValueOnce({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter" as const,
          status: "draft" as const,
          sortOrder: 0,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "回退后的版本" }] }] }),
          contentText: "回退后的版本",
          contentMd: "",
          contentHash: "hash-restore",
          createdAt: 1,
          updatedAt: 10,
        },
      });

    window.api = {
      ...createApiMock(),
      file: {
        ...createApiMock().file,
        readDocument: readDocument as PreloadApi["file"]["readDocument"],
      },
      version: {
        ...createApiMock().version,
        listSnapshots: listSnapshots as PreloadApi["version"]["listSnapshots"],
        readSnapshot: readSnapshot as PreloadApi["version"]["readSnapshot"],
        restoreSnapshot: restoreSnapshot as PreloadApi["version"]["restoreSnapshot"],
      },
    };

    window.localStorage.setItem("creonow.layout.activeLeftPanel", "versionHistory");
    window.localStorage.setItem("creonow.layout.sidebarCollapsed", "false");

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    expect(await screen.findByText("回退后的版本")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /回退结果/ }));

    fireEvent.click(await screen.findByRole("button", { name: "恢复到此版本" }));
    expect(await screen.findByRole("dialog", { name: "确认恢复历史版本" })).toBeInTheDocument();
    expect(window.api?.version.restoreSnapshot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "确认恢复历史版本" })).not.toBeInTheDocument();
    });
    expect(window.api?.version.restoreSnapshot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "恢复到此版本" }));
    fireEvent.click(await screen.findByRole("button", { name: "确认恢复" }));

    await waitFor(() => {
      expect(window.api?.version.restoreSnapshot).toHaveBeenCalledWith({
        documentId: "doc-1",
        projectId: "project-1",
        versionId: "snapshot-2",
      });
    });
    await waitFor(() => {
      expect(bridgeMock.setEditable).toHaveBeenLastCalledWith(true);
      expect(bridgeMock.setContent).toHaveBeenCalledWith({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "回退后的版本" }] }],
      });
    });
  });

  it("opens version history from the visible rail instead of requiring persisted layout state", async () => {
    const listSnapshots = vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          createSnapshotSummary({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "ai-accept",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          }),
          createSnapshotSummary(),
        ],
      },
    }));
    const readSnapshot = vi.fn(async ({ versionId }: { versionId: string }) => ({
      ok: true as const,
      data: versionId === "snapshot-2"
        ? createSnapshotDetail({
            versionId: "snapshot-2",
            actor: "ai",
            reason: "ai-accept",
            contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "AI 改写版本" }] }] }),
            contentText: "AI 改写版本",
            contentMd: "AI 改写版本",
            contentHash: "snapshot-hash-2",
            wordCount: 8,
            parentSnapshotId: "snapshot-1",
            createdAt: 2,
          })
        : createSnapshotDetail(),
    }));

    window.api = {
      ...createApiMock(),
      version: {
        ...createApiMock().version,
        listSnapshots: listSnapshots as PreloadApi["version"]["listSnapshots"],
        readSnapshot: readSnapshot as PreloadApi["version"]["readSnapshot"],
      },
    };

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.click(screen.getByRole("button", { name: "历史版本" }));

    await screen.findByRole("heading", { name: "历史版本" });
    await waitFor(() => {
      expect(window.api?.version.listSnapshots).toHaveBeenCalledWith({
        documentId: "doc-1",
        projectId: "project-1",
      });
    });
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe("versionHistory");
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("false");

    fireEvent.click(await screen.findByRole("button", { name: /AI 接受/ }));
    expect(await screen.findByText("AI 改写版本")).toBeInTheDocument();
  });

  it("opens outline from the visible rail and persists the selected left panel", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    fireEvent.click(screen.getByRole("button", { name: "大纲" }));

    await screen.findByRole("heading", { name: "大纲" });
    expect(screen.getByText("等待结构同步")).toBeInTheDocument();
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe("outline");
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("false");
  });

  it("shows every document in the files sidebar instead of truncating after eight entries", async () => {
    const documents = Array.from({ length: 10 }, (_, index) => ({
      documentId: `doc-${index + 1}`,
      title: `第${index + 1}章`,
      type: "chapter" as const,
      status: "draft" as const,
      sortOrder: index,
      updatedAt: index + 1,
    }));

    window.api = {
      ...createApiMock(),
      file: {
        ...createApiMock().file,
        listDocuments: vi.fn(async () => ({
          ok: true as const,
          data: { items: documents },
        })) as PreloadApi["file"]["listDocuments"],
      },
    };

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });
    expect(screen.getByText("第9章")).toBeInTheDocument();
    expect(screen.getByText("第10章")).toBeInTheDocument();
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
        input: selection.text,
        userInstruction: "请直接润色",
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
    const saveDocument = vi.fn()
      .mockImplementationOnce(async () => autosaveResult.promise);
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

    expect(window.api.ai.confirmSkill).not.toHaveBeenCalled();
    expect(screen.queryByText("改写后的句子")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("文稿在预览生成后已发生变更，请重新生成建议。");
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
      projectId: "project-1",
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
      projectId: "project-1",
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
      projectId: "project-1",
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

    expect(confirmSkill).toHaveBeenCalledWith({ executionId: "exec-1", action: "accept", projectId: "project-1" });
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
    expect(confirmSkill).toHaveBeenNthCalledWith(1, { executionId: "exec-1", action: "accept", projectId: "project-1" });
    expect(screen.getByRole("button", { name: "保存失败" })).toBeInTheDocument();
    expect(screen.getAllByText("数据层暂时不可用，请稍后重试。").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存失败" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(confirmSkill).toHaveBeenCalledTimes(2);
    expect(confirmSkill).toHaveBeenNthCalledWith(2, { executionId: "exec-1", action: "accept", projectId: "project-1" });
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
    expect(vi.mocked(bridgeMock.setContent).mock.lastCall?.[0]).toEqual(secondDocumentContent);
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
    expect(vi.mocked(bridgeMock.setContent).mock.lastCall?.[0]).toEqual(secondDocumentContent);
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
    expect(vi.mocked(bridgeMock.setContent).mock.lastCall?.[0]).toEqual(createdDocumentContent);
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
      projectId: "project-1",
    });
    expect(screen.getByRole("contentinfo")).toHaveTextContent("云端同步中");
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
    expect(screen.getByRole("contentinfo")).toHaveTextContent("云端同步中");
    expect(screen.getByText("改写后的句子")).toBeInTheDocument();
    expect(bridgeMock.setContent).toHaveBeenCalled();
  });

  it("reconciles accept preview with the persisted multi-paragraph document structure", async () => {
    window.api = createApiMock();
    const previewText = "第一段\n第二段";
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const previewDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: previewText }] }],
    };
    const persistedDocument = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "第一段" }] },
        { type: "paragraph", content: [{ type: "text", text: "第二段" }] },
      ],
    };
    window.api.ai.runSkill = vi.fn(async () => ({
      ok: true as const,
      data: {
        executionId: "exec-1",
        runId: "run-1",
        status: "preview" as const,
        previewId: "exec-1",
        outputText: previewText,
      },
    })) as typeof window.api.ai.runSkill;
    window.api.file.readDocument = vi.fn()
      .mockResolvedValueOnce({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(beforeApply),
          contentText: "原文",
          contentMd: "",
          contentHash: "hash-initial",
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .mockResolvedValue({
        ok: true as const,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "第一章",
          type: "chapter",
          status: "draft",
          sortOrder: 0,
          contentJson: JSON.stringify(persistedDocument),
          contentText: previewText,
          contentMd: previewText,
          contentHash: "hash-accepted",
          createdAt: 1,
          updatedAt: 5,
        },
      }) as typeof window.api.file.readDocument;

    let currentContent = beforeApply;
    vi.mocked(bridgeMock.getContent).mockImplementation(() => currentContent);
    vi.mocked(bridgeMock.setContent).mockImplementation((content) => {
      currentContent = content as typeof currentContent;
    });
    vi.mocked(bridgeMock.replaceSelection).mockImplementationOnce(() => {
      currentContent = previewDocument;
      bridgeOptions?.onDocumentChange?.(previewDocument);
      return { ok: true as const };
    });

    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "第一章" });

    await act(async () => {
      bridgeOptions?.onSelectionChange?.(createSelection("需要保持 preview 与落库结构一致。", 8));
    });

    fireEvent.click(screen.getByRole("button", { name: "生成建议" }));
    expect(await screen.findByRole("button", { name: "接受" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(bridgeMock.setContent).toHaveBeenCalledWith(persistedDocument);
    });
    expect(currentContent).toEqual(persistedDocument);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("云端同步中");
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
      projectId: "project-1",
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
      expect(frame.style.getPropertyValue("--left-sidebar-width")).toBe("260px");
      expect(window.localStorage.getItem("creonow.layout.sidebarWidth")).toBe("260");
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
      "仪表盘",
      "搜索",
      "日历",
      "文件",
      "大纲",
      "历史版本",
      "场景",
      "人物",
      "世界观",
      "知识图谱",
      "记忆",
      "设置",
    ]);
    expect(screen.getByRole("button", { name: "文件" })).toHaveClass("rail-button--active");

    fireEvent.click(screen.getByRole("button", { name: "文件" }));
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

  it("toggles zen mode via button, hides sidebar/panel/status-bar, and persists to localStorage", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      render(<WorkbenchApp />);
      await screen.findByRole("heading", { name: "第一章" });

      const frame = screen.getByTestId("workbench-frame");

      // Zen mode off by default — panels visible.
      expect(frame).not.toHaveClass("workbench-frame--zen");
      expect(screen.getByLabelText("CreoNow 工作台")).toBeInTheDocument(); // icon rail
      expect(screen.getByLabelText("左侧边栏")).toBeInTheDocument();
      expect(screen.getByLabelText("右侧面板")).toBeInTheDocument();
      expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // status bar via <footer>

      // Enter zen mode via button.
      fireEvent.click(screen.getByRole("button", { name: "进入专注模式" }));
      expect(frame).toHaveClass("workbench-frame--zen");
      // During animation exit, elements may stay mounted briefly in jsdom.
      expect(screen.getByLabelText("右侧面板")).toHaveAttribute("hidden");
      expect(screen.getByRole("contentinfo", { hidden: true })).toHaveAttribute("hidden");
      expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("true");

      // Toggle back off.
      fireEvent.click(screen.getByRole("button", { name: "退出专注模式" }));
      expect(frame).not.toHaveClass("workbench-frame--zen");
      expect(screen.getByLabelText("CreoNow 工作台")).toBeInTheDocument();
      expect(screen.getByLabelText("左侧边栏")).toBeInTheDocument();
      expect(screen.getByLabelText("右侧面板")).not.toHaveAttribute("hidden");
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("false");

      expect(
        consoleErrorSpy.mock.calls.some(([message]) => {
          if (typeof message !== "string") {
            return false;
          }
          return message.includes("non-boolean attribute") && message.includes("inert");
        }),
      ).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("persists zen mode state to localStorage and restores it on next render", async () => {
    window.localStorage.setItem("creonow.layout.zenMode", "true");
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    const frame = screen.getByTestId("workbench-frame");
    expect(frame).toHaveClass("workbench-frame--zen");
    expect(screen.queryByLabelText("CreoNow 工作台")).toBeNull();
    expect(screen.getByRole("contentinfo", { hidden: true })).toHaveAttribute("hidden");
    expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("true");
  });

  it("does NOT toggle zen mode via Shift+Z when focus is inside an editable element", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    const frame = screen.getByTestId("workbench-frame");
    expect(frame).not.toHaveClass("workbench-frame--zen");

    // Simulate Shift+Z from inside an input element.
    const inputEl = document.createElement("input");
    document.body.appendChild(inputEl);
    inputEl.focus();

    fireEvent.keyDown(inputEl, { key: "Z", shiftKey: true });
    expect(frame).not.toHaveClass("workbench-frame--zen");

    // Simulate Shift+Z from inside a contentEditable element.
    const editableEl = document.createElement("div");
    editableEl.contentEditable = "true";
    document.body.appendChild(editableEl);
    editableEl.focus();

    fireEvent.keyDown(editableEl, { key: "Z", shiftKey: true });
    expect(frame).not.toHaveClass("workbench-frame--zen");

    // Simulate Shift+Z from inside a textarea element.
    const textareaEl = document.createElement("textarea");
    document.body.appendChild(textareaEl);
    textareaEl.focus();

    fireEvent.keyDown(textareaEl, { key: "Z", shiftKey: true });
    expect(frame).not.toHaveClass("workbench-frame--zen");

    // Now dispatch from window (non-editable) — SHOULD toggle.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(frame).toHaveClass("workbench-frame--zen");

    // Cleanup.
    document.body.removeChild(inputEl);
    document.body.removeChild(editableEl);
    document.body.removeChild(textareaEl);
  });

  it("toggles zen mode via Shift+Z keyboard shortcut from non-editable context", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    const frame = screen.getByTestId("workbench-frame");
    expect(frame).not.toHaveClass("workbench-frame--zen");

    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(frame).toHaveClass("workbench-frame--zen");
    expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("true");

    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(frame).not.toHaveClass("workbench-frame--zen");
    expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("false");
  });

  it("blocks Ctrl+\\ and Ctrl+L shortcuts while zen mode is active", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    const frame = screen.getByTestId("workbench-frame");

    // Verify sidebar and right panel are visible before zen mode.
    expect(screen.getByLabelText("左侧边栏")).toBeInTheDocument();
    expect(screen.getByLabelText("右侧面板")).toBeInTheDocument();
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).not.toBe("true");
    expect(window.localStorage.getItem("creonow.layout.panelCollapsed")).not.toBe("true");

    // Enter zen mode.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(frame).toHaveClass("workbench-frame--zen");

    // Attempt Ctrl+\ (toggle sidebar) — should be blocked in zen mode.
    fireEvent.keyDown(window, { ctrlKey: true, key: "\\" });
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).not.toBe("true");

    // Attempt Ctrl+L (toggle right panel) — should be blocked in zen mode.
    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(window.localStorage.getItem("creonow.layout.panelCollapsed")).not.toBe("true");

    // Exit zen mode.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(frame).not.toHaveClass("workbench-frame--zen");

    // After exiting zen, sidebar and panel should still be in their original state.
    expect(screen.getByLabelText("左侧边栏")).toBeInTheDocument();
    expect(screen.getByLabelText("右侧面板")).toBeInTheDocument();

    // Now Ctrl+\ and Ctrl+L should work normally outside zen mode.
    fireEvent.keyDown(window, { ctrlKey: true, key: "\\" });
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("true");

    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });
    expect(window.localStorage.getItem("creonow.layout.panelCollapsed")).toBe("true");
  });

  it("hides 'Open AI Panel' button during zen mode when right panel is collapsed", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    // Collapse the right panel first.
    fireEvent.keyDown(window, { ctrlKey: true, key: "l" });

    // Verify the button appears when not in zen mode.
    expect(screen.getByRole("button", { name: "打开 AI 面板" })).toBeInTheDocument();

    // Enter zen mode.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });

    // Button should be hidden during zen.
    expect(screen.queryByRole("button", { name: "打开 AI 面板" })).not.toBeInTheDocument();

    // Exit zen — button should reappear.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(screen.getByRole("button", { name: "打开 AI 面板" })).toBeInTheDocument();
  });

  it("does not mutate layout when async document creation resolves during zen mode", async () => {
    // Deferred promise lets us control when createDocument resolves.
    let resolveCreate!: (value: { ok: true; data: { documentId: string } }) => void;
    const createPromise = new Promise<{ ok: true; data: { documentId: string } }>((resolve) => {
      resolveCreate = resolve;
    });
    window.api!.file!.createDocument = vi.fn(() => createPromise) as NonNullable<typeof window.api>["file"]["createDocument"];

    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    // Trigger async createDocument (the promise is still pending).
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建文档" }));
      await Promise.resolve();
    });

    // Move layout to a NON-default state that differs from what the handler
    // would set (activeLeftPanel="files", sidebarCollapsed=false). This ensures
    // the assertion is meaningful — if the zen guard were absent, the handler
    // would overwrite these values back to the defaults and the test would fail.
    fireEvent.keyDown(window, { ctrlKey: true, key: "\\" }); // collapse sidebar
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("true");

    // Switch to settings panel (away from "files").
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe("settings");

    // Enter zen mode while the async operation is in-flight.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("true");

    // Record non-default sidebar state before resolution.
    const sidebarStateBefore = window.localStorage.getItem("creonow.layout.sidebarCollapsed");
    const activeLeftBefore = window.localStorage.getItem("creonow.layout.activeLeftPanel");

    // Resolve the createDocument promise during zen mode.
    await act(async () => {
      resolveCreate({ ok: true, data: { documentId: "doc-2" } });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Layout state must be unchanged — the async callback must NOT call
    // setActiveLeftPanel("files") or setSidebarCollapsed(false) while zen is active.
    // Because we set sidebar to collapsed + settings panel, any unguarded
    // mutation would change these values — making this test fail.
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe(sidebarStateBefore);
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe(activeLeftBefore);
  });

  it("does not mutate layout when async document open resolves during zen mode", async () => {
    const secondDocument = {
      documentId: "doc-2",
      title: "第二章",
      type: "chapter",
      status: "draft",
      sortOrder: 1,
      updatedAt: 2,
    } as const;

    // List two documents so we can click the second one to trigger handleOpenDocument.
    window.api!.file!.listDocuments = vi.fn(async () => ({
      ok: true,
      data: {
        items: [
          { documentId: "doc-1", title: "第一章", type: "chapter", status: "draft", sortOrder: 0, updatedAt: 1 },
          secondDocument,
        ],
      },
    })) as NonNullable<typeof window.api>["file"]["listDocuments"];

    window.api!.file!.setCurrentDocument = vi.fn(async ({ documentId }) => ({
      ok: true,
      data: { documentId },
    })) as NonNullable<typeof window.api>["file"]["setCurrentDocument"];

    // Deferred readDocument lets us control when the open-document IPC resolves.
    let resolveRead!: (value: { ok: true; data: Record<string, unknown> }) => void;
    const readPromise = new Promise<{ ok: true; data: Record<string, unknown> }>((resolve) => {
      resolveRead = resolve;
    });
    const originalReadDocument = window.api!.file!.readDocument;
    let callCount = 0;
    window.api!.file!.readDocument = vi.fn(async (args) => {
      callCount++;
      // First call (bootstrap) resolves immediately; second call (user click) defers.
      if (callCount <= 1) {
        return (originalReadDocument as Function)(args);
      }
      return readPromise;
    }) as NonNullable<typeof window.api>["file"]["readDocument"];

    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    // Click second document — triggers handleOpenDocument with pending readDocument.
    await act(async () => {
      fireEvent.click(screen.getByText("第二章"));
      await Promise.resolve();
    });

    // Move layout to a NON-default state that differs from what handleOpenDocument
    // would set (activeLeftPanel="files", sidebarCollapsed=false). Without the zen
    // guard, the handler would overwrite these values — making the test fail.
    fireEvent.keyDown(window, { ctrlKey: true, key: "\\" }); // collapse sidebar
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe("settings");

    // Enter zen mode while the openDocument IPC is in-flight.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });
    expect(window.localStorage.getItem("creonow.layout.zenMode")).toBe("true");

    const sidebarStateBefore = window.localStorage.getItem("creonow.layout.sidebarCollapsed");
    const activeLeftBefore = window.localStorage.getItem("creonow.layout.activeLeftPanel");

    // Resolve the deferred readDocument during zen mode.
    await act(async () => {
      resolveRead({
        ok: true,
        data: {
          documentId: "doc-2",
          projectId: "project-1",
          title: "第二章",
          type: "chapter",
          status: "draft",
          sortOrder: 1,
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          contentText: "第二章内容",
          contentMd: "",
          contentHash: "hash-2",
          createdAt: 2,
          updatedAt: 2,
        },
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Layout state must be unchanged — handleOpenDocument must NOT call
    // setActiveLeftPanel or setSidebarCollapsed while zen mode is active.
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe(sidebarStateBefore);
    expect(window.localStorage.getItem("creonow.layout.activeLeftPanel")).toBe(activeLeftBefore);
  });

  it("cancels active panel resize when entering zen mode", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    const leftHandle = screen.getByRole("separator", { name: "调整左侧边栏宽度" });
    const frame = screen.getByTestId("workbench-frame");

    const widthBefore = frame.style.getPropertyValue("--left-sidebar-width");

    // Start a resize drag on the left panel.
    fireEvent.mouseDown(leftHandle, { clientX: 260, button: 0 });

    // Enter zen mode mid-drag.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });

    // Simulate mouse movement after zen — width should NOT change.
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window);

    // Exit zen mode.
    fireEvent.keyDown(window, { key: "Z", shiftKey: true });

    // Sidebar width should be unchanged from before the aborted drag.
    expect(frame.style.getPropertyValue("--left-sidebar-width")).toBe(widthBefore);
  });

  it("opens command palette via Ctrl+K and closes it with Escape", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    const palette = screen.getByRole("dialog", { name: "命令面板" });
    expect(palette).toBeInTheDocument();

    const input = within(palette).getByPlaceholderText("搜索页面、场景或动作…");
    fireEvent.change(input, { target: { value: "设置" } });
    expect(within(palette).getByText("设置")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "命令面板" })).not.toBeInTheDocument();
    });
  });

  it("does not collapse sidebar when selecting the current panel from command palette", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });

    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("false");

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    const palette = screen.getByRole("dialog", { name: "命令面板" });
    fireEvent.click(within(palette).getByRole("button", { name: /文件项目文稿与章节入口/ }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "命令面板" })).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("false");
  });

  it("blocks layout-level global shortcuts while command palette is open", async () => {
    render(<WorkbenchApp />);
    await screen.findByRole("heading", { name: "第一章" });
    const frame = screen.getByTestId("workbench-frame");

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    expect(screen.getByRole("dialog", { name: "命令面板" })).toBeInTheDocument();

    fireEvent.keyDown(window, { ctrlKey: true, key: "\\" });
    expect(window.localStorage.getItem("creonow.layout.sidebarCollapsed")).toBe("false");

    fireEvent.keyDown(window, { shiftKey: true, key: "Z" });
    expect(frame).not.toHaveClass("workbench-frame--zen");
  });
});
