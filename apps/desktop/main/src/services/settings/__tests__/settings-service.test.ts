/**
 * SettingsService P3 测试 — 角色/地点列表 CRUD（Settings Management）
 * Spec: openspec/specs/knowledge-graph/spec.md — P3: 角色/地点列表 CRUD
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证角色 CRUD、地点 CRUD、属性管理、校验规则、事件发射、
 * AI 注入、注入限制、错误码、dispose 清理。
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import type {
  SettingsService,
  CreateCharacterRequest,
  CreateLocationRequest,
} from "../settingsService";
import { createSettingsService } from "../settingsService";

// ─── mock types ─────────────────────────────────────────────────────

interface MockDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
}

interface MockEventBus {
  emit: Mock;
  on: Mock;
  off: Mock;
}

// ─── helpers ────────────────────────────────────────────────────────

function createMockDb(): MockDb {
  return {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: Function) => fn),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function makeCreateCharacterReq(
  overrides: Partial<CreateCharacterRequest> = {},
): CreateCharacterRequest {
  return {
    projectId: "proj-1",
    name: "林远",
    description: "28 岁，退休刑警",
    attributes: { 年龄: "28", 性格: "冷静理性" },
    ...overrides,
  };
}

function makeCreateLocationReq(
  overrides: Partial<CreateLocationRequest> = {},
): CreateLocationRequest {
  return {
    projectId: "proj-1",
    name: "废弃仓库",
    description: "城郊一处废弃多年的物流仓库",
    attributes: { 气氛: "阴冷压抑", 灯光: "昏暗" },
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("SettingsService P3", () => {
  let db: MockDb;
  let eventBus: MockEventBus;
  let service: SettingsService;

  beforeEach(() => {
    db = createMockDb();
    eventBus = createMockEventBus();
    service = createSettingsService({ db: db as any, eventBus: eventBus as any });
  });

  afterEach(() => {
    service.dispose();
    vi.restoreAllMocks();
  });

  async function seedCharacter(overrides: Partial<CreateCharacterRequest> = {}): Promise<string> {
    const created = await service.createCharacter(
      makeCreateCharacterReq(overrides),
    );
    expect(created.success).toBe(true);
    return created.data!.id;
  }

  async function seedLocation(overrides: Partial<CreateLocationRequest> = {}): Promise<string> {
    const created = await service.createLocation(
      makeCreateLocationReq(overrides),
    );
    expect(created.success).toBe(true);
    return created.data!.id;
  }

  // ── Character CRUD ──────────────────────────────────────────────

  describe("character:create", () => {
    it("创建角色条目并返回完整 CharacterEntry", async () => {
      const result = await service.createCharacter(makeCreateCharacterReq());

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("林远");
      expect(result.data?.projectId).toBe("proj-1");
      expect(result.data?.id).toEqual(expect.any(String));
    });

    it("创建角色时自动生成 id 和时间戳", async () => {
      const result = await service.createCharacter(makeCreateCharacterReq());

      expect(result.data?.id).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(result.data!.id.length).toBeGreaterThan(0);
      expect(result.data?.createdAt).toBeGreaterThan(0);
      expect(result.data?.updatedAt).toBeGreaterThan(0);
    });

    it("创建角色时可选 description 为空", async () => {
      const result = await service.createCharacter(
        makeCreateCharacterReq({ description: undefined }),
      );

      expect(result.success).toBe(true);
    });

    it("创建角色时可选 attributes 为空", async () => {
      const result = await service.createCharacter(
        makeCreateCharacterReq({ attributes: undefined }),
      );

      expect(result.success).toBe(true);
    });

    it("创建角色后发射 character-updated 事件（action=created）", async () => {
      await service.createCharacter(makeCreateCharacterReq());

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "character-updated",
          projectId: "proj-1",
          characterId: expect.any(String),
          action: "created",
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe("character:read", () => {
    it("读取已存在的角色条目", async () => {
      const characterId = await seedCharacter();
      const result = await service.getCharacter(characterId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(characterId);
      expect(result.data?.name).toBe("林远");
      expect(result.data?.projectId).toBe("proj-1");
      expect(result.data?.description).toBe("28 岁，退休刑警");
      expect(result.data?.attributes).toEqual({ 年龄: "28", 性格: "冷静理性" });
      expect(typeof result.data?.createdAt).toBe("number");
      expect(typeof result.data?.updatedAt).toBe("number");
    });

    it("读取不存在的角色返回 CHARACTER_NOT_FOUND", async () => {
      const result = await service.getCharacter("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });
  });

  describe("character:update", () => {
    it("更新角色名称成功", async () => {
      const characterId = await seedCharacter();
      const result = await service.updateCharacter({
        id: characterId,
        name: "林远（化名）",
      });

      expect(result.success).toBe(true);
    });

    it("更新角色属性成功（添加新属性）", async () => {
      const characterId = await seedCharacter();
      const result = await service.updateCharacter({
        id: characterId,
        attributes: { 职业: "退休刑警", 年龄: "28" },
      });

      expect(result.success).toBe(true);
    });

    it("更新角色后发射 character-updated 事件（action=updated）", async () => {
      const characterId = await seedCharacter();
      eventBus.emit.mockClear();
      await service.updateCharacter({ id: characterId, name: "新名字" });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "character-updated",
          characterId,
          action: "updated",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("更新不存在的角色返回 CHARACTER_NOT_FOUND", async () => {
      const result = await service.updateCharacter({ id: "nonexistent", name: "x" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });

    it("同项目内角色 rename 成已存在名称时返回 CHARACTER_NAME_DUPLICATE", async () => {
      const sourceId = await seedCharacter({ name: "林远" });
      await seedCharacter({ name: "张薇" });

      const result = await service.updateCharacter({ id: sourceId, name: "张薇" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_DUPLICATE");
    });
  });

  describe("character:delete", () => {
    it("删除角色成功", async () => {
      const characterId = await seedCharacter();
      const result = await service.deleteCharacter(characterId);

      expect(result.success).toBe(true);
    });

    it("删除角色后发射 character-updated 事件（action=deleted）", async () => {
      const characterId = await seedCharacter();
      eventBus.emit.mockClear();
      await service.deleteCharacter(characterId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "character-updated",
          characterId,
          action: "deleted",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("删除不存在的角色返回 CHARACTER_NOT_FOUND", async () => {
      const result = await service.deleteCharacter("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NOT_FOUND");
    });
  });

  describe("character:list", () => {
    it("列出项目内所有角色", async () => {
      const result = await service.listCharacters("proj-1");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("空项目返回空列表", async () => {
      const result = await service.listCharacters("proj-empty");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ── Character validation ────────────────────────────────────────

  describe("character validation", () => {
    it("角色名称为空时返回 CHARACTER_NAME_REQUIRED", async () => {
      const result = await service.createCharacter(
        makeCreateCharacterReq({ name: "" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_REQUIRED");
    });

    it("同项目内角色重名时返回 CHARACTER_NAME_DUPLICATE", async () => {
      await service.createCharacter(makeCreateCharacterReq({ name: "林远" }));
      const result = await service.createCharacter(makeCreateCharacterReq({ name: "林远" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_DUPLICATE");
    });

    it("属性键超过 100 字符时返回 CHARACTER_ATTR_KEY_TOO_LONG", async () => {
      const longKey = "a".repeat(101);
      const result = await service.createCharacter(
        makeCreateCharacterReq({ attributes: { [longKey]: "value" } }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_ATTR_KEY_TOO_LONG");
    });

    it("单角色属性数超过 50 时返回 CHARACTER_ATTR_LIMIT_EXCEEDED", async () => {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < 51; i++) {
        attrs[`attr-${i}`] = `value-${i}`;
      }
      const result = await service.createCharacter(
        makeCreateCharacterReq({ attributes: attrs }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_ATTR_LIMIT_EXCEEDED");
    });

    it("角色数量达到 500 上限时返回 CHARACTER_CAPACITY_EXCEEDED", async () => {
      db.prepare.mockImplementation((sql: string) => ({
        run: vi.fn(),
        get: vi.fn().mockReturnValue(
          /COUNT\(\*\)/i.test(sql) ? { count: 500 } : undefined,
        ),
        all: vi.fn().mockReturnValue([]),
      }));
      const result = await service.createCharacter(
        makeCreateCharacterReq({ name: "容量边界角色" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_CAPACITY_EXCEEDED");
    });
  });

  // ── Location CRUD ───────────────────────────────────────────────

  describe("location:create", () => {
    it("创建地点条目并返回完整 LocationEntry", async () => {
      const result = await service.createLocation(makeCreateLocationReq());

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("废弃仓库");
      expect(result.data?.projectId).toBe("proj-1");
    });

    it("创建地点后发射 location-created 事件", async () => {
      await service.createLocation(makeCreateLocationReq());

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "location-created",
          projectId: "proj-1",
          locationId: expect.any(String),
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe("location:read", () => {
    it("读取已存在的地点条目", async () => {
      const locationId = await seedLocation();
      const result = await service.getLocation(locationId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(locationId);
      expect(result.data?.name).toBe("废弃仓库");
      expect(result.data?.projectId).toBe("proj-1");
      expect(result.data?.description).toBe("城郊一处废弃多年的物流仓库");
      expect(result.data?.attributes).toEqual({ 气氛: "阴冷压抑", 灯光: "昏暗" });
      expect(typeof result.data?.createdAt).toBe("number");
      expect(typeof result.data?.updatedAt).toBe("number");
    });

    it("读取不存在的地点返回 LOCATION_NOT_FOUND", async () => {
      const result = await service.getLocation("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });
  });

  describe("location:update", () => {
    it("更新地点属性成功", async () => {
      const locationId = await seedLocation();
      const result = await service.updateLocation({
        id: locationId,
        attributes: { 气氛: "温暖明亮" },
      });

      expect(result.success).toBe(true);
    });

    it("更新地点后发射 location-updated 事件", async () => {
      const locationId = await seedLocation();
      eventBus.emit.mockClear();
      await service.updateLocation({ id: locationId, name: "新地点名" });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "location-updated",
          projectId: expect.any(String),
          locationId,
          timestamp: expect.any(Number),
        }),
      );
    });

    it("同项目内地点 rename 成已存在名称时返回 LOCATION_NAME_DUPLICATE", async () => {
      const sourceId = await seedLocation({ name: "废弃仓库" });
      await seedLocation({ name: "旧码头" });

      const result = await service.updateLocation({ id: sourceId, name: "旧码头" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_DUPLICATE");
    });
  });

  describe("location:delete", () => {
    it("删除地点成功", async () => {
      const locationId = await seedLocation();
      const result = await service.deleteLocation(locationId);

      expect(result.success).toBe(true);
    });

    it("删除地点后发射 location-deleted 事件", async () => {
      const locationId = await seedLocation();
      eventBus.emit.mockClear();
      await service.deleteLocation(locationId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "location-deleted",
          projectId: expect.any(String),
          locationId,
          timestamp: expect.any(Number),
        }),
      );
    });

    it("删除不存在的地点返回 LOCATION_NOT_FOUND", async () => {
      const result = await service.deleteLocation("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });
  });

  describe("location:list", () => {
    it("列出项目内所有地点", async () => {
      const result = await service.listLocations("proj-1");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // ── Location validation ─────────────────────────────────────────

  describe("location validation", () => {
    it("地点名称为空时返回 LOCATION_NAME_REQUIRED", async () => {
      const result = await service.createLocation(
        makeCreateLocationReq({ name: "" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_REQUIRED");
    });

    it("同项目内地点重名时返回 LOCATION_NAME_DUPLICATE", async () => {
      await service.createLocation(makeCreateLocationReq({ name: "废弃仓库" }));
      const result = await service.createLocation(makeCreateLocationReq({ name: "废弃仓库" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_DUPLICATE");
    });

    it("属性键超过 100 字符时返回 LOCATION_ATTR_KEY_TOO_LONG", async () => {
      const longKey = "b".repeat(101);
      const result = await service.createLocation(
        makeCreateLocationReq({ attributes: { [longKey]: "value" } }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_ATTR_KEY_TOO_LONG");
    });

    it("单地点属性数超过 50 时返回 LOCATION_ATTR_LIMIT_EXCEEDED", async () => {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < 51; i++) {
        attrs[`attr-${i}`] = `value-${i}`;
      }
      const result = await service.createLocation(
        makeCreateLocationReq({ attributes: attrs }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_ATTR_LIMIT_EXCEEDED");
    });

    it("地点数量超限时返回 LOCATION_CAPACITY_EXCEEDED", async () => {
      db.prepare.mockImplementation((sql: string) => ({
        run: vi.fn(),
        get: vi.fn().mockReturnValue(
          /COUNT\(\*\)/i.test(sql) ? { count: 200 } : undefined,
        ),
        all: vi.fn().mockReturnValue([]),
      }));
      const result = await service.createLocation(
        makeCreateLocationReq({ name: "容量边界地点" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_CAPACITY_EXCEEDED");
    });
  });

  // ── AI injection ────────────────────────────────────────────────

  describe("AI injection", () => {
    it("getCharactersForInjection 返回当前项目的角色数据", async () => {
      const result = await service.getCharactersForInjection("proj-1");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("getLocationsForInjection 返回当前项目的地点数据", async () => {
      const result = await service.getLocationsForInjection("proj-1");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("注入角色上限为 10 个", async () => {
      // 模拟项目有 15 个角色，验证仅注入最多 10 个
      const fifteenCharacters = Array.from({ length: 15 }, (_, i) => ({
        id: `char-${i}`,
        projectId: "proj-many",
        name: `角色${i}`,
        description: `描述${i}`,
        attributes: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(fifteenCharacters),
      });

      const result = await service.getCharactersForInjection("proj-many");

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeLessThanOrEqual(10);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("注入地点上限为 5 个", async () => {
      // 模拟项目有 8 个地点，验证仅注入最多 5 个
      const eightLocations = Array.from({ length: 8 }, (_, i) => ({
        id: `loc-${i}`,
        projectId: "proj-many",
        name: `地点${i}`,
        description: `描述${i}`,
        attributes: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(eightLocations),
      });

      const result = await service.getLocationsForInjection("proj-many");

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeLessThanOrEqual(5);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("无角色设定时注入返回空数组", async () => {
      const result = await service.getCharactersForInjection("proj-empty");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("角色设定不完整时仅注入已有信息", async () => {
      const incompleteCharacter = [{
        id: "char-incomplete",
        projectId: "proj-1",
        name: "神秘老人",
        description: "",
        attributes: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(incompleteCharacter),
      });

      const result = await service.getCharactersForInjection("proj-1");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe("神秘老人");
      expect(result.data![0].attributes).toEqual({});
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用方法抛出错误", async () => {
      service.dispose();

      await expect(service.listCharacters("proj-1")).rejects.toThrow();
    });

    it("dispose 可重复调用不报错", () => {
      service.dispose();
      expect(() => service.dispose()).not.toThrow();
    });
  });
});
