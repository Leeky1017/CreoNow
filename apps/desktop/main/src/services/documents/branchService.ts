import { createDocumentCoreService } from "./documentCoreService";
import type { BranchService, SubServiceFactoryArgs } from "./types";

/**
 * Build branch-focused document service.
 *
 * Why: facade composes stable public contract from dedicated domain services.
 */
export function createBranchService(args: SubServiceFactoryArgs): BranchService {
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
