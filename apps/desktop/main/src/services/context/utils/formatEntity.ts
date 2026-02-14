import type { KnowledgeEntity, KnowledgeEntityType } from "../../kg/kgService";

const DEFAULT_ENTITY_TYPE_LABEL = "实体";

const ENTITY_TYPE_LABELS: Record<KnowledgeEntityType, string> = {
  character: "角色",
  location: "地点",
  event: "事件",
  item: "物品",
  faction: "阵营",
};

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
