import { describe, expect, it, vi } from "vitest";

import type { KnowledgeGraphService } from "../../kg/kgService";
import { createCharacterListService } from "../characterListService";

function makeEntity(args: {
  id: string;
  type: "character" | "location";
  name: string;
  description?: string;
  attributes?: Record<string, string>;
  aliases?: string[];
}) {
  return {
    id: args.id,
    projectId: "proj-1",
    type: args.type,
    name: args.name,
    description: args.description ?? "",
    attributes: args.attributes ?? {},
    lastSeenState: undefined,
    aiContextLevel: "when_detected" as const,
    aliases: args.aliases ?? [],
    version: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

function createMockKgService(
  entities: ReturnType<typeof makeEntity>[],
): Pick<KnowledgeGraphService, "entityList"> {
  return {
    entityList: vi.fn(() => ({
      ok: true as const,
      data: { items: entities, totalCount: entities.length },
    })),
  };
}

describe("createCharacterListService", () => {
  describe("listCharacters", () => {
    it("should return only character entities as flat summaries", () => {
      const entities = [
        makeEntity({ id: "c1", type: "character", name: "张三", description: "主角" }),
        makeEntity({ id: "l1", type: "location", name: "长安", description: "古都" }),
        makeEntity({
          id: "c2",
          type: "character",
          name: "李四",
          description: "配角",
          aliases: ["小李"],
        }),
      ];
      const service = createCharacterListService({
        kgService: createMockKgService(entities),
      });

      const result = service.listCharacters("proj-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("张三");
        expect(result.data[1]?.name).toBe("李四");
        expect(result.data[1]?.aliases).toEqual(["小李"]);
      }
    });

    it("should return error when KG service fails", () => {
      const kgService: Pick<KnowledgeGraphService, "entityList"> = {
        entityList: vi.fn(() => ({
          ok: false as const,
          error: { code: "DB_ERROR" as const, message: "db error" },
        })),
      };
      const service = createCharacterListService({ kgService });

      const result = service.listCharacters("proj-1");

      expect(result.ok).toBe(false);
    });
  });

  describe("listLocations", () => {
    it("should return only location entities", () => {
      const entities = [
        makeEntity({ id: "c1", type: "character", name: "张三" }),
        makeEntity({ id: "l1", type: "location", name: "长安", description: "古都" }),
        makeEntity({
          id: "l2",
          type: "location",
          name: "洛阳",
          attributes: { 气候: "温带" },
        }),
      ];
      const service = createCharacterListService({
        kgService: createMockKgService(entities),
      });

      const result = service.listLocations("proj-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("长安");
        expect(result.data[1]?.attributes).toEqual({ 气候: "温带" });
      }
    });
  });

  describe("injectCharactersIntoContext", () => {
    it("should format characters and locations for AI context", () => {
      const entities = [
        makeEntity({
          id: "c1",
          type: "character",
          name: "张三",
          description: "主角",
          aliases: ["老张"],
          attributes: { 年龄: "30" },
        }),
        makeEntity({
          id: "l1",
          type: "location",
          name: "长安",
          description: "唐朝首都",
        }),
      ];
      const service = createCharacterListService({
        kgService: createMockKgService(entities),
      });

      const result = service.injectCharactersIntoContext("proj-1", 2000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.text).toContain("[角色设定清单]");
        expect(result.data.text).toContain("张三");
        expect(result.data.text).toContain("别名：老张");
        expect(result.data.text).toContain("[场景/地点清单]");
        expect(result.data.text).toContain("长安");
        expect(result.data.characterCount).toBe(1);
        expect(result.data.locationCount).toBe(1);
        expect(result.data.truncated).toBe(false);
      }
    });

    it("should truncate when exceeding token budget", () => {
      const entities = Array.from({ length: 50 }, (_, i) =>
        makeEntity({
          id: `c${i}`,
          type: "character",
          name: `角色${i}`,
          description: "这是一个非常长的描述，用来测试 token 预算限制功能是否正常工作",
          attributes: { 性别: "男", 年龄: "30", 职业: "侠客" },
        }),
      );
      const service = createCharacterListService({
        kgService: createMockKgService(entities),
      });

      const result = service.injectCharactersIntoContext("proj-1", 50);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.truncated).toBe(true);
      }
    });

    it("should return empty text when no entities", () => {
      const service = createCharacterListService({
        kgService: createMockKgService([]),
      });

      const result = service.injectCharactersIntoContext("proj-1", 2000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.text).toBe("");
        expect(result.data.characterCount).toBe(0);
        expect(result.data.locationCount).toBe(0);
      }
    });
  });
});
