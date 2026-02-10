import { describe, expect, it } from "vitest";

import type {
  IpcChannel,
  IpcErrorCode,
  IpcInvokeResult,
  IpcResponseData,
} from "../../../../../packages/shared/types/ipc-generated";
import { createEditorStore, type IpcInvoke } from "./editorStore";

function ok<C extends IpcChannel>(
  _channel: C,
  data: IpcResponseData<C>,
): IpcInvokeResult<C> {
  return { ok: true, data };
}

function err<C extends IpcChannel>(
  _channel: C,
  code: IpcErrorCode,
  message: string,
): IpcInvokeResult<C> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function createReadPayload(
  documentId: string,
): IpcResponseData<"file:document:read"> {
  return {
    documentId,
    projectId: "project-1",
    title: "Doc",
    type: "chapter",
    status: "draft",
    parentId: undefined,
    sortOrder: 0,
    contentJson: JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
      ],
    }),
    contentMd: "Hello",
    contentText: "Hello",
    contentHash: "hash-1",
    createdAt: 1,
    updatedAt: 2,
  };
}

describe("editorStore bootstrap and autosave scenarios", () => {
  it("should bootstrap existing project with current document", async () => {
    const calls: string[] = [];
    const invoke: IpcInvoke = async (channel, _payload) => {
      calls.push(channel);
      if (channel === "file:document:getcurrent") {
        return ok(channel, { documentId: "doc-current" });
      }
      if (channel === "file:document:read") {
        return ok(channel, createReadPayload("doc-current"));
      }
      throw new Error(`Unexpected channel: ${channel}`);
    };

    const store = createEditorStore({ invoke });
    await store.getState().bootstrapForProject("project-1");

    const state = store.getState();
    expect(calls).toEqual(["file:document:getcurrent", "file:document:read"]);
    expect(state.bootstrapStatus).toBe("ready");
    expect(state.projectId).toBe("project-1");
    expect(state.documentId).toBe("doc-current");
    expect(state.documentStatus).toBe("draft");
  });

  it("should bootstrap by creating a document when project has no documents", async () => {
    const calls: string[] = [];
    const invoke: IpcInvoke = async (channel, _payload) => {
      calls.push(channel);
      if (channel === "file:document:getcurrent") {
        return err(channel, "NOT_FOUND", "no current document");
      }
      if (channel === "file:document:list") {
        return ok(channel, { items: [] });
      }
      if (channel === "file:document:create") {
        return ok(channel, { documentId: "doc-created" });
      }
      if (channel === "file:document:setcurrent") {
        return ok(channel, { documentId: "doc-created" });
      }
      if (channel === "file:document:read") {
        return ok(channel, createReadPayload("doc-created"));
      }
      throw new Error(`Unexpected channel: ${channel}`);
    };

    const store = createEditorStore({ invoke });
    await store.getState().bootstrapForProject("project-1");

    const state = store.getState();
    expect(calls).toEqual([
      "file:document:getcurrent",
      "file:document:list",
      "file:document:create",
      "file:document:setcurrent",
      "file:document:read",
    ]);
    expect(state.bootstrapStatus).toBe("ready");
    expect(state.documentId).toBe("doc-created");
  });

  it("should set bootstrap status to error when IPC bootstrap fails", async () => {
    const invoke: IpcInvoke = async (channel, _payload) => {
      if (channel === "file:document:getcurrent") {
        return err(channel, "INTERNAL_ERROR", "main process unavailable");
      }
      throw new Error(`Unexpected channel: ${channel}`);
    };

    const store = createEditorStore({ invoke });
    await store.getState().bootstrapForProject("project-1");

    expect(store.getState().bootstrapStatus).toBe("error");
    expect(store.getState().documentId).toBeNull();
  });

  it("should transition autosave to error on failure and recover through retry", async () => {
    let saveAttempt = 0;
    const invoke: IpcInvoke = async (channel, _payload) => {
      if (channel !== "file:document:save") {
        throw new Error(`Unexpected channel: ${channel}`);
      }
      saveAttempt += 1;
      if (saveAttempt === 1) {
        return err(channel, "IO_ERROR", "disk busy");
      }
      return ok(channel, {
        contentHash: "hash-after-retry",
        updatedAt: 3,
      });
    };

    const store = createEditorStore({ invoke });
    store.setState({
      projectId: "project-1",
      documentId: "doc-1",
      lastSavedOrQueuedJson: JSON.stringify({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Retry" }] },
        ],
      }),
      autosaveStatus: "idle",
      autosaveError: null,
    });

    await store.getState().save({
      projectId: "project-1",
      documentId: "doc-1",
      contentJson: store.getState().lastSavedOrQueuedJson ?? "",
      actor: "auto",
      reason: "autosave",
    });
    expect(store.getState().autosaveStatus).toBe("error");
    expect(store.getState().autosaveError?.code).toBe("IO_ERROR");

    await store.getState().retryLastAutosave();
    expect(store.getState().autosaveStatus).toBe("saved");
    expect(store.getState().autosaveError).toBeNull();
    expect(saveAttempt).toBe(2);
  });
});
