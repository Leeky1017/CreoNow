import type { SkillListItem } from "../../stores/aiStore";

export type ResolvedSkillListItem = SkillListItem & {
  isProjectOverride: boolean;
};

type ScopeKey = "builtin" | "global" | "project";

const SCOPE_PRIORITY: Record<ScopeKey, number> = {
  builtin: 1,
  global: 2,
  project: 3,
};

type ComparableSkill = Pick<SkillListItem, "id" | "name" | "scope">;

/**
 * Build a stable logical key for scope conflict resolution in renderer.
 *
 * Why: panel UX treats same-name skills as one logical skill where project
 * should override global/builtin.
 */
function logicalKey(item: ComparableSkill): string {
  const normalizedName = item.name.trim().toLocaleLowerCase("zh-CN");
  if (normalizedName.length > 0) {
    return `name:${normalizedName}`;
  }

  const idLeaf = item.id.split(":").pop() ?? item.id;
  return `id:${idLeaf.trim().toLocaleLowerCase("en-US")}`;
}

/**
 * Group skills by scope after applying project/global/builtin precedence.
 */
export function resolveSkillsForPicker(items: SkillListItem[]): {
  builtin: ResolvedSkillListItem[];
  global: ResolvedSkillListItem[];
  project: ResolvedSkillListItem[];
} {
  const winners = new Map<
    string,
    { winner: SkillListItem; hiddenScopes: Set<ScopeKey> }
  >();

  for (const item of items) {
    const key = logicalKey(item);
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, { winner: item, hiddenScopes: new Set<ScopeKey>() });
      continue;
    }

    const existingPriority = SCOPE_PRIORITY[existing.winner.scope];
    const nextPriority = SCOPE_PRIORITY[item.scope];
    if (nextPriority > existingPriority) {
      existing.hiddenScopes.add(existing.winner.scope);
      existing.winner = item;
      continue;
    }

    if (nextPriority === existingPriority) {
      if (item.id.localeCompare(existing.winner.id) < 0) {
        existing.hiddenScopes.add(existing.winner.scope);
        existing.winner = item;
      } else {
        existing.hiddenScopes.add(item.scope);
      }
      continue;
    }

    existing.hiddenScopes.add(item.scope);
  }

  const resolved = [...winners.values()].map(({ winner, hiddenScopes }) => ({
    ...winner,
    isProjectOverride:
      winner.scope === "project" &&
      (hiddenScopes.has("global") || hiddenScopes.has("builtin")),
  }));

  const byScope = {
    builtin: [] as ResolvedSkillListItem[],
    global: [] as ResolvedSkillListItem[],
    project: [] as ResolvedSkillListItem[],
  };

  for (const item of resolved.sort((a, b) => a.name.localeCompare(b.name))) {
    byScope[item.scope].push(item);
  }

  return byScope;
}
