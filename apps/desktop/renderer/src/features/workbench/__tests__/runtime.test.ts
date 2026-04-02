import { describe, expect, it, vi } from "vitest";

import { acceptAiPreview, bootstrapWorkspace, rejectAiPreview, requestAiPreview, type AiPreview } from "@/features/workbench/runtime";
import type { PreloadApi } from "@/lib/preloadApi";

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

  it("requests AI preview and persists accept with ai-accept reason", async () => {
    const api = createApiMock();
    const bridge = {
      getContent: vi.fn(() => ({ type: "doc" })),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    const preview = await requestAiPreview({
      api,
      projectId: "project-1",
      documentId: "doc-1",
      instruction: "润色",
      model: "gpt-4.1-mini",
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: "hash",
      },
    });

    expect(preview.suggestedText).toBe("rewritten");
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
      projectId: "project-1",
      documentId: "doc-1",
      preview: preview as AiPreview,
    });

    expect(api.file.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "ai", reason: "ai-accept" }),
    );
    expect(api.ai.submitSkillFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ action: "accept", runId: "run-1" }),
    );
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
      projectId: "project-1",
      documentId: "doc-1",
      preview: {
        originalText: "原文",
        suggestedText: "rewritten",
        runId: "run-1",
        selection: {
          from: 1,
          to: 3,
          text: "原文",
          selectionTextHash: "hash",
        },
      },
    });

    expect(api.file.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "ai", reason: "ai-accept" }),
    );
    expect(bridge.setContent).not.toHaveBeenCalled();
    expect(result.updatedAt).toBe(2);
    expect(result.feedbackError).toMatchObject({ code: "DB_ERROR", message: "feedback failed" });
  });


  it("rolls back the applied accept draft when save fails before any later edits", async () => {
    const api = createApiMock();
    api.file.saveDocument = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "save failed" },
    })) as typeof api.file.saveDocument;
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
      projectId: "project-1",
      documentId: "doc-1",
      preview: {
        originalText: "原文",
        suggestedText: "rewritten",
        runId: "run-1",
        selection: {
          from: 1,
          to: 3,
          text: "原文",
          selectionTextHash: "hash",
        },
      },
    })).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.file.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "ai", reason: "ai-accept", contentJson: JSON.stringify(acceptedDocument) }),
    );
    expect(bridge.setContent).toHaveBeenCalledWith(beforeApply);
  });

  it("keeps newer user edits visible when accept save fails after later typing", async () => {
    const api = createApiMock();
    api.file.saveDocument = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "save failed" },
    })) as typeof api.file.saveDocument;
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
    const bridge = {
      getContent: vi.fn()
        .mockImplementationOnce(() => beforeApply)
        .mockImplementationOnce(() => acceptedDocument)
        .mockImplementationOnce(() => continuedDraft),
      replaceSelection: vi.fn(() => ({ ok: true as const })),
      setContent: vi.fn(),
    } as unknown as Parameters<typeof acceptAiPreview>[0]["bridge"];

    await expect(acceptAiPreview({
      api,
      bridge,
      projectId: "project-1",
      documentId: "doc-1",
      preview: {
        originalText: "原文",
        suggestedText: "rewritten",
        runId: "run-1",
        selection: {
          from: 1,
          to: 3,
          text: "原文",
          selectionTextHash: "hash",
        },
      },
    })).rejects.toMatchObject({ code: "DB_ERROR", message: "save failed" });

    expect(api.file.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "ai", reason: "ai-accept", contentJson: JSON.stringify(acceptedDocument) }),
    );
    expect(bridge.setContent).not.toHaveBeenCalled();
  });

  it("rejects preview dismissal when feedback responds with ok:false", async () => {
    const api = createApiMock();
    api.ai.submitSkillFeedback = vi.fn(async () => ({
      ok: false,
      error: { code: "DB_ERROR", message: "feedback failed" },
    })) as typeof api.ai.submitSkillFeedback;

    await expect(rejectAiPreview(api, {
      originalText: "原文",
      suggestedText: "rewritten",
      runId: "run-1",
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: "hash",
      },
    })).rejects.toMatchObject({ code: "DB_ERROR", message: "feedback failed" });
  });
});
