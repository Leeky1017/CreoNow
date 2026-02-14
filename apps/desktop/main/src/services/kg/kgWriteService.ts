import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { createKnowledgeGraphCoreService } from "./kgCoreService";
import type { KnowledgeGraphService } from "./types";

export type KnowledgeGraphWriteService = Pick<
  KnowledgeGraphService,
  | "entityCreate"
  | "entityRead"
  | "entityList"
  | "entityUpdate"
  | "entityDelete"
  | "relationCreate"
  | "relationList"
  | "relationUpdate"
  | "relationDelete"
>;

export function createKnowledgeGraphWriteService(args: {
  db: Database.Database;
  logger: Logger;
}): KnowledgeGraphWriteService {
  const coreService = createKnowledgeGraphCoreService(args);

  return {
    entityCreate: (writeArgs) => coreService.entityCreate(writeArgs),
    entityRead: (writeArgs) => coreService.entityRead(writeArgs),
    entityList: (writeArgs) => coreService.entityList(writeArgs),
    entityUpdate: (writeArgs) => coreService.entityUpdate(writeArgs),
    entityDelete: (writeArgs) => coreService.entityDelete(writeArgs),
    relationCreate: (writeArgs) => coreService.relationCreate(writeArgs),
    relationList: (writeArgs) => coreService.relationList(writeArgs),
    relationUpdate: (writeArgs) => coreService.relationUpdate(writeArgs),
    relationDelete: (writeArgs) => coreService.relationDelete(writeArgs),
  };
}
