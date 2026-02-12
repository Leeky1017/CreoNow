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

function createBranchMergeInvokeMock(args?: {
  resolveShouldFail?: boolean;
}): IpcInvoke {
  return vi.fn(async (channel, payload) => {
    if (channel === "version:branch:merge") {
      const request = payload as { documentId: string };
      if (request.documentId === "doc-conflict") {
        return err(channel, "CONFLICT", "Merge conflict detected");
      }
      return ok(channel, {
        status: "merged",
        mergeSnapshotId: "v-merge-1",
      });
    }

    if (channel === "version:conflict:resolve") {
      if (args?.resolveShouldFail) {
        return err(channel, "DB_ERROR", "resolve failed");
      }
      return ok(channel, {
        status: "merged",
        mergeSnapshotId: "v-merge-resolved",
      });
    }

    if (channel === "version:snapshot:list") {
      return ok(channel, { items: [] });
    }

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

    return err(channel, "NOT_FOUND", "unexpected channel");
  });
}

describe("versionStore branch merge conflict workflow", () => {
  it("should enter conflict state when merge returns CONFLICT", async () => {
    const store = createVersionStore({
      invoke: createBranchMergeInvokeMock(),
    });

    await store.getState().mergeBranch({
      documentId: "doc-conflict",
      sourceBranchName: "alt-ending",
      targetBranchName: "main",
    });

    expect(store.getState().branchMergeStatus).toBe("conflict");
    expect(store.getState().branchMergeError?.code).toBe("CONFLICT");
  });

  it("should resolve conflict and return to ready state", async () => {
    const store = createVersionStore({
      invoke: createBranchMergeInvokeMock(),
    });

    await store.getState().mergeBranch({
      documentId: "doc-conflict",
      sourceBranchName: "alt-ending",
      targetBranchName: "main",
    });

    await store.getState().resolveBranchConflict({
      documentId: "doc-conflict",
      mergeSessionId: "merge-session-1",
      resolutions: [
        {
          conflictId: "conflict-1",
          resolution: "manual",
          manualText: "resolved line",
        },
      ],
      resolvedBy: "tester",
    });

    expect(store.getState().branchMergeStatus).toBe("ready");
    expect(store.getState().branchMergeError).toBeNull();
  });
});
