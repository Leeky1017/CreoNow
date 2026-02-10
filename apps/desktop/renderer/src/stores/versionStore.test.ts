import { describe, expect, it, vi } from "vitest";

import type {
  IpcChannel,
  IpcErrorCode,
  IpcInvokeResult,
  IpcResponseData,
} from "../../../../../packages/shared/types/ipc-generated";
import { createVersionStore, type IpcInvoke } from "./versionStore";

type InvokeArgs = {
  channel: IpcChannel;
  payload: unknown;
};

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

function createInvokeMock() {
  const calls: InvokeArgs[] = [];
  const invoke: IpcInvoke = vi.fn(async (channel, payload) => {
    calls.push({ channel, payload });

    if (channel === "version:snapshot:read") {
      return ok(channel, {
        documentId: "doc-1",
        projectId: "project-1",
        versionId: "v-1",
        actor: "ai",
        reason: "ai-accept",
        contentJson:
          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Historical preview"}]}]}',
        contentText: "Historical preview",
        contentMd: "Historical preview",
        contentHash: "hash-v1",
        wordCount: 2,
        createdAt: 1710000000000,
      });
    }

    if (channel === "version:snapshot:list") {
      return ok(channel, { items: [] });
    }

    return err(channel, "NOT_FOUND", "unexpected channel");
  });

  return { invoke, calls };
}

describe("versionStore preview mode", () => {
  it("should enter preview ready state when snapshot read succeeds", async () => {
    const { invoke, calls } = createInvokeMock();
    const store = createVersionStore({ invoke });

    await store.getState().startPreview("doc-1", {
      versionId: "v-1",
      timestamp: "2h ago",
    });

    expect(calls.some((item) => item.channel === "version:snapshot:read")).toBe(
      true,
    );
    expect(store.getState().previewStatus).toBe("ready");
    expect(store.getState().previewVersionId).toBe("v-1");
    expect(store.getState().previewTimestamp).toBe("2h ago");
    expect(store.getState().previewContentJson).toContain("Historical preview");
  });

  it("should return to current mode when exiting preview", async () => {
    const { invoke } = createInvokeMock();
    const store = createVersionStore({ invoke });

    await store.getState().startPreview("doc-1", {
      versionId: "v-1",
      timestamp: "2h ago",
    });

    store.getState().exitPreview();

    expect(store.getState().previewStatus).toBe("idle");
    expect(store.getState().previewVersionId).toBeNull();
    expect(store.getState().previewTimestamp).toBeNull();
    expect(store.getState().previewContentJson).toBeNull();
  });
});
