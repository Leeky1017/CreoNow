import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import {
  createKnowledgeGraphQueryService,
  type KnowledgeGraphQueryService,
} from "./kgQueryService";
import {
  createKnowledgeGraphWriteService,
  type KnowledgeGraphWriteService,
} from "./kgWriteService";
import type { KnowledgeGraphService } from "./types";

export * from "./types";

export function createKnowledgeGraphServiceFacade(args: {
  queryService: KnowledgeGraphQueryService;
  writeService: KnowledgeGraphWriteService;
}): KnowledgeGraphService {
  return {
    entityCreate: (entityArgs) => args.writeService.entityCreate(entityArgs),
    entityRead: (entityArgs) => args.writeService.entityRead(entityArgs),
    entityList: (entityArgs) => args.writeService.entityList(entityArgs),
    entityUpdate: (entityArgs) => args.writeService.entityUpdate(entityArgs),
    entityDelete: (entityArgs) => args.writeService.entityDelete(entityArgs),

    relationCreate: (relationArgs) =>
      args.writeService.relationCreate(relationArgs),
    relationList: (relationArgs) => args.writeService.relationList(relationArgs),
    relationUpdate: (relationArgs) =>
      args.writeService.relationUpdate(relationArgs),
    relationDelete: (relationArgs) =>
      args.writeService.relationDelete(relationArgs),

    querySubgraph: (queryArgs) => args.queryService.querySubgraph(queryArgs),
    queryPath: (queryArgs) => args.queryService.queryPath(queryArgs),
    queryValidate: (queryArgs) => args.queryService.queryValidate(queryArgs),
    queryRelevant: (queryArgs) => args.queryService.queryRelevant(queryArgs),
    queryByIds: (queryArgs) => args.queryService.queryByIds(queryArgs),
    buildRulesInjection: (queryArgs) =>
      args.queryService.buildRulesInjection(queryArgs),
  };
}

/**
 * Create a KnowledgeGraphService backed by SQLite (SSOT).
 */
export function createKnowledgeGraphService(args: {
  db: Database.Database;
  logger: Logger;
}): KnowledgeGraphService {
  const queryService = createKnowledgeGraphQueryService(args);
  const writeService = createKnowledgeGraphWriteService(args);

  return createKnowledgeGraphServiceFacade({
    queryService,
    writeService,
  });
}
