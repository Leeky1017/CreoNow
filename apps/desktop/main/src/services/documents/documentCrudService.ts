import { createDocumentCoreService } from "./documentCoreService";
import type { DocumentCrudService, SubServiceFactoryArgs } from "./types";

/**
 * Build CRUD-focused document service.
 *
 * Why: facade composes stable public contract from dedicated domain services.
 */
export function createDocumentCrudService(
  args: SubServiceFactoryArgs,
): DocumentCrudService {
  const { baseService, ...coreArgs } = args;
  const service = baseService ?? createDocumentCoreService(coreArgs);
  return {
    create: service.create,
    list: service.list,
    read: service.read,
    update: service.update,
    save: service.save,
    delete: service.delete,
    reorder: service.reorder,
    updateStatus: service.updateStatus,
    getCurrent: service.getCurrent,
    setCurrent: service.setCurrent,
  };
}
