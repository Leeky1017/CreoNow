import type { ContextLayerFetcher } from "../types";
import type { KnowledgeGraphService } from "../../kg/kgService";
import { formatEntityForContext } from "../utils/formatEntity";

const KG_UNAVAILABLE_WARNING = "KG_UNAVAILABLE: 知识图谱数据未注入";

export type RulesFetcherDeps = {
  kgService: Pick<KnowledgeGraphService, "entityList">;
};

/**
 * Why: Rules-layer KG injection must degrade gracefully instead of breaking
 * full context assembly when KG query is temporarily unavailable.
 */
export function createRulesFetcher(
  deps: RulesFetcherDeps,
): ContextLayerFetcher {
  return async (request) => {
    try {
      const listed = await Promise.resolve(
        deps.kgService.entityList({
          projectId: request.projectId,
          filter: { aiContextLevel: "always" },
        }),
      );

      if (!listed.ok) {
        return {
          chunks: [],
          warnings: [KG_UNAVAILABLE_WARNING],
        };
      }

      const alwaysItems = listed.data.items.filter(
        (entity) => entity.aiContextLevel === "always",
      );

      if (alwaysItems.length === 0) {
        return {
          chunks: [],
        };
      }

      return {
        chunks: alwaysItems.map((entity) => ({
          source: `kg:always:${entity.id}`,
          projectId: entity.projectId,
          content: formatEntityForContext(entity),
        })),
      };
    } catch {
      return {
        chunks: [],
        warnings: [KG_UNAVAILABLE_WARNING],
      };
    }
  };
}
