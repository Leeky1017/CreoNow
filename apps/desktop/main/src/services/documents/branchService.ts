import { createDocumentCoreService } from "./documentCoreService";
import type {
  BranchListItem,
  BranchService,
  ServiceResult,
  SubServiceFactoryArgs,
} from "./types";

/**
 * Build branch-focused document service.
 *
 * Why: facade composes stable public contract from dedicated domain services.
 */
export function createBranchService(
  args: SubServiceFactoryArgs,
): BranchService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);
  return {
    createBranch: service.createBranch,
    listBranches: service.listBranches,
    switchBranch: service.switchBranch,
    mergeBranch: service.mergeBranch,
    resolveMergeConflict: service.resolveMergeConflict,
  };
}

export interface BranchWorkflowService {
  ensureMainBranch(args: {
    documentId: string;
    createdBy: string;
  }): ServiceResult<{ branch: BranchListItem }>;
  createSubBranch(args: {
    documentId: string;
    name: string;
    createdBy: string;
  }): ServiceResult<{ branch: BranchListItem }>;
}

/**
 * Build branch workflow helpers on top of core branch operations.
 *
 * Why: expose explicit main-branch bootstrap + sub-branch ergonomics.
 */
export function createBranchWorkflowService(
  args: SubServiceFactoryArgs,
): BranchWorkflowService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);

  return {
    ensureMainBranch({ documentId, createdBy }) {
      const listed = service.listBranches({ documentId });
      if (!listed.ok) {
        return listed;
      }
      const existing = listed.data.branches.find((branch) => branch.name === "main");
      if (existing) {
        return { ok: true, data: { branch: existing } };
      }
      return service.createBranch({
        documentId,
        name: "main",
        createdBy,
      });
    },
    createSubBranch({ documentId, name, createdBy }) {
      const ensured = this.ensureMainBranch({ documentId, createdBy });
      if (!ensured.ok) {
        return ensured;
      }
      return service.createBranch({ documentId, name, createdBy });
    },
  };
}
