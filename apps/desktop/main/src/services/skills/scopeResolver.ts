import type { SkillScope } from "./skillValidator";

type ScopeComparable = {
  id: string;
  name: string;
  scope: SkillScope;
  filePath: string;
};

const SCOPE_PRIORITY: Record<SkillScope, number> = {
  builtin: 1,
  global: 2,
  project: 3,
};

/**
 * Build a stable identity key used for scope precedence resolution.
 *
 * Why: scope override semantics are user-facing by skill name; ids can differ
 * across scopes (e.g. `global:*` vs `project:*`) while representing the same
 * logical skill.
 */
function scopeKey(item: Pick<ScopeComparable, "id" | "name">): string {
  const normalizedName = item.name.trim().toLocaleLowerCase("zh-CN");
  if (normalizedName.length > 0) {
    return `name:${normalizedName}`;
  }

  const idLeaf = item.id.split(":").pop() ?? item.id;
  return `id:${idLeaf.trim().toLocaleLowerCase("en-US")}`;
}

/**
 * Pick the stronger skill between two candidates of the same logical key.
 *
 * Why: `project > global > builtin` is the single source of truth for
 * deterministic scope conflict resolution.
 */
function pickPreferred<T extends ScopeComparable>(left: T, right: T): T {
  const leftPriority = SCOPE_PRIORITY[left.scope];
  const rightPriority = SCOPE_PRIORITY[right.scope];
  if (leftPriority !== rightPriority) {
    return rightPriority > leftPriority ? right : left;
  }

  return left.filePath.localeCompare(right.filePath) <= 0 ? left : right;
}

/**
 * Resolve multiple scope variants into a single visible SSOT set.
 */
export function selectSkillsByScope<T extends ScopeComparable>(
  items: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const key = scopeKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    byKey.set(key, pickPreferred(existing, item));
  }

  return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}
