import { createBranchService } from "./branchService";
import { createDocumentCoreService } from "./documentCoreService";
import { createDocumentCrudService } from "./documentCrudService";
import { createVersionService } from "./versionService";
import type { DocumentService, DocumentServiceFactoryArgs } from "./types";

export type {
  BranchConflictResolutionInput,
  BranchListItem,
  BranchMergeConflict,
  DocumentListItem,
  DocumentRead,
  DocumentService,
  DocumentServiceFactoryArgs,
  DocumentStatus,
  DocumentType,
  ServiceResult,
  SnapshotCompactionEvent,
  VersionListItem,
  VersionRead,
  VersionSnapshotActor,
  VersionSnapshotReason,
} from "./types";

/**
 * Create document service facade.
 *
 * Why: keep public contract stable while delegating responsibilities to
 * extracted CRUD/version/branch sub-services.
 */
export function createDocumentService(
  args: DocumentServiceFactoryArgs,
): DocumentService {
  const core = createDocumentCoreService(args);
  const crud = createDocumentCrudService({ ...args, baseService: core });
  const version = createVersionService({ ...args, baseService: core });
  const branch = createBranchService({ ...args, baseService: core });

  return {
    ...crud,
    ...version,
    ...branch,
  };
}
