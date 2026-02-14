import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { createKnowledgeGraphCoreService } from "./kgCoreService";
import type { KnowledgeGraphService } from "./types";

export type KnowledgeGraphQueryService = Pick<
  KnowledgeGraphService,
  | "querySubgraph"
  | "queryPath"
  | "queryValidate"
  | "queryRelevant"
  | "queryByIds"
  | "buildRulesInjection"
>;

export function createKnowledgeGraphQueryService(args: {
  db: Database.Database;
  logger: Logger;
}): KnowledgeGraphQueryService {
  const coreService = createKnowledgeGraphCoreService(args);

  return {
    querySubgraph: (queryArgs) => coreService.querySubgraph(queryArgs),
    queryPath: (queryArgs) => coreService.queryPath(queryArgs),
    queryValidate: (queryArgs) => coreService.queryValidate(queryArgs),
    queryRelevant: (queryArgs) => coreService.queryRelevant(queryArgs),
    queryByIds: (queryArgs) => coreService.queryByIds(queryArgs),
    buildRulesInjection: (queryArgs) =>
      coreService.buildRulesInjection(queryArgs),
  };
}
