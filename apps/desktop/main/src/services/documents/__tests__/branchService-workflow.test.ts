import { describe, expect, it, vi } from "vitest";

import { createBranchService, createBranchWorkflowService } from "../branchService";

describe("branchService workflow", () => {
  it("createBranchService 透传 core branch methods", () => {
    const baseService = {
      createBranch: vi.fn(),
      listBranches: vi.fn(),
      switchBranch: vi.fn(),
      mergeBranch: vi.fn(),
      resolveMergeConflict: vi.fn(),
    };
    const service = createBranchService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: baseService as never,
    });

    expect(service.createBranch).toBe(baseService.createBranch);
    expect(service.listBranches).toBe(baseService.listBranches);
    expect(service.switchBranch).toBe(baseService.switchBranch);
    expect(service.mergeBranch).toBe(baseService.mergeBranch);
    expect(service.resolveMergeConflict).toBe(baseService.resolveMergeConflict);
  });

  it("ensureMainBranch 在缺失时自动创建 main", () => {
    const listBranches = vi
      .fn()
      .mockReturnValueOnce({ ok: true, data: { branches: [] } })
      .mockReturnValueOnce({
        ok: true,
        data: {
          branches: [
            {
              id: "b-main",
              documentId: "doc-1",
              name: "main",
              baseSnapshotId: "snap-1",
              headSnapshotId: "snap-1",
              createdBy: "tester",
              createdAt: 1,
              isCurrent: true,
            },
          ],
        },
      });
    const createBranch = vi.fn().mockReturnValue({
      ok: true,
      data: {
        branch: {
          id: "b-main",
          documentId: "doc-1",
          name: "main",
          baseSnapshotId: "snap-1",
          headSnapshotId: "snap-1",
          createdBy: "tester",
          createdAt: 1,
          isCurrent: true,
        },
      },
    });
    const workflow = createBranchWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        listBranches,
        createBranch,
      } as never,
    });

    const ensured = workflow.ensureMainBranch({
      documentId: "doc-1",
      createdBy: "tester",
    });
    expect(createBranch).toHaveBeenCalledWith({
      documentId: "doc-1",
      name: "main",
      createdBy: "tester",
    });
    expect(ensured.ok).toBe(true);
  });

  it("ensureMainBranch 若 main 已存在则直接返回，不重复创建", () => {
    const listBranches = vi.fn().mockReturnValue({
      ok: true,
      data: {
        branches: [
          {
            id: "b-main",
            documentId: "doc-main",
            name: "main",
            baseSnapshotId: "snap-1",
            headSnapshotId: "snap-1",
            createdBy: "tester",
            createdAt: 1,
            isCurrent: true,
          },
        ],
      },
    });
    const createBranch = vi.fn();
    const workflow = createBranchWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        listBranches,
        createBranch,
      } as never,
    });

    const ensured = workflow.ensureMainBranch({
      documentId: "doc-main",
      createdBy: "tester",
    });
    expect(ensured.ok).toBe(true);
    expect(createBranch).not.toHaveBeenCalled();
  });

  it("createSubBranch 会先确保 main，再创建子分支", () => {
    const listBranches = vi.fn().mockReturnValue({
      ok: true,
      data: {
        branches: [
          {
            id: "b-main",
            documentId: "doc-2",
            name: "main",
            baseSnapshotId: "snap-1",
            headSnapshotId: "snap-1",
            createdBy: "tester",
            createdAt: 1,
            isCurrent: true,
          },
        ],
      },
    });
    const createBranch = vi
      .fn()
      .mockReturnValueOnce({
        ok: true,
        data: {
          branch: {
            id: "b-feature",
            documentId: "doc-2",
            name: "draft-alt",
            baseSnapshotId: "snap-1",
            headSnapshotId: "snap-1",
            createdBy: "tester",
            createdAt: 2,
            isCurrent: false,
          },
        },
      });
    const workflow = createBranchWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        listBranches,
        createBranch,
      } as never,
    });

    const created = workflow.createSubBranch({
      documentId: "doc-2",
      name: "draft-alt",
      createdBy: "tester",
    });
    expect(created.ok).toBe(true);
    expect(createBranch).toHaveBeenCalledTimes(1);
    expect(createBranch).toHaveBeenCalledWith({
      documentId: "doc-2",
      name: "draft-alt",
      createdBy: "tester",
    });
  });

  it("createSubBranch 在 ensureMainBranch 失败时 fail-closed", () => {
    const workflow = createBranchWorkflowService({
      db: {} as never,
      logger: { logPath: "<test>", info: () => {}, error: () => {} } as never,
      baseService: {
        listBranches: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "DB_ERROR", message: "list failed" },
        }),
        createBranch: vi.fn(),
      } as never,
    });

    const created = workflow.createSubBranch({
      documentId: "doc-3",
      name: "draft-x",
      createdBy: "tester",
    });
    expect(created.ok).toBe(false);
  });
});
