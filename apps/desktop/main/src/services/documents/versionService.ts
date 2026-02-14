import { createDocumentCoreService } from "./documentCoreService";
import type { SubServiceFactoryArgs, VersionService } from "./types";

/**
 * Build version-focused document service.
 *
 * Why: facade composes stable public contract from dedicated domain services.
 */
export function createVersionService(
  args: SubServiceFactoryArgs,
): VersionService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);
  return {
    listVersions: service.listVersions,
    readVersion: service.readVersion,
    diffVersions: service.diffVersions,
    rollbackVersion: service.rollbackVersion,
    restoreVersion: service.restoreVersion,
  };
}
