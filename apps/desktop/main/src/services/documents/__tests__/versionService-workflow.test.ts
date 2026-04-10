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
    const rollbackVersion = vi.fn();
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        save,
        rollbackVersion,
      } as never,
    });

    const created = workflow.createPreWriteSnapshot({
      projectId: "proj-1",
      documentId: "doc-1",
      executionId: "exec-1",
      contentJson: { type: "doc", content: [] },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.data.stage).toBe("snapshot-created");

    const writing = workflow.markAiWriting("exec-1");
    expect(writing.ok && writing.data.stage).toBe("ai-writing");

    const confirmed = workflow.confirmCommit("exec-1");
    expect(confirmed.ok && confirmed.data.stage).toBe("user-confirmed");
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
        rollbackVersion,
      } as never,
    });
    workflow.createPreWriteSnapshot({
      projectId: "proj-2",
      documentId: "doc-2",
      executionId: "exec-2",
      contentJson: { type: "doc", content: [] },
    });

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
  });

  it("createPreWriteSnapshot 若未返回 versionId 则失败", () => {
    const workflow = createVersionWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
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
      contentJson: { type: "doc", content: [] },
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
      contentJson: { type: "doc", content: [] },
    });

    const rejected = workflow.rejectCommit({
      executionId: "exec-3",
      projectId: "proj-3",
    });
    expect(rejected.ok).toBe(false);
  });
});
