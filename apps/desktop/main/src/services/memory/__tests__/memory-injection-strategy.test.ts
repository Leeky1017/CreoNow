/**
 * SimpleMemory 注入策略 — precision > recall
 * Spec: openspec/specs/memory-system/spec.md — "注入策略（precision > recall）"
 *
 * 验证：
 * 1. preference / style-rule 类别始终全量注入
 * 2. character-setting / location-setting 仅在 documentText 提及时注入
 * 3. 双重截断：数量上限（10 角色 + 5 地点）+ token 预算
 * 4. 项目级记忆覆盖同 key 的全局记忆
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSimpleMemoryService,
  type SimpleMemoryService,
} from "../simpleMemoryService";

// ── DB mock helpers ──

function makeRow(overrides: Record<string, unknown>) {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "proj-1",
    key: "default-key",
    value: "default-value",
    source: "user",
    category: "preference",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createMockDb(rows: Record<string, unknown>[] = []) {
  return {
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(() => ({ count: rows.length })),
      all: vi.fn(() => rows),
    })),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
  };
}

function createMockEventBus() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe("SimpleMemory 注入策略 (precision > recall)", () => {
  let svc: SimpleMemoryService;
  let eventBus: ReturnType<typeof createMockEventBus>;

  describe("preference 和 style-rule 始终全量注入", () => {
    beforeEach(() => {
      const rows = [
        makeRow({ key: "叙述人称", value: "第一人称", category: "preference" }),
        makeRow({ key: "style:动作场景", value: "短句紧凑", category: "style-rule" }),
      ];
      const db = createMockDb(rows);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("即使 documentText 不包含关键词，preference 和 style-rule 仍然被注入", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "毫不相关的文本内容，没有任何匹配的词汇。",
      });

      expect(result.success).toBe(true);
      expect(result.data!.records.length).toBe(2);
      expect(result.data!.injectedText).toContain("叙述人称");
      expect(result.data!.injectedText).toContain("短句紧凑");
    });
  });

  describe("character-setting 仅在 documentText 提及时注入", () => {
    beforeEach(() => {
      const rows = [
        makeRow({ key: "char:林远", value: "28 岁退休刑警", category: "character-setting" }),
        makeRow({ key: "char:林小雨", value: "林远的妹妹", category: "character-setting" }),
        makeRow({ key: "char:张三", value: "路人甲", category: "character-setting" }),
      ];
      const db = createMockDb(rows);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("仅注入 documentText 中提及的角色", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "林远推开门，看到了一个陌生人。",
      });

      expect(result.success).toBe(true);
      const keys = result.data!.records.map((r) => r.key);
      expect(keys).toContain("char:林远");
      expect(keys).not.toContain("char:张三");
    });
  });

  describe("location-setting 仅在 documentText 提及时注入", () => {
    beforeEach(() => {
      const rows = [
        makeRow({ key: "loc:废弃仓库", value: "阴冷压抑", category: "location-setting" }),
        makeRow({ key: "loc:公园", value: "鸟语花香", category: "location-setting" }),
      ];
      const db = createMockDb(rows);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("仅注入 documentText 中提及的地点", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "他走进了废弃仓库，四周一片寂静。",
      });

      expect(result.success).toBe(true);
      const keys = result.data!.records.map((r) => r.key);
      expect(keys).toContain("loc:废弃仓库");
      expect(keys).not.toContain("loc:公园");
    });
  });

  describe("项目级记忆覆盖同 key 的全局记忆", () => {
    beforeEach(() => {
      const rows = [
        makeRow({ key: "叙述人称", value: "第三人称", category: "preference", projectId: null }),
        makeRow({ key: "叙述人称", value: "第一人称", category: "preference", projectId: "proj-1" }),
      ];
      const db = createMockDb(rows);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("项目级记忆覆盖全局记忆", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "任意文本",
      });

      expect(result.success).toBe(true);
      const prefRecords = result.data!.records.filter((r) => r.key === "叙述人称");
      expect(prefRecords.length).toBe(1);
      expect(prefRecords[0].value).toBe("第一人称");
      expect(prefRecords[0].projectId).toBe("proj-1");
    });
  });

  describe("token 预算截断", () => {
    beforeEach(() => {
      const rows = [
        makeRow({ key: "偏好", value: "A".repeat(500), category: "preference" }),
      ];
      const db = createMockDb(rows);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("tokenBudget 限制下 injectedText 被截断", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "任意文本",
        tokenBudget: 10,
      });

      expect(result.success).toBe(true);
      // With a very small budget, text should be truncated
      expect(result.data!.tokenCount).toBeLessThanOrEqual(10);
    });
  });

  describe("空记忆降级", () => {
    beforeEach(() => {
      const db = createMockDb([]);
      eventBus = createMockEventBus();
      svc = createSimpleMemoryService({ db: db as never, eventBus: eventBus as never });
    });

    it("无记忆条目时 degraded=true 且 records 为空", async () => {
      const result = await svc.inject("proj-1", {
        documentText: "任意文本",
      });

      expect(result.success).toBe(true);
      expect(result.data!.records).toHaveLength(0);
      expect(result.data!.degraded).toBe(true);
      expect(result.data!.injectedText).toBe("");
    });

    it("空记忆时发射 memory-injected 事件且 degraded=true", async () => {
      await svc.inject("proj-1", { documentText: "任意文本" });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory-injected",
          degraded: true,
          recordCount: 0,
        }),
      );
    });
  });
});
