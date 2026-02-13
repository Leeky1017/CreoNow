import type { ContextLayerFetcher } from "../layerAssemblyService";
import type {
  KnowledgeEntity,
  KnowledgeEntityType,
  KnowledgeGraphService,
} from "../../kg/kgService";

const KG_UNAVAILABLE_WARNING = "KG_UNAVAILABLE: 知识图谱数据未注入";
const DEFAULT_ENTITY_TYPE_LABEL = "实体";

const ENTITY_TYPE_LABELS: Record<KnowledgeEntityType, string> = {
  character: "角色",
  location: "地点",
  event: "事件",
  item: "物品",
  faction: "阵营",
};

export type RulesFetcherDeps = {
  kgService: Pick<KnowledgeGraphService, "entityList">;
};

/**
 * Why: entity snippets must follow one deterministic format so downstream
 * fetchers (C12) can reuse the same rendering contract.
 */
export function formatEntityForContext(
  entity: Pick<KnowledgeEntity, "name" | "type" | "description" | "attributes">,
): string {
  const typeLabel =
    ENTITY_TYPE_LABELS[entity.type as KnowledgeEntityType] ??
    DEFAULT_ENTITY_TYPE_LABEL;
  const normalizedDescription = entity.description.trim();
  const attributePairs = Object.entries(entity.attributes)
    .filter(([key]) => key.trim().length > 0)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  const attributesLine =
    attributePairs.length > 0
      ? attributePairs
          .map(([key, value]) =>
            value.length > 0 ? `${key}=${value}` : `${key}=`,
          )
          .join(", ")
      : "(none)";

  return [
    `## ${typeLabel}：${entity.name}`,
    `- 类型：${entity.type}`,
    `- 描述：${normalizedDescription}`,
    `- 属性：${attributesLine}`,
  ].join("\n");
}

/**
 * Why: Rules-layer KG injection must degrade gracefully instead of breaking
 * full context assembly when KG query is temporarily unavailable.
 */
export function createRulesFetcher(deps: RulesFetcherDeps): ContextLayerFetcher {
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

      if (listed.data.items.length === 0) {
        return {
          chunks: [],
        };
      }

      return {
        chunks: listed.data.items.map((entity) => ({
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
