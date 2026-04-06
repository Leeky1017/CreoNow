/**
 * settingsService — 覆盖率补充测试
 *
 * 补充已有 settings-service.test.ts 未覆盖的分支：
 * - dispose 后的各种操作
 * - location 更新不存在项返回 LOCATION_NOT_FOUND
 * - listLocations 空结果
 * - getCharactersForInjection / getLocationsForInjection 空项目
 * - location 容量上限
 * - 属性键过长（location update 路径）
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import type { SettingsService } from "../settingsService";
import { createSettingsService } from "../settingsService";

type SettingsDeps = Parameters<typeof createSettingsService>[0];
type SettingsDb = SettingsDeps["db"];
type SettingsEventBus = SettingsDeps["eventBus"];

// ── mock types ─────────────────────────────────────────────────────

interface MockDb extends SettingsDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
}

interface MockEventBus extends SettingsEventBus {
  emit: Mock;
  on: Mock;
  off: Mock;
}

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

// ── tests ──────────────────────────────────────────────────────────

describe("SettingsService — coverage gaps", () => {
  let db: MockDb;
  let eventBus: MockEventBus;
  let service: SettingsService;

  beforeEach(() => {
    db = createMockDb();
    eventBus = createMockEventBus();
    service = createSettingsService({ db, eventBus });
  });

  afterEach(() => {
    service.dispose();
    vi.restoreAllMocks();
  });

  // ── dispose 后操作拒绝 ─────────────────────────────────────────

  describe("dispose behavior", () => {
    it("dispose 后 createCharacter 抛出", async () => {
      service.dispose();
      await expect(
        service.createCharacter({ projectId: "p", name: "x" }),
      ).rejects.toThrow("disposed");
    });

    it("dispose 后 getCharacter 抛出", async () => {
      service.dispose();
      await expect(service.getCharacter("some-id")).rejects.toThrow("disposed");
    });

    it("dispose 后 updateCharacter 抛出", async () => {
      service.dispose();
      await expect(
        service.updateCharacter({ id: "x", name: "y" }),
      ).rejects.toThrow("disposed");
    });

    it("dispose 后 deleteCharacter 抛出", async () => {
      service.dispose();
      await expect(service.deleteCharacter("x")).rejects.toThrow("disposed");
    });

    it("dispose 后 createLocation 抛出", async () => {
      service.dispose();
      await expect(
        service.createLocation({ projectId: "p", name: "x" }),
      ).rejects.toThrow("disposed");
    });

    it("dispose 后 getLocation 抛出", async () => {
      service.dispose();
      await expect(service.getLocation("some-id")).rejects.toThrow("disposed");
    });

    it("dispose 后 updateLocation 抛出", async () => {
      service.dispose();
      await expect(
        service.updateLocation({ id: "x", name: "y" }),
      ).rejects.toThrow("disposed");
    });

    it("dispose 后 deleteLocation 抛出", async () => {
      service.dispose();
      await expect(service.deleteLocation("x")).rejects.toThrow("disposed");
    });

    it("dispose 后 listCharacters 抛出", async () => {
      service.dispose();
      await expect(service.listCharacters("p")).rejects.toThrow("disposed");
    });

    it("dispose 后 listLocations 抛出", async () => {
      service.dispose();
      await expect(service.listLocations("p")).rejects.toThrow("disposed");
    });

    it("dispose 后 getCharactersForInjection 抛出", async () => {
      service.dispose();
      await expect(service.getCharactersForInjection("p")).rejects.toThrow("disposed");
    });

    it("dispose 后 getLocationsForInjection 抛出", async () => {
      service.dispose();
      await expect(service.getLocationsForInjection("p")).rejects.toThrow("disposed");
    });
  });

  // ── location update edge cases ─────────────────────────────────

  describe("location update edge cases", () => {
    it("更新不存在的地点返回 LOCATION_NOT_FOUND", async () => {
      const result = await service.updateLocation({ id: "nonexistent", name: "x" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NOT_FOUND");
    });

    it("更新地点时属性键过长返回 LOCATION_ATTR_KEY_TOO_LONG", async () => {
      const created = await service.createLocation({
        projectId: "proj-1",
        name: "地点A",
      });
      expect(created.success).toBe(true);

      const longKey = "k".repeat(101);
      const result = await service.updateLocation({
        id: created.data!.id,
        attributes: { [longKey]: "v" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_ATTR_KEY_TOO_LONG");
    });

    it("更新地点时属性数超限返回 LOCATION_ATTR_LIMIT_EXCEEDED", async () => {
      const created = await service.createLocation({
        projectId: "proj-1",
        name: "地点B",
      });
      expect(created.success).toBe(true);

      const tooMany: Record<string, string> = {};
      for (let i = 0; i < 51; i++) tooMany[`k${i}`] = `v${i}`;

      const result = await service.updateLocation({
        id: created.data!.id,
        attributes: tooMany,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_ATTR_LIMIT_EXCEEDED");
    });
  });

  // ── character update edge cases ────────────────────────────────

  describe("character update edge cases", () => {
    it("更新角色时属性键过长返回 CHARACTER_ATTR_KEY_TOO_LONG", async () => {
      const created = await service.createCharacter({
        projectId: "proj-1",
        name: "角色A",
      });
      expect(created.success).toBe(true);

      const longKey = "k".repeat(101);
      const result = await service.updateCharacter({
        id: created.data!.id,
        attributes: { [longKey]: "v" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_ATTR_KEY_TOO_LONG");
    });
  });

  // ── injection for empty project ────────────────────────────────

  describe("injection edge cases", () => {
    it("无地点设定时注入返回空数组", async () => {
      const result = await service.getLocationsForInjection("proj-empty");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("地点设定不完整时仅注入已有信息", async () => {
      const incompleteLocation = [{
        id: "loc-incomplete",
        projectId: "proj-1",
        name: "未知地点",
        description: "",
        attributes: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(incompleteLocation),
      });

      const result = await service.getLocationsForInjection("proj-1");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe("未知地点");
    });
  });

  // ── location list ──────────────────────────────────────────────

  describe("location list edge cases", () => {
    it("空项目地点列表返回空数组", async () => {
      const result = await service.listLocations("proj-empty");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ── name required edge cases ───────────────────────────────────

  describe("name validation edge cases", () => {
    it("location name 仅空格时返回 LOCATION_NAME_REQUIRED", async () => {
      const result = await service.createLocation({
        projectId: "proj-1",
        name: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("LOCATION_NAME_REQUIRED");
    });

    it("character name 仅空格时返回 CHARACTER_NAME_REQUIRED", async () => {
      const result = await service.createCharacter({
        projectId: "proj-1",
        name: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CHARACTER_NAME_REQUIRED");
    });
  });
});
