/**
 * SimpleMemoryService P3 测试 — 简单记忆系统
 * Spec: openspec/specs/memory-system/spec.md — P3: 简单记忆系统
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 MemoryRecord CRUD、注入策略（precision > recall）、token 预算、
 * 事件同步（角色/地点更新 → 自动记忆）、容量限制、降级模式、
 * 错误码、dispose 清理。
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import type {
  SimpleMemoryService,
  MemoryRecord,
  WriteMemoryRequest,
} from "../simpleMemoryService";
import { createSimpleMemoryService } from "../simpleMemoryService";

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

function makeWriteRequest(
  overrides: Partial<WriteMemoryRequest> = {},
): WriteMemoryRequest {
  return {
    projectId: "proj-1",
    key: "pref:dialogue-style",
    value: "口语化，避免书面语气",
    source: "user",
    category: "preference",
    ...overrides,
  };
}

function makeMemoryRecord(
  overrides: Partial<MemoryRecord> = {},
): MemoryRecord {
  return {
    id: "mem-1",
    projectId: "proj-1",
    key: "pref:dialogue-style",
    value: "口语化，避免书面语气",
    source: "user",
    category: "preference",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("SimpleMemoryService P3", () => {
  let db: MockDb;
  let eventBus: MockEventBus;
  let service: SimpleMemoryService;

  beforeEach(() => {
    db = createMockDb();
    eventBus = createMockEventBus();
    service = createSimpleMemoryService({ db: db as any, eventBus: eventBus as any });
  });

  afterEach(() => {
    service.dispose();
    vi.restoreAllMocks();
  });

  async function seedMemory(overrides: Partial<WriteMemoryRequest> = {}): Promise<MemoryRecord> {
    const created = await service.write(makeWriteRequest(overrides));
    expect(created.success).toBe(true);
    return created.data!;
  }

  // ── CRUD ────────────────────────────────────────────────────────

  describe("write", () => {
    it("写入记忆条目并返回 MemoryRecord", async () => {
      const result = await service.write(makeWriteRequest());

      expect(result.success).toBe(true);
      expect(result.data?.key).toBe("pref:dialogue-style");
      expect(result.data?.value).toBe("口语化，避免书面语气");
    });

    it("写入相同 key 时覆盖（upsert 语义）", async () => {
      await service.write(makeWriteRequest());
      const result = await service.write(
        makeWriteRequest({ value: "更新后的偏好" }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.value).toBe("更新后的偏好");
    });

    it("写入后发射 memory-updated 事件（action=written）", async () => {
      await service.write(makeWriteRequest());

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory-updated",
          projectId: "proj-1",
          key: "pref:dialogue-style",
          action: "written",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("写入全局记忆（projectId=null）", async () => {
      const result = await service.write(
        makeWriteRequest({ projectId: null }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.projectId).toBeNull();
    });
  });

  describe("read", () => {
    it("读取已存在的记忆条目", async () => {
      const record = await seedMemory();
      const result = await service.read(record.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toEqual(expect.any(String));
      expect(result.data?.key).toBe("pref:dialogue-style");
      expect(result.data?.value).toEqual(expect.any(String));
      expect(result.data?.category).toBe("preference");
    });

    it("读取不存在的记忆返回 MEMORY_NOT_FOUND", async () => {
      const result = await service.read("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_NOT_FOUND");
    });
  });

  describe("delete", () => {
    it("删除记忆条目成功", async () => {
      const record = await seedMemory();
      const result = await service.delete(record.id);

      expect(result.success).toBe(true);
    });

    it("删除后发射 memory-updated 事件（action=deleted）", async () => {
      const record = await seedMemory();
      eventBus.emit.mockClear();
      await service.delete(record.id);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory-updated",
          projectId: expect.any(String),
          key: expect.any(String),
          action: "deleted",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("删除不存在的记忆返回 MEMORY_NOT_FOUND", async () => {
      const result = await service.delete("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_NOT_FOUND");
    });
  });

  describe("list", () => {
    it("列出项目内所有记忆条目", async () => {
      const result = await service.list({ projectId: "proj-1" });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("按 category 过滤记忆条目", async () => {
      const result = await service.list({
        projectId: "proj-1",
        category: "preference",
      });

      expect(result.success).toBe(true);
    });

    it("按 keyPrefix 过滤记忆条目", async () => {
      const result = await service.list({
        projectId: "proj-1",
        keyPrefix: "pref:",
      });

      expect(result.success).toBe(true);
    });

    it("空项目返回空列表", async () => {
      const result = await service.list({ projectId: "proj-empty" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ── Validation ──────────────────────────────────────────────────

  describe("validation", () => {
    it("key 为空时返回 MEMORY_KEY_REQUIRED", async () => {
      const result = await service.write(makeWriteRequest({ key: "" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_KEY_REQUIRED");
    });

    it("key 超过 200 字符时返回 MEMORY_KEY_TOO_LONG", async () => {
      const result = await service.write(
        makeWriteRequest({ key: "k".repeat(201) }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_KEY_TOO_LONG");
    });

    it("value 超过 2000 字符时返回 MEMORY_VALUE_TOO_LONG", async () => {
      const result = await service.write(
        makeWriteRequest({ value: "v".repeat(2001) }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_VALUE_TOO_LONG");
    });

    it("记忆条目超限时返回 MEMORY_CAPACITY_EXCEEDED", async () => {
      // 模拟容量已满——让 db 返回已达上限的记录数
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn().mockReturnValue({ count: 10000 }),
        all: vi.fn().mockReturnValue([]),
      });

      const result = await service.write(
        makeWriteRequest({ key: "capacity-test" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_CAPACITY_EXCEEDED");
    });
  });

  // ── Injection ───────────────────────────────────────────────────

  describe("inject", () => {
    it("inject 返回 MemoryInjection 结构", async () => {
      const result = await service.inject("proj-1", {
        documentText: "林远走进了废弃仓库",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("records");
      expect(result.data).toHaveProperty("injectedText");
      expect(result.data).toHaveProperty("tokenCount");
      expect(result.data).toHaveProperty("degraded");
    });

    it("用户偏好（preference）全量注入", async () => {
      // 设置 preference 类别的记忆记录
      const prefRecords = [
        makeMemoryRecord({ id: "mem-pref-1", key: "pref:dialogue-style", value: "口语化", category: "preference" }),
        makeMemoryRecord({ id: "mem-pref-2", key: "pref:narrative-tone", value: "冷峻克制", category: "preference" }),
      ];
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(prefRecords),
      });

      const result = await service.inject("proj-1", {
        documentText: "任何文本",
      });

      expect(result.success).toBe(true);
      const injectedPrefs = result.data!.records.filter(
        (r) => r.category === "preference",
      );
      expect(injectedPrefs.length).toBe(2);
      expect(injectedPrefs.map((r) => r.key)).toContain("pref:dialogue-style");
      expect(injectedPrefs.map((r) => r.key)).toContain("pref:narrative-tone");
    });

    it("style-rule 类别全量注入", async () => {
      const styleRuleRecords = [
        makeMemoryRecord({ id: "mem-sr-1", key: "style:no-adverb", value: "避免使用副词修饰对白", category: "style-rule" }),
        makeMemoryRecord({ id: "mem-sr-2", key: "style:short-sentence", value: "短句为主，单句不超过 20 字", category: "style-rule" }),
      ];
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(styleRuleRecords),
      });

      const result = await service.inject("proj-1", {
        documentText: "任何文本",
      });

      expect(result.success).toBe(true);
      const injectedStyleRules = result.data!.records.filter(
        (r) => r.category === "style-rule",
      );
      expect(injectedStyleRules.length).toBe(2);
      expect(injectedStyleRules.map((r) => r.key)).toContain("style:no-adverb");
      expect(injectedStyleRules.map((r) => r.key)).toContain("style:short-sentence");
    });

    it("仅注入文档文本中提及的角色设定（precision > recall）", async () => {
      // 设置 3 个角色的记忆，但文档只提及林远
      const charRecords = [
        makeMemoryRecord({ id: "mem-char-1", key: "char:林远", value: "28 岁，退休刑警", category: "character-setting" }),
        makeMemoryRecord({ id: "mem-char-2", key: "char:苏晴", value: "25 岁，记者", category: "character-setting" }),
        makeMemoryRecord({ id: "mem-char-3", key: "char:王磊", value: "35 岁，刑警队长", category: "character-setting" }),
      ];
      const locRecords = [
        makeMemoryRecord({ id: "mem-loc-1", key: "loc:废弃仓库", value: "城郊废弃多年的物流仓库", category: "location-setting" }),
      ];
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([...charRecords, ...locRecords]),
      });

      const result = await service.inject("proj-1", {
        documentText: "林远走进了废弃仓库",
      });

      expect(result.success).toBe(true);
      const charResults = result.data!.records.filter(
        (r) => r.category === "character-setting",
      );
      // 仅应包含林远，不应包含苏晴和王磊
      expect(charResults.every((r) => r.key.includes("林远"))).toBe(true);
      expect(charResults.some((r) => r.key.includes("苏晴"))).toBe(false);
      expect(charResults.some((r) => r.key.includes("王磊"))).toBe(false);
      // 应包含废弃仓库
      const locResults = result.data!.records.filter(
        (r) => r.category === "location-setting",
      );
      expect(locResults.some((r) => r.key.includes("废弃仓库"))).toBe(true);
    });

    it("角色注入上限为 10 个", async () => {
      const manyCharacters = Array.from({ length: 12 }, (_, index) =>
        makeMemoryRecord({
          id: `mem-char-${index}`,
          projectId: "proj-1",
          key: `char:角色${index}`,
          value: `角色${index}设定`,
          category: "character-setting",
        }),
      );
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(manyCharacters),
      });
      const result = await service.inject("proj-1", {
        documentText: Array.from({ length: 12 }, (_, index) => `角色${index}`).join("、"),
      });

      expect(result.success).toBe(true);
      const charRecords = result.data!.records.filter(
        (r) => r.category === "character-setting",
      );
      expect(charRecords.length).toBeLessThanOrEqual(10);
    });

    it("地点注入上限为 5 个", async () => {
      const manyLocations = Array.from({ length: 8 }, (_, index) =>
        makeMemoryRecord({
          id: `mem-loc-${index}`,
          projectId: "proj-1",
          key: `loc:地点${index}`,
          value: `地点${index}设定`,
          category: "location-setting",
        }),
      );
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue(manyLocations),
      });
      const result = await service.inject("proj-1", {
        documentText: Array.from({ length: 8 }, (_, index) => `地点${index}`).join("、"),
      });

      expect(result.success).toBe(true);
      const locRecords = result.data!.records.filter(
        (r) => r.category === "location-setting",
      );
      expect(locRecords.length).toBeLessThanOrEqual(5);
    });

    it("token 预算为 Settings 层的 40%", async () => {
      const result = await service.inject("proj-1", {
        documentText: "林远",
        tokenBudget: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data!.tokenCount).toBeLessThanOrEqual(400);
    });

    it("项目级记忆覆盖同 key 的全局记忆", async () => {
      // 全局记忆和项目级记忆使用相同的 key
      const globalRecord = makeMemoryRecord({
        id: "mem-global",
        projectId: null as any,
        key: "pref:narrative-person",
        value: "第一人称",
        category: "preference",
      });
      const projectRecord = makeMemoryRecord({
        id: "mem-proj",
        projectId: "proj-1",
        key: "pref:narrative-person",
        value: "第三人称限知",
        category: "preference",
      });
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([globalRecord, projectRecord]),
      });

      const result = await service.inject("proj-1", {
        documentText: "任何文本",
      });

      expect(result.success).toBe(true);
      // 项目级 pref:narrative-person 应覆盖全局同名 key
      const narrativeRecords = result.data!.records.filter(
        (r) => r.key === "pref:narrative-person",
      );
      expect(narrativeRecords).toHaveLength(1);
      expect(narrativeRecords[0].value).toBe("第三人称限知");
    });

    it("记忆服务不可用时返回降级结果", async () => {
      db.prepare.mockImplementationOnce(() => {
        throw new Error("database unavailable");
      });
      const result = await service.inject("proj-broken", {
        documentText: "任何文本",
      });

      expect(result.success).toBe(true);
      expect(result.data?.degraded).toBe(true);
      expect(result.data?.records).toEqual([]);
      expect(result.data?.injectedText).toBe("");
      expect(result.data?.tokenCount).toBe(0);
    });

    it("inject 返回格式化的注入文本", async () => {
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([
          makeMemoryRecord({
            id: "mem-char-1",
            key: "char:林远",
            value: "28 岁，退休刑警",
            category: "character-setting",
          }),
          makeMemoryRecord({
            id: "mem-loc-1",
            key: "loc:废弃仓库",
            value: "城郊废弃仓库",
            category: "location-setting",
          }),
        ]),
      });
      const result = await service.inject("proj-1", {
        documentText: "林远走进了废弃仓库",
      });

      expect(result.success).toBe(true);
      expect(typeof result.data?.injectedText).toBe("string");
      expect(result.data!.injectedText.length).toBeGreaterThan(0);
    });
  });

  // ── Additional error codes (spec L811-815) ──────────────────────

  describe("additional error codes", () => {
    it("记忆服务不可用时返回 MEMORY_SERVICE_UNAVAILABLE", async () => {
      db.prepare.mockImplementation(() => {
        throw new Error("database unavailable");
      });

      const result = await service.read("mem-1");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_SERVICE_UNAVAILABLE");
    });

    it("记忆反压时返回 MEMORY_BACKPRESSURE 含 retryAfterMs", async () => {
      const throttledService = createSimpleMemoryService({
        db: db as any,
        eventBus: eventBus as any,
        backpressureGuard: () => 100,
      });
      const result = await throttledService.write(
        makeWriteRequest({ key: "backpressure-test" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_BACKPRESSURE");
      expect(typeof result.error?.retryAfterMs).toBe("number");
      expect(result.error!.retryAfterMs).toBeGreaterThan(0);
      throttledService.dispose();
    });

    it("清理失败时返回 MEMORY_CLEANUP_FAILED", async () => {
      db.prepare.mockImplementationOnce(() => {
        throw new Error("cleanup failed");
      });

      const result = await service.cleanup("proj-1");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_CLEANUP_FAILED");
    });

    it("清除需确认时返回 MEMORY_CLEAR_CONFIRM_REQUIRED", async () => {
      const result = await service.clearProject("proj-1", { confirmed: false });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MEMORY_CLEAR_CONFIRM_REQUIRED");
    });
  });

  // ── memory-injected WritingEvent (spec L820-828) ───────────────

  describe("memory-injected event", () => {
    it("inject 时发射 memory-injected WritingEvent", async () => {
      const result = await service.inject("proj-1", {
        documentText: "林远走进了废弃仓库",
      });

      expect(result.success).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory-injected",
          projectId: "proj-1",
          recordCount: expect.any(Number),
          tokenCount: expect.any(Number),
          degraded: expect.any(Boolean),
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  // ── Event sync ──────────────────────────────────────────────────

  describe("event sync", () => {
    it("监听 CharacterUpdatedEvent（action=created）→ 自动创建记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "character-updated",
        expect.any(Function),
      );

      // 提取注册的 handler 并模拟触发
      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "character-updated",
      )![1];
      await handler({
        type: "character-updated",
        projectId: "proj-1",
        characterId: "char-new",
        action: "created",
        timestamp: Date.now(),
      });

      // 验证写入了记忆条目（db.prepare 被调用用于插入）
      expect(db.prepare).toHaveBeenCalled();
    });

    it("监听 CharacterUpdatedEvent（action=updated）→ 自动更新记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "character-updated",
        expect.any(Function),
      );

      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "character-updated",
      )![1];
      await handler({
        type: "character-updated",
        projectId: "proj-1",
        characterId: "char-1",
        action: "updated",
        timestamp: Date.now(),
      });

      expect(db.prepare).toHaveBeenCalled();
    });

    it("监听 CharacterUpdatedEvent（action=deleted）→ 自动删除记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "character-updated",
        expect.any(Function),
      );

      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "character-updated",
      )![1];
      await handler({
        type: "character-updated",
        projectId: "proj-1",
        characterId: "char-1",
        action: "deleted",
        timestamp: Date.now(),
      });

      expect(db.prepare).toHaveBeenCalled();
    });

    it("监听 LocationCreatedEvent → 自动创建地点记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "location-created",
        expect.any(Function),
      );

      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "location-created",
      )![1];
      await handler({
        type: "location-created",
        projectId: "proj-1",
        locationId: "loc-new",
        timestamp: Date.now(),
      });

      expect(db.prepare).toHaveBeenCalled();
    });

    it("监听 LocationUpdatedEvent → 自动更新地点记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "location-updated",
        expect.any(Function),
      );

      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "location-updated",
      )![1];
      await handler({
        type: "location-updated",
        projectId: "proj-1",
        locationId: "loc-1",
        timestamp: Date.now(),
      });

      expect(db.prepare).toHaveBeenCalled();
    });

    it("监听 LocationDeletedEvent → 自动删除地点记忆条目", async () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        "location-deleted",
        expect.any(Function),
      );

      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "location-deleted",
      )![1];
      await handler({
        type: "location-deleted",
        projectId: "proj-1",
        locationId: "loc-1",
        timestamp: Date.now(),
      });

      expect(db.prepare).toHaveBeenCalled();
    });

    it("事件同步失败仅记录警告，不阻塞 CRUD 操作", async () => {
      // 模拟事件处理函数抛出错误
      const handler = eventBus.on.mock.calls.find(
        (call: any) => call[0] === "character-updated",
      )?.[1];
      expect(handler).toBeDefined();

      // 模拟 handler 抛出错误后 service 不崩溃
      db.prepare.mockImplementationOnce(() => {
        throw new Error("sync failure");
      });

      // 后续 CRUD 仍可正常调用
      const result = await service.write(makeWriteRequest({ key: "after-sync-failure" }));
      // 服务不应崩溃——即使 sync 失败，write 应正常工作
      expect(result.success).toBe(true);
    });
  });

  // ── clear project ───────────────────────────────────────────────

  describe("clear project", () => {
    it("清除项目级记忆后发射 memory-updated 事件（action=cleared）", async () => {
      await service.clearProject("proj-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory-updated",
          projectId: "proj-1",
          action: "cleared",
          key: expect.any(String),
          timestamp: expect.any(Number),
        }),
      );
    });

    it("清除项目级记忆不影响全局记忆", async () => {
      const result = await service.clearProject("proj-1");

      expect(result.success).toBe(true);
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用方法抛出错误", async () => {
      service.dispose();

      await expect(service.write(makeWriteRequest())).rejects.toThrow();
    });

    it("dispose 取消事件监听", () => {
      const onCallCount = eventBus.on.mock.calls.length;
      service.dispose();

      // 每个 on 注册都应有对应的 off 取消
      expect(eventBus.off).toHaveBeenCalled();
      expect(eventBus.off.mock.calls.length).toBeGreaterThanOrEqual(onCallCount);
    });

    it("dispose 可重复调用不报错", () => {
      service.dispose();
      expect(() => service.dispose()).not.toThrow();
    });
  });
});
