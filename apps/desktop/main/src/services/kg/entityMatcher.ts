import type { AiContextLevel } from "./kgService";

export type MatchableEntity = {
  id: string;
  name: string;
  aliases: string[];
  aiContextLevel: AiContextLevel;
};

export type MatchResult = {
  entityId: string;
  matchedTerm: string;
  position: number;
};

/**
 * Match detected entity references from raw text for Retrieved-layer injection.
 *
 * Why: Context fetchers need deterministic, synchronous reference detection
 * without relying on async LLM recognition.
 */
export function matchEntities(
  text: string,
  entities: MatchableEntity[],
): MatchResult[] {
  if (text.length === 0 || entities.length === 0) {
    return [];
  }

  const deduplicated = new Map<string, MatchResult>();
  for (const entity of entities) {
    if (entity.aiContextLevel !== "when_detected") {
      continue;
    }
    if (deduplicated.has(entity.id)) {
      continue;
    }

    const candidates = [entity.name, ...entity.aliases];
    for (const candidate of candidates) {
      if (candidate.trim().length === 0) {
        continue;
      }

      const position = text.indexOf(candidate);
      if (position < 0) {
        continue;
      }

      deduplicated.set(entity.id, {
        entityId: entity.id,
        matchedTerm: candidate,
        position,
      });
      break;
    }
  }

  return [...deduplicated.values()].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    if (left.matchedTerm.length !== right.matchedTerm.length) {
      return right.matchedTerm.length - left.matchedTerm.length;
    }
    return 0;
  });
}
