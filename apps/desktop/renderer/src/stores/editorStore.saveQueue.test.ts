import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueMock, createEditorSaveQueueMock } = vi.hoisted(() => {
  type CreateQueueOptions = {
    executeSave: (request: {
      projectId: string;
      documentId: string;
      contentJson: string;
      actor: "user" | "auto";
      reason: "manual-save" | "autosave";
    }) => Promise<void>;
    onExecuteSaveError?: (args: {
      request: {
        projectId: string;
        documentId: string;
        contentJson: string;
        actor: "user" | "auto";
        reason: "manual-save" | "autosave";
      };
      error: unknown;
    }) => void;
  };
  const enqueue = vi.fn<
    (request: {
      projectId: string;
      documentId: string;
      contentJson: string;
      actor: "user" | "auto";
      reason: "manual-save" | "autosave";
    }) => Promise<void>
  >();

  const createQueue = vi.fn((_: CreateQueueOptions) => ({
    enqueue,
  }));

  return {
    enqueueMock: enqueue,
    createEditorSaveQueueMock: createQueue,
  };
});

vi.mock("./editorSaveQueue", () => ({
  createEditorSaveQueue: createEditorSaveQueueMock,
}));

import { createEditorStore, type IpcInvoke } from "./editorStore";

describe("editorStore save queue delegation", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    enqueueMock.mockResolvedValue(undefined);
    createEditorSaveQueueMock.mockClear();
  });

  it("should delegate save requests to editorSaveQueue", async () => {
    const invoke: IpcInvoke = async (channel) => {
      throw new Error(`Unexpected invoke in mocked queue test: ${channel}`);
    };

    const store = createEditorStore({ invoke });
    const request = {
      projectId: "project-1",
      documentId: "doc-1",
      contentJson: '{"v":1}',
      actor: "auto" as const,
      reason: "autosave" as const,
    };

    await store.getState().save(request);

    expect(createEditorSaveQueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith(request);
  });
  it("should map queue executeSave throw to autosaveError", () => {
    const invoke: IpcInvoke = async (channel) => {
      throw new Error(`Unexpected invoke in mocked queue test: ${channel}`);
    };

    const store = createEditorStore({ invoke });
    store.setState({
      projectId: "project-1",
      documentId: "doc-1",
      autosaveStatus: "idle",
      autosaveError: null,
    });

    const queueOptions = createEditorSaveQueueMock.mock.calls[0]?.[0];
    expect(queueOptions).toBeTruthy();

    queueOptions?.onExecuteSaveError?.({
      request: {
        projectId: "project-1",
        documentId: "doc-1",
        contentJson: '{"v":1}',
        actor: "auto",
        reason: "autosave",
      },
      error: new Error("save exploded"),
    });

    expect(store.getState().autosaveStatus).toBe("error");
    expect(store.getState().autosaveError).toEqual({
      code: "INTERNAL_ERROR",
      message: "save exploded",
    });
  });
});
