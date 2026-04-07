/**
 * CharacterListService — 轻量角色/地点清单服务
 *
 * 委托 KG CRUD，暴露扁平数组，跳过图遍历复杂度。
 * 提供 `injectCharactersIntoContext` 用于 AI 上下文注入。
 */

import type {
  KnowledgeEntity,
  KnowledgeEntityType,
  KnowledgeGraphService,
} from "../kg/kgService";
import type { ServiceResult } from "../shared/ipcResult";

export type CharacterSummary = {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
  aliases: string[];
};

export type LocationSummary = {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
};

export type CharacterContextInjection = {
  text: string;
  characterCount: number;
  locationCount: number;
  truncated: boolean;
};

export type CharacterListService = {
  listCharacters: (
    projectId: string,
  ) => ServiceResult<CharacterSummary[]>;
  listLocations: (
    projectId: string,
  ) => ServiceResult<LocationSummary[]>;
  injectCharactersIntoContext: (
    projectId: string,
    tokenBudget: number,
  ) => ServiceResult<CharacterContextInjection>;
};

function entityToCharacterSummary(entity: KnowledgeEntity): CharacterSummary {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    attributes: { ...entity.attributes },
    aliases: [...entity.aliases],
  };
}

function entityToLocationSummary(entity: KnowledgeEntity): LocationSummary {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    attributes: { ...entity.attributes },
  };
}

function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf)
    ) {
      tokens += 1.5;
    } else {
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
}

const CHARACTER_SECTION_HEADER = "[角色设定清单]";
const LOCATION_SECTION_HEADER = "[场景/地点清单]";

function formatCharacterForInjection(char: CharacterSummary): string {
  const attrs = Object.entries(char.attributes)
    .filter(([k]) => k.trim().length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  const aliasLine =
    char.aliases.length > 0 ? ` (别名：${char.aliases.join("、")})` : "";
  return `- ${char.name}${aliasLine}：${char.description}${attrs.length > 0 ? `（${attrs}）` : ""}`;
}

function formatLocationForInjection(loc: LocationSummary): string {
  const attrs = Object.entries(loc.attributes)
    .filter(([k]) => k.trim().length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return `- ${loc.name}：${loc.description}${attrs.length > 0 ? `（${attrs}）` : ""}`;
}

export type CharacterListServiceDeps = {
  kgService: Pick<KnowledgeGraphService, "entityList">;
};

export function createCharacterListService(
  deps: CharacterListServiceDeps,
): CharacterListService {
  function listEntitiesByType(
    projectId: string,
    type: KnowledgeEntityType,
  ): ServiceResult<KnowledgeEntity[]> {
    const result = deps.kgService.entityList({ projectId });
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: result.data.items.filter((e) => e.type === type),
    };
  }

  return {
    listCharacters: (projectId) => {
      const result = listEntitiesByType(projectId, "character");
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        data: result.data.map(entityToCharacterSummary),
      };
    },

    listLocations: (projectId) => {
      const result = listEntitiesByType(projectId, "location");
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        data: result.data.map(entityToLocationSummary),
      };
    },

    injectCharactersIntoContext: (projectId, tokenBudget) => {
      const allResult = deps.kgService.entityList({ projectId });
      if (!allResult.ok) {
        return allResult;
      }

      const characters = allResult.data.items
        .filter((e) => e.type === "character")
        .map(entityToCharacterSummary);
      const locations = allResult.data.items
        .filter((e) => e.type === "location")
        .map(entityToLocationSummary);

      const lines: string[] = [];
      let truncated = false;
      let usedTokens = 0;

      if (characters.length > 0) {
        lines.push(CHARACTER_SECTION_HEADER);
        usedTokens += estimateTokens(CHARACTER_SECTION_HEADER);

        for (const char of characters) {
          const line = formatCharacterForInjection(char);
          const lineTokens = estimateTokens(line);
          if (usedTokens + lineTokens > tokenBudget) {
            truncated = true;
            break;
          }
          lines.push(line);
          usedTokens += lineTokens;
        }
      }

      if (locations.length > 0 && !truncated) {
        lines.push("");
        lines.push(LOCATION_SECTION_HEADER);
        usedTokens += estimateTokens(LOCATION_SECTION_HEADER);

        for (const loc of locations) {
          const line = formatLocationForInjection(loc);
          const lineTokens = estimateTokens(line);
          if (usedTokens + lineTokens > tokenBudget) {
            truncated = true;
            break;
          }
          lines.push(line);
          usedTokens += lineTokens;
        }
      }

      return {
        ok: true,
        data: {
          text: lines.join("\n"),
          characterCount: characters.length,
          locationCount: locations.length,
          truncated,
        },
      };
    },
  };
}
