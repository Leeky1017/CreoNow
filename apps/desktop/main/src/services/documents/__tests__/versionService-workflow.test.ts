import { describe, expect, it, vi } from "vitest";

import { createVersionService, createVersionWorkflowService } from "../versionService";

describe("versionService workflow", () => {
  it("createVersionService 透传 core version methods", () => {
    const baseService = {
      listVersions: vi.fn(),
      readVersion: vi.fn(),
      diffVersions: vi.fn(),
      rollbackVersion: vi.fn(),
      restoreVersion: vi.fn(),
    };
    const service = createVersionService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: baseService as never,
    });
    expect(service.listVersions).toBe(baseService.listVersions);
    expect(service.readVersion).toBe(baseService.readVersion);
    expect(service.diffVersions).toBe(baseService.diffVersions);
    expect(service.rollbackVersion).toBe(baseService.rollbackVersion);
    expect(service.restoreVersion).toBe(baseService.restoreVersion);
  });

  it("三阶段提交：pre-write snapshot → ai-writing → user-confirmed", () => {
    const save = vi.fn().mockReturnValue({
      ok: true,
      data: { versionId: "snap-pre-1", updatedAt: 1, contentHash: "hash-1" },
    });
    const read = vi.fn().mockReturnValue({
      ok: true,
      data: { contentJson: "{\"type\":\"doc\",\"content\":[]}" },
    });
    const rollbackVersion = vi.fn();
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        save,
        read,
        listVersions: vi.fn().mockReturnValue({ ok: true, data: { items: [] } }),
        rollbackVersion,
      } as never,
    });

    const created = workflow.createPreWriteSnapshot({
      projectId: "proj-1",
      documentId: "doc-1",
      executionId: "exec-1",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.data.stage).toBe("snapshot-created");

    const writing = workflow.markAiWriting("exec-1");
    expect(writing.ok && writing.data.stage).toBe("ai-writing");

    const confirmed = workflow.confirmCommit({
      executionId: "exec-1",
      projectId: "proj-1",
    });
    expect(confirmed.ok && confirmed.data.stage).toBe("user-confirmed");
    expect(workflow.readCommit("exec-1")).toBeNull();
    expect(save).toHaveBeenLastCalledWith({
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: { type: "doc", content: [] },
      actor: "ai",
      reason: "ai-accept",
    });
    expect(rollbackVersion).not.toHaveBeenCalled();
  });

  it("用户拒绝时回滚到 preWriteSnapshotId，并标记 user-rejected", () => {
    const save = vi.fn().mockReturnValue({
      ok: true,
      data: { versionId: "snap-pre-2", updatedAt: 1, contentHash: "hash-1" },
    });
    const rollbackVersion = vi.fn().mockReturnValue({
      ok: true,
      data: {
        restored: true,
        preRollbackVersionId: "snap-pre-rollback",
        rollbackVersionId: "snap-rollback",
      },
    });
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        save,
        read: vi.fn().mockReturnValue({
          ok: true,
          data: { contentJson: "{\"type\":\"doc\",\"content\":[]}" },
        }),
        rollbackVersion,
      } as never,
    });
    workflow.createPreWriteSnapshot({
      projectId: "proj-2",
      documentId: "doc-2",
      executionId: "exec-2",
    });
    workflow.markAiWriting("exec-2");

    const rejected = workflow.rejectCommit({
      executionId: "exec-2",
      projectId: "proj-2",
    });
    expect(rollbackVersion).toHaveBeenCalledWith({
      projectId: "proj-2",
      documentId: "doc-2",
      versionId: "snap-pre-2",
    });
    expect(rejected.ok && rejected.data.stage).toBe("user-rejected");
    expect(workflow.readCommit("exec-2")).toBeNull();
  });

  it("createPreWriteSnapshot 若未返回 versionId 则失败", () => {
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        read: vi.fn().mockReturnValue({
          ok: true,
          data: { contentJson: "{\"type\":\"doc\",\"content\":[]}" },
        }),
        save: vi.fn().mockReturnValue({
          ok: true,
          data: { updatedAt: 1, contentHash: "hash-x" },
        }),
        rollbackVersion: vi.fn(),
      } as never,
    });

    const created = workflow.createPreWriteSnapshot({
      projectId: "proj-fail",
      documentId: "doc-fail",
      executionId: "exec-fail",
    });
    expect(created.ok).toBe(false);
  });

  it("rejectCommit 若 rollback 失败则返回失败", () => {
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        save: vi.fn().mockReturnValue({
          ok: true,
          data: { versionId: "snap-pre-3", updatedAt: 1, contentHash: "hash-1" },
        }),
        read: vi.fn().mockReturnValue({
          ok: true,
          data: { contentJson: "{\"type\":\"doc\",\"content\":[]}" },
        }),
        rollbackVersion: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "DB_ERROR", message: "rollback failed" },
        }),
      } as never,
    });
    workflow.createPreWriteSnapshot({
      projectId: "proj-3",
      documentId: "doc-3",
      executionId: "exec-3",
    });
    workflow.markAiWriting("exec-3");

    const rejected = workflow.rejectCommit({
      executionId: "exec-3",
      projectId: "proj-3",
    });
    expect(rejected.ok).toBe(false);
  });

  it("非法状态迁移会 fail-closed", () => {
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        save: vi.fn().mockReturnValue({
          ok: true,
          data: { versionId: "snap-pre-4", updatedAt: 1, contentHash: "hash-1" },
        }),
        read: vi.fn().mockReturnValue({
          ok: true,
          data: { contentJson: "{\"type\":\"doc\",\"content\":[]}" },
        }),
        listVersions: vi.fn().mockReturnValue({ ok: true, data: { items: [] } }),
        rollbackVersion: vi.fn().mockReturnValue({
          ok: true,
          data: {
            restored: true,
            preRollbackVersionId: "snap-pre-rollback",
            rollbackVersionId: "snap-rollback",
          },
        }),
      } as never,
    });
    workflow.createPreWriteSnapshot({
      projectId: "proj-4",
      documentId: "doc-4",
      executionId: "exec-4",
    });

    const directConfirm = workflow.confirmCommit({
      executionId: "exec-4",
      projectId: "proj-4",
    });
    expect(directConfirm.ok).toBe(false);

    const directReject = workflow.rejectCommit({
      executionId: "exec-4",
      projectId: "proj-4",
    });
    expect(directReject.ok).toBe(false);
  });
});
