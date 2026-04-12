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
import { trieCacheInvalidate } from "./trieCache";
import type { KnowledgeGraphService } from "./types";

export * from "./types";

/**
 * Invalidate the Aho-Corasick trie cache after a successful entity mutation.
 *
 * Why: the cached automaton is built from entity names/aliases. Any CRUD change
 * makes the cached automaton stale. We invalidate (not rebuild) — the next
 * matchEntitiesCached() call lazily rebuilds, keeping write paths fast.
 *
 * @risk If a mutation succeeds but invalidation throws, the cache is stale.
 *   trieCacheInvalidate() is a pure Map.delete — it cannot throw.
 */
function invalidateOnSuccess(
  projectId: string,
  result: { ok: boolean },
): void {
  if (result.ok) {
    trieCacheInvalidate(projectId);
  }
}

export function createKnowledgeGraphServiceFacade(args: {
  queryService: KnowledgeGraphQueryService;
  writeService: KnowledgeGraphWriteService;
}): KnowledgeGraphService {
  return {
    entityCreate: (entityArgs) => {
      const result = args.writeService.entityCreate(entityArgs);
      invalidateOnSuccess(entityArgs.projectId, result);
      return result;
    },
    entityRead: (entityArgs) => args.writeService.entityRead(entityArgs),
    entityList: (entityArgs) => args.writeService.entityList(entityArgs),
    entityUpdate: (entityArgs) => {
      const result = args.writeService.entityUpdate(entityArgs);
      invalidateOnSuccess(entityArgs.projectId, result);
      return result;
    },
    entityDelete: (entityArgs) => {
      const result = args.writeService.entityDelete(entityArgs);
      invalidateOnSuccess(entityArgs.projectId, result);
      return result;
    },

    relationCreate: (relationArgs) =>
      args.writeService.relationCreate(relationArgs),
    relationList: (relationArgs) =>
      args.writeService.relationList(relationArgs),
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
