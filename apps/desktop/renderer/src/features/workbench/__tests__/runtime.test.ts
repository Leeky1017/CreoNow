import { describe, expect, it, vi } from "vitest";

import {
  StaleAiPreviewError,
  acceptAiPreview,
  bootstrapWorkspace,
  rejectAiPreview,
  requestAiPreview,
  type AiPreview,
} from "@/features/workbench/runtime";
import type { PreloadApi } from "@/lib/preloadApi";

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


function createPreview(overrides: Partial<AiPreview> = {}): AiPreview {
  return {
    context: {
      documentId: "doc-1",
      projectId: "project-1",
      revision: 0,
    },
    executionId: "exec-1",
    originalText: "原文",
    suggestedText: "rewritten",
    runId: "run-1",
    skillId: "rewrite",
    sourceUserEditRevision: 0,
    selection: {
      from: 1,
      to: 3,
      text: "原文",
      selectionTextHash: "hash",
    },
    cursorPosition: null,
    ...overrides,
  };
}

function createApiMock(): PreloadApi {
  const api = {
    project: {
      create: vi.fn(async () => ({ ok: true, data: { projectId: "project-1", rootPath: "/tmp/project-1" } })),
      getCurrent: vi.fn(async () => ({ ok: false, error: { code: "NOT_FOUND", message: "missing", retryable: false } })),
      list: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: { items: [] } })
        .mockResolvedValue({ ok: true, data: { items: [{ projectId: "project-1", name: "默认项目", rootPath: "/tmp/project-1", updatedAt: 1 }] } }),
      setCurrent: vi.fn(async () => ({ ok: true, data: { projectId: "project-1", rootPath: "/tmp/project-1" } })),
    },
    file: {
      createDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1" } })),
      getCurrentDocument: vi.fn(async () => ({ ok: false, error: { code: "NOT_FOUND", message: "missing", retryable: false } })),
      listDocuments: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: { items: [] } })
        .mockResolvedValue({ ok: true, data: { items: [{ documentId: "doc-1", title: "第一章", type: "chapter", status: "draft", sortOrder: 0, updatedAt: 1 }] } }),
      readDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1", projectId: "project-1", title: "第一章", type: "chapter", status: "draft", sortOrder: 0, contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }), contentText: "", contentMd: "", contentHash: "hash", createdAt: 1, updatedAt: 1 } })),
      saveDocument: vi.fn(async () => ({ ok: true, data: { updatedAt: 2, contentHash: "hash-2" } })),
      setCurrentDocument: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1" } })),
    },
    ai: {
      confirmSkill: vi.fn(async ({ executionId, action, projectId }) => ({
        ok: true,
        data: {
          executionId,
          runId: "run-1",
          status: action === "accept" ? "completed" : "rejected",
          outputText: "rewritten",
          projectId,
        },
      })),
      cancelSkill: vi.fn(async () => ({ ok: true, data: { canceled: true } })),
      runSkill: vi.fn(async () => ({ ok: true, data: { executionId: "exec-1", runId: "run-1", outputText: "rewritten" } })),
      submitSkillFeedback: vi.fn(async () => ({ ok: true, data: { recorded: true } })),
    },
    version: {
      listSnapshots: vi.fn(async () => ({ ok: true, data: { items: [] } })),
    },
  };

  return api as unknown as PreloadApi;
}

describe("workbench runtime helpers", () => {
  it("bootstraps a missing project and document for the renderer path", async () => {
    const api = createApiMock();
    const workspace = await bootstrapWorkspace(api, {
      defaultProjectName: "默认项目",
      defaultDocumentTitle: "第一章",
    });

    expect(api.project.create).toHaveBeenCalled();
    expect(api.file.createDocument).toHaveBeenCalled();
    expect(workspace.activeDocument.documentId).toBe("doc-1");
  });

  it("requests AI preview and confirms accept through the preview contract", async () => {
    const api = createApiMock();
    const bridge = {
      getContent: vi.fn(() => ({ type: "doc" })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const preview = await requestAiPreview({
      api,
      context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
      skillId: "rewrite",
      instruction: "润色",
      model: "gpt-4.1-mini",
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: "hash",
      },
      userEditRevision: 0,
    });

    expect(preview.suggestedText).toBe("rewritten");
    expect(preview.executionId).toBe("exec-1");
    expect(preview.sourceUserEditRevision).toBe(0);
    expect(api.ai.runSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        hasSelection: true,
        selection: expect.objectContaining({
          from: 1,
          to: 3,
          text: "原文",
          selectionTextHash: "hash",
        }),
      }),
    );

    await acceptAiPreview({
      api,
      bridge,
      preview: preview as AiPreview,
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 0,
    });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(api.file.saveDocument).not.toHaveBeenCalled();
    expect(api.ai.submitSkillFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ action: "accept", runId: "run-1" }),
    );
  });

  it("reads accept state back from the preview context instead of any caller-side active document", async () => {
    const api = createApiMock();
    const bridge = {
      getContent: vi.fn()
        .mockImplementationOnce(() => ({ type: "doc" }))
        .mockImplementationOnce(() => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "跨文档 accept" }] }] })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    await acceptAiPreview({
      api,
      bridge,
      preview: createPreview({ context: { documentId: "doc-preview", projectId: "project-preview", revision: 7 } }),
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 7,
    });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-preview",
    });
    expect(api.file.readDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-preview",
      documentId: "doc-preview",
    }));
  });

  it("returns a visible feedback error when accept feedback responds with ok:false after save", async () => {
    const api = createApiMock();
    api.ai.submitSkillFeedback = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof api.ai.submitSkillFeedback;
    const bridge = {
      getContent: vi.fn(() => ({ type: "doc" })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const result = await acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 0,
    });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(bridge.setContent).toHaveBeenCalledWith({ type: "doc", content: [{ type: "paragraph" }] });
    expect(result.updatedAt).toBe(1);
    expect(result.feedbackError).toMatchObject({ code: "DB_ERROR", message: "feedback failed" });
  });


  it("rolls back the applied accept draft when confirm fails before any later edits", async () => {
    const api = createApiMock();
    api.ai.confirmSkill = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "save failed" },
    })) as typeof api.ai.confirmSkill;
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受后的文稿" }] }],
    };
    const bridge = {
      getContent: vi.fn()
        .mockImplementationOnce(() => beforeApply)
        .mockImplementationOnce(() => acceptedDocument)
        .mockImplementationOnce(() => acceptedDocument),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    await expect(acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 0,
    })).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(bridge.setContent).toHaveBeenCalledWith(beforeApply);
  });

  it("does not accept when confirm resolves ok:true but status rejected", async () => {
    const api = createApiMock();
    api.ai.confirmSkill = vi.fn(async () => ({
      ok: true as const,
      data: {
        executionId: "exec-1",
        runId: "run-1",
        status: "rejected" as const,
        outputText: "rewritten",
      },
    })) as typeof api.ai.confirmSkill;
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受后的文稿" }] }],
    };
    const bridge = {
      getContent: vi.fn()
        .mockImplementationOnce(() => beforeApply)
        .mockImplementationOnce(() => acceptedDocument)
        .mockImplementationOnce(() => acceptedDocument),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    await expect(acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 0,
    })).rejects.toMatchObject({ code: "PERMISSION_DENIED", message: "AI preview confirmation was rejected" });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(bridge.setContent).toHaveBeenCalledWith(beforeApply);
  });

  it("blocks accept when document was edited after preview generation", async () => {
    const api = createApiMock();
    const bridge = {
      getContent: vi.fn(() => ({ type: "doc" })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    await expect(acceptAiPreview({
      api,
      bridge,
      preview: createPreview({ sourceUserEditRevision: 3 }),
      getUserEditRevision: () => 4,
      getEditorContextRevision: () => 0,
    })).rejects.toBeInstanceOf(StaleAiPreviewError);

    expect(bridge.getContent).not.toHaveBeenCalled();
    expect(bridge.replaceSelection).not.toHaveBeenCalled();
    expect(api.ai.confirmSkill).not.toHaveBeenCalled();
  });

  it("does not roll back when real post-accept edits happened but content later returns to the accepted payload", async () => {
    const api = createApiMock();
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受后的文稿" }] }],
    };
    let currentContent = beforeApply;
    let userEditRevision = 0;
    const confirmResult = createDeferred<{ ok: false; error: { code: "DB_ERROR"; message: string } }>();
    api.ai.confirmSkill = vi.fn(async () => confirmResult.promise) as typeof api.ai.confirmSkill;
    const bridge = {
      getContent: vi.fn(() => currentContent),
      replaceSelection: vi.fn(() => {
        currentContent = acceptedDocument;
        return { ok: true as const };
      }),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const acceptPromise = acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => userEditRevision,
      getEditorContextRevision: () => 0,
    });

    userEditRevision = 2;
    currentContent = acceptedDocument;
    confirmResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "save failed" } });

    await expect(acceptPromise).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(bridge.setContent).not.toHaveBeenCalled();
  });

  it("does not roll back when the editor context switches before accept save fails", async () => {
    const api = createApiMock();
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 A 接受后的文稿" }] }],
    };
    const switchedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "文档 B 当前内容" }] }],
    };
    let currentContent = beforeApply;
    let editorContextRevision = 0;
    const confirmResult = createDeferred<{ ok: false; error: { code: "DB_ERROR"; message: string } }>();
    api.ai.confirmSkill = vi.fn(async () => confirmResult.promise) as typeof api.ai.confirmSkill;
    const bridge = {
      getContent: vi.fn(() => currentContent),
      replaceSelection: vi.fn(() => {
        currentContent = acceptedDocument;
        return { ok: true as const };
      }),
      setContent: vi.fn((content) => {
        currentContent = content as typeof currentContent;
      }),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const acceptPromise = acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => editorContextRevision,
    });

    editorContextRevision = 1;
    bridge.setContent(switchedDocument);
    confirmResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "save failed" } });

    await expect(acceptPromise).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(currentContent).toEqual(switchedDocument);
    expect(bridge.setContent).toHaveBeenCalledTimes(1);
    expect(bridge.setContent).toHaveBeenCalledWith(switchedDocument);
  });

  it("keeps newer user edits visible when accept save fails after later typing", async () => {
    const api = createApiMock();
    const beforeApply = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "原文" }] }],
    };
    const acceptedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受后的文稿" }] }],
    };
    const continuedDraft = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "接受失败时用户继续输入" }] }],
    };
    let currentContent = beforeApply;
    let userEditRevision = 0;
    const confirmResult = createDeferred<{ ok: false; error: { code: "DB_ERROR"; message: string } }>();
    api.ai.confirmSkill = vi.fn(async () => confirmResult.promise) as typeof api.ai.confirmSkill;
    const bridge = {
      getContent: vi.fn(() => currentContent),
      replaceSelection: vi.fn(() => {
        currentContent = acceptedDocument;
        return { ok: true as const };
      }),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const acceptPromise = acceptAiPreview({
      api,
      bridge,
      preview: createPreview(),
      getUserEditRevision: () => userEditRevision,
      getEditorContextRevision: () => 0,
    });

    userEditRevision = 1;
    currentContent = continuedDraft;
    confirmResult.resolve({ ok: false, error: { code: "DB_ERROR", message: "save failed" } });

    await expect(acceptPromise).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "accept",
      projectId: "project-1",
    });
    expect(bridge.setContent).not.toHaveBeenCalled();
  });

  it("routes preview rejection through the confirm contract", async () => {
    const api = createApiMock();
    api.ai.confirmSkill = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof api.ai.confirmSkill;

    await expect(rejectAiPreview(api, createPreview())).rejects.toMatchObject({ code: "DB_ERROR", message: "feedback failed" });
    expect(api.ai.confirmSkill).toHaveBeenCalledWith({
      executionId: "exec-1",
      action: "reject",
      projectId: "project-1",
    });
    expect(api.ai.submitSkillFeedback).not.toHaveBeenCalled();
  });
});

describe("skill-specific requestAiPreview paths", () => {
  it("polish: sends builtin:polish with selection, no instruction", async () => {
    const api = createApiMock();
    const selection = { from: 1, to: 5, text: "原文", selectionTextHash: "h" };

    const preview = await requestAiPreview({
      api,
      context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
      skillId: "polish",
      selection,
      instruction: "",
      model: "gpt-4.1-mini",
      userEditRevision: 0,
    });

    expect(preview.skillId).toBe("polish");
    expect(preview.selection).toEqual(selection);
    expect(preview.cursorPosition).toBeNull();
    expect(api.ai.runSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "builtin:polish",
        hasSelection: true,
        selection,
        input: "原文",
      }),
    );
  });

  it("rewrite: sends builtin:rewrite with selection and instruction", async () => {
    const api = createApiMock();
    const selection = { from: 1, to: 5, text: "原文", selectionTextHash: "h" };

    const preview = await requestAiPreview({
      api,
      context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
      skillId: "rewrite",
      selection,
      instruction: "改为更忧伤的语气",
      model: "gpt-4.1-mini",
      userEditRevision: 0,
    });

    expect(preview.skillId).toBe("rewrite");
    expect(preview.selection).toEqual(selection);
    expect(preview.cursorPosition).toBeNull();
    expect(api.ai.runSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "builtin:rewrite",
        hasSelection: true,
        selection,
        input: expect.stringContaining("改为更忧伤的语气"),
      }),
    );
  });

  it("continue: sends builtin:continue with precedingText and cursorPosition, no selection", async () => {
    const api = createApiMock();
    const cursorContext = { precedingText: "夜幕降临，街灯次第亮起。", position: 14 };

    const preview = await requestAiPreview({
      api,
      context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
      skillId: "continue",
      selection: null,
      cursorContext,
      instruction: "",
      model: "gpt-4.1-mini",
      userEditRevision: 0,
    });

    expect(preview.skillId).toBe("continue");
    expect(preview.selection).toBeNull();
    expect(preview.cursorPosition).toBe(14);
    expect(api.ai.runSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "builtin:continue",
        hasSelection: false,
        precedingText: "夜幕降临，街灯次第亮起。",
        cursorPosition: 14,
      }),
    );
  });

  it("continue: throws skill-context-empty when precedingText is empty", async () => {
    const api = createApiMock();

    await expect(requestAiPreview({
      api,
      context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
      skillId: "continue",
      selection: null,
      cursorContext: { precedingText: "   ", position: 0 },
      instruction: "",
      model: "gpt-4.1-mini",
      userEditRevision: 0,
    })).rejects.toThrow("skill-context-empty");
  });

  it("acceptAiPreview for continue calls insertAtCursor instead of replaceSelection", async () => {
    const api = createApiMock();
    const insertAtCursor = vi.fn(() => ({ ok: true as const }));
    const bridge = {
      getContent: vi.fn(() => ({ type: "doc" })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      insertAtCursor,
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const continuePreview = createPreview({
      skillId: "continue",
      selection: null,
      cursorPosition: 14,
      originalText: "夜幕降临，",
    });

    await acceptAiPreview({
      api,
      bridge,
      preview: continuePreview,
      getUserEditRevision: () => 0,
      getEditorContextRevision: () => 0,
    });

    expect(insertAtCursor).toHaveBeenCalledWith(14, "rewritten");
    expect(bridge.replaceSelection).not.toHaveBeenCalled();
  });
});