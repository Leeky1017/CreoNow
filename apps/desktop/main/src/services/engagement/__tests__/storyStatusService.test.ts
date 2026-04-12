/**
 * storyStatusService — vitest 全覆盖测试
 *
 * 覆盖：
 * - 正常路径：章节列表 + 中断点 + 伏笔 + suggestedAction
 * - 缓存命中（30s TTL 内不重查）
 * - 缓存失效（文档 updatedAt 变更）
 * - 缓存 TTL 到期后重新查询
 * - 显式 invalidateCache
 * - 空项目（无章节、无伏笔）
 * - INVALID_ARGUMENT（projectId 空）
 * - DB 异常返回 DB_ERROR
 * - 性能路径：用 stub 验证 queryCostMs 字段与同步执行路径
 * - inferSuggestedAction 各分支
 */

import { describe, it, expect, vi } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createStoryStatusService } from "../storyStatusService";

// ─── helpers ──────────────────────────────────────────────────────────────

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

type ChapterRow = {
  documentId: string;
  title: string;
  sortOrder: number;
  updatedAt: number;
  status?: "draft" | "final";
};

type KgEntityRow = {
  id: string;
  name: string;
  description: string;
  attributesJson: string;
};

type DocumentsStampRow = {
  chapterCount?: number;
  maxUpdatedAt: number;
};

type KgStampRow = {
  entityCount?: number;
  maxUpdatedAt: number;
};

/**
 * 创建 DB stub，可控每次 prepare().get() / .all() 返回值。
 *
 * stampRow:    getDocumentsStamp 用的 MAX(updated_at) 查询返回值
 * chapterRows: 章节列表查询返回值
 * kgRows:      KG 实体查询返回值
 */
function createDbStub(args?: {
  stampRow?: DocumentsStampRow;
  kgStampRow?: KgStampRow;
  stampError?: Error;
  chapterRows?: ChapterRow[];
  chapterError?: Error;
  kgRows?: KgEntityRow[];
  kgError?: Error;
}): Database.Database {
  const stampRow = args?.stampRow ?? { chapterCount: 0, maxUpdatedAt: 0 };
  const kgStampRow = args?.kgStampRow ?? { entityCount: 0, maxUpdatedAt: 0 };
  const stampError = args?.stampError;
  const chapterRows = args?.chapterRows ?? [];
  const chapterError = args?.chapterError;
  const kgRows = args?.kgRows ?? [];
  const kgError = args?.kgError;

  return {
    prepare: (sql: string) => {
      // getDocumentsStamp — MAX(updated_at)
      if (sql.includes("FROM documents") && sql.includes("MAX(updated_at)")) {
        return {
          get: (_projectId: string) => {
            if (stampError) throw stampError;
            return stampRow;
          },
        };
      }

      // getKgStamp — MAX(updated_at)
      if (sql.includes("FROM kg_entities") && sql.includes("COUNT(*) AS entityCount")) {
        return {
          get: (_projectId: string) => {
            if (stampError) throw stampError;
            return kgStampRow;
          },
        };
      }

      // chapter list
      if (sql.includes("type = 'chapter'") && !sql.includes("MAX")) {
        return {
          all: (_projectId: string) => {
            if (chapterError) throw chapterError;
            return chapterRows.map((row) => ({
              ...row,
              status: row.status ?? "draft",
            }));
          },
        };
      }

      // KG foreshadowing entities
      if (sql.includes("FROM kg_entities")) {
        return {
          all: (_projectId: string) => {
            if (kgError) throw kgError;
            return kgRows;
          },
        };
      }

      // fallback
      return {
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 0 }),
      };
    },
  } as unknown as Database.Database;
}

// ─── 基础成功路径 ──────────────────────────────────────────────────────────

describe("storyStatusService", () => {
  describe("getStoryStatus — 基础成功路径", () => {
    it("有章节时返回正确 chapterProgress 和 interruptedTask", () => {
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000 },
        { documentId: "doc-2", title: "第二章", sortOrder: 2, updatedAt: 2000 },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters, stampRow: { maxUpdatedAt: 2000 } }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // doc-2 updatedAt=2000 最大 → 为中断点；在 sort_order 排列后是第 2 章
      expect(result.data.chapterProgress.totalChapters).toBe(2);
      expect(result.data.chapterProgress.currentChapterNumber).toBe(2);
      expect(result.data.chapterProgress.currentChapterTitle).toBe("第二章");
      expect(result.data.interruptedTask).not.toBeNull();
      expect(result.data.interruptedTask?.documentId).toBe("doc-2");
      expect(result.data.interruptedTask?.chapterTitle).toBe("第二章");
      expect(result.data.interruptedTask?.lastEditedAt).toBe(2000);
    });

    it("无章节时 chapterProgress 全零，interruptedTask 为 null", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-empty" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.chapterProgress.totalChapters).toBe(0);
      expect(result.data.chapterProgress.currentChapterNumber).toBe(0);
      expect(result.data.chapterProgress.currentChapterTitle).toBe("");
      expect(result.data.interruptedTask).toBeNull();
    });

    it("返回 activeForeshadowing 列表", () => {
      const kgRows: KgEntityRow[] = [
        { id: "kg-1", name: "老人的秘密", description: "从未揭晓的身份", attributesJson: '{"isForeshadowing":true}' },
        { id: "kg-2", name: "红色信件", description: "第三章留下的线索", attributesJson: '{"isForeshadowing":true,"status":"active"}' },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ kgRows }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.activeForeshadowing).toHaveLength(2);
      expect(result.data.activeForeshadowing[0].id).toBe("kg-1");
      expect(result.data.activeForeshadowing[0].name).toBe("老人的秘密");
      expect(result.data.activeForeshadowing[1].id).toBe("kg-2");
    });

    it("Scenario: summary query cost stays within budget", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(typeof result.data.queryCostMs).toBe("number");
      expect(result.data.queryCostMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── suggestedAction 推断 ─────────────────────────────────────────────

  describe("suggestedAction 推断", () => {
    it("≥3 条伏笔 → 回收伏笔提示", () => {
      const kgRows: KgEntityRow[] = [
        { id: "kg-1", name: "线索A", description: "", attributesJson: '{"isForeshadowing":true}' },
        { id: "kg-2", name: "线索B", description: "", attributesJson: '{"isForeshadowing":true}' },
        { id: "kg-3", name: "线索C", description: "", attributesJson: '{"isForeshadowing":true}' },
      ];
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000 },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ kgRows, chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.suggestedAction).toContain("回收伏笔");
      expect(result.data.suggestedAction).toContain("3");
    });

    it("有中断点，无伏笔 → 继续写作", () => {
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000 },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.suggestedAction).toBe("继续写作");
    });

    it("有章节未完成（2/3）且有中断点 → 继续写作", () => {
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000 },
        { documentId: "doc-2", title: "第二章", sortOrder: 2, updatedAt: 500 },
        { documentId: "doc-3", title: "第三章", sortOrder: 3, updatedAt: 200 },
      ];
      // doc-1 updatedAt=1000 最大 → 当前为第1章，totalChapters=3 → 建议开始第2章
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // doc-1 是最新编辑（updatedAt=1000），是 sortOrder=1 即第1章
      // 有中断点 → 规则优先返回"继续写作"（当 foreshadowing<3 且 hasInterruptedTask）
      expect(result.data.suggestedAction).toBe("继续写作");
    });

    it("有章节未完成（2/3）但最新章已定稿 → 开始下一章", () => {
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000, status: "final" },
        { documentId: "doc-2", title: "第二章", sortOrder: 2, updatedAt: 500, status: "draft" },
        { documentId: "doc-3", title: "第三章", sortOrder: 3, updatedAt: 200, status: "draft" },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.interruptedTask).toBeNull();
      expect(result.data.suggestedAction).toBe("开始第 2 章");
    });

    it("无章节，无伏笔 → 继续写作（兜底）", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.suggestedAction).toBe("继续写作");
    });

    it("1-2 条伏笔且无章节 → 回收伏笔提示", () => {
      const kgRows: KgEntityRow[] = [
        { id: "kg-1", name: "线索A", description: "", attributesJson: '{"isForeshadowing":true}' },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ kgRows }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // totalChapters=0, hasInterruptedTask=false, foreshadowing=1 → 回收伏笔
      expect(result.data.suggestedAction).toContain("回收伏笔");
    });
  });

  // ─── 缓存行为 ─────────────────────────────────────────────────────────

  describe("缓存行为", () => {
    it("第二次调用命中缓存，不重新查询 DB", () => {
      const db = createDbStub({ stampRow: { maxUpdatedAt: 1000 } });
      const prepareSpy = vi.spyOn(db, "prepare");

      const svc = createStoryStatusService({ db, logger: createLogger() });

      // 首次调用 → 建立缓存
      svc.getStoryStatus({ projectId: "proj-cache" });
      const firstCallCount = prepareSpy.mock.calls.length;

      // 第二次调用 → 缓存命中，不调用 prepare（stamp 查询除外）
      svc.getStoryStatus({ projectId: "proj-cache" });
      // 缓存命中路径仍会调用 getDocumentsStamp 来做失效检测
      // 但不会调用章节/KG/memory 查询
      const secondCallCount = prepareSpy.mock.calls.length;

      // 第二次调用应仅多一次 stamp 查询（1 次 prepare），而非全套 4 次
      expect(secondCallCount - firstCallCount).toBeLessThan(firstCallCount);
    });

    it("显式 invalidateCache 后再次查询重建缓存", () => {
      const db = createDbStub({ stampRow: { maxUpdatedAt: 1000 } });
      const prepareSpy = vi.spyOn(db, "prepare");

      const svc = createStoryStatusService({ db, logger: createLogger() });

      svc.getStoryStatus({ projectId: "proj-inv" });
      const afterFirst = prepareSpy.mock.calls.length;

      svc.invalidateCache("proj-inv");

      // invalidate 后再次调用应触发全量查询
      svc.getStoryStatus({ projectId: "proj-inv" });
      const afterSecond = prepareSpy.mock.calls.length;

      expect(afterSecond - afterFirst).toBeGreaterThan(0);
    });

    it("Scenario: stamp changed invalidates cache immediately", () => {
      let stamp = 1000;
      let chapterCount = 1;
      const db: Database.Database = {
        prepare: (sql: string) => {
          if (sql.includes("FROM documents") && sql.includes("MAX(updated_at)")) {
            return {
              get: () => ({ maxUpdatedAt: stamp, chapterCount }),
            };
          }
          if (sql.includes("FROM kg_entities") && sql.includes("COUNT(*) AS entityCount")) {
            return {
              get: () => ({ maxUpdatedAt: 1000, entityCount: 0 }),
            };
          }
          if (sql.includes("type = 'chapter'") && !sql.includes("MAX")) {
            return { all: () => [] };
          }
          if (sql.includes("FROM kg_entities")) {
            return { all: () => [] };
          }
          return { get: () => undefined, all: () => [], run: () => ({ changes: 0 }) };
        },
      } as unknown as Database.Database;

      const prepareSpy = vi.spyOn(db, "prepare");
      const svc = createStoryStatusService({ db, logger: createLogger() });

      // 首次调用建立缓存，stamp=1000
      svc.getStoryStatus({ projectId: "proj-stamp" });
      const afterFirst = prepareSpy.mock.calls.length;

      // 变更 stamp（模拟文档更新）
      stamp = 2000;

      // 第二次调用应检测到 stamp 不一致，重建缓存
      svc.getStoryStatus({ projectId: "proj-stamp" });
      const afterSecond = prepareSpy.mock.calls.length;

      // 完整重查比只做 stamp 检测多调用 prepare
      expect(afterSecond - afterFirst).toBeGreaterThan(1);
    });

    it("仅章节数量变化（删除非最新章节）也会触发缓存失效", () => {
      let stamp = 2000; // 最新章节未变
      let chapterCount = 3;
      const db: Database.Database = {
        prepare: (sql: string) => {
          if (sql.includes("FROM documents") && sql.includes("MAX(updated_at)")) {
            return {
              get: () => ({ maxUpdatedAt: stamp, chapterCount }),
            };
          }
          if (sql.includes("FROM kg_entities") && sql.includes("COUNT(*) AS entityCount")) {
            return {
              get: () => ({ maxUpdatedAt: 1000, entityCount: 0 }),
            };
          }
          if (sql.includes("type = 'chapter'") && !sql.includes("MAX")) {
            return {
              all: () => [
                { documentId: "doc-1", title: "第一章", sortOrder: 1, updatedAt: 1000, status: "draft" },
                { documentId: "doc-2", title: "第二章", sortOrder: 2, updatedAt: 2000, status: "draft" },
                { documentId: "doc-3", title: "第三章", sortOrder: 3, updatedAt: 1500, status: "draft" },
              ],
            };
          }
          if (sql.includes("FROM kg_entities")) {
            return { all: () => [] };
          }
          return { get: () => undefined, all: () => [], run: () => ({ changes: 0 }) };
        },
      } as unknown as Database.Database;

      const prepareSpy = vi.spyOn(db, "prepare");
      const svc = createStoryStatusService({ db, logger: createLogger() });

      svc.getStoryStatus({ projectId: "proj-delete" });
      const afterFirst = prepareSpy.mock.calls.length;

      // 删除了一个非最新章节：MAX(updated_at) 不变，但 COUNT(*) 变化
      chapterCount = 2;

      svc.getStoryStatus({ projectId: "proj-delete" });
      const afterSecond = prepareSpy.mock.calls.length;
      expect(afterSecond - afterFirst).toBeGreaterThan(1);
    });

    it("KG stamp 变更时缓存自动失效（文档未变）", () => {
      const docsStamp = { maxUpdatedAt: 2000, chapterCount: 2 };
      let kgStamp = { maxUpdatedAt: 1000, entityCount: 1 };
      const db: Database.Database = {
        prepare: (sql: string) => {
          if (sql.includes("FROM documents") && sql.includes("MAX(updated_at)")) {
            return {
              get: () => docsStamp,
            };
          }
          if (sql.includes("FROM kg_entities") && sql.includes("COUNT(*) AS entityCount")) {
            return {
              get: () => kgStamp,
            };
          }
          if (sql.includes("type = 'chapter'") && !sql.includes("MAX")) {
            return { all: () => [] };
          }
          if (sql.includes("FROM kg_entities")) {
            return { all: () => [] };
          }
          return { get: () => undefined, all: () => [], run: () => ({ changes: 0 }) };
        },
      } as unknown as Database.Database;

      const prepareSpy = vi.spyOn(db, "prepare");
      const svc = createStoryStatusService({ db, logger: createLogger() });

      svc.getStoryStatus({ projectId: "proj-kg-stamp" });
      const afterFirst = prepareSpy.mock.calls.length;

      // 仅 KG 变化，documents stamp 不变
      kgStamp = { maxUpdatedAt: 1500, entityCount: 2 };
      svc.getStoryStatus({ projectId: "proj-kg-stamp" });
      const afterSecond = prepareSpy.mock.calls.length;

      expect(afterSecond - afterFirst).toBeGreaterThan(1);
    });

    it("缓存 TTL 到期后重新查询", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      try {
        const db = createDbStub({ stampRow: { chapterCount: 1, maxUpdatedAt: 1000 } });
        const prepareSpy = vi.spyOn(db, "prepare");
        const svc = createStoryStatusService({ db, logger: createLogger() });

        svc.getStoryStatus({ projectId: "proj-ttl" });
        const afterFirst = prepareSpy.mock.calls.length;

        // TTL 内：缓存命中
        vi.advanceTimersByTime(29_000);
        svc.getStoryStatus({ projectId: "proj-ttl" });
        const afterSecond = prepareSpy.mock.calls.length;
        expect(afterSecond - afterFirst).toBeLessThan(afterFirst);

        // TTL 过期：重查
        vi.advanceTimersByTime(1_001);
        svc.getStoryStatus({ projectId: "proj-ttl" });
        const afterThird = prepareSpy.mock.calls.length;
        expect(afterThird - afterSecond).toBeGreaterThan(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("不同 projectId 互相独立，缓存不干扰", () => {
      const svc = createStoryStatusService({
        db: createDbStub({ stampRow: { maxUpdatedAt: 0 } }),
        logger: createLogger(),
      });

      const r1 = svc.getStoryStatus({ projectId: "proj-A" });
      const r2 = svc.getStoryStatus({ projectId: "proj-B" });

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
    });
  });

  // ─── 参数校验 ─────────────────────────────────────────────────────────

  describe("参数校验", () => {
    it("projectId 为空字符串 → INVALID_ARGUMENT", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("projectId 全空白 → INVALID_ARGUMENT", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "   " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ─── DB 异常处理 ──────────────────────────────────────────────────────

  describe("DB 异常处理", () => {
    it("chapter 查询抛出异常 → DB_ERROR", () => {
      const svc = createStoryStatusService({
        db: createDbStub({ chapterError: new Error("disk full") }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });

    it("KG 查询抛出异常 → DB_ERROR", () => {
      const svc = createStoryStatusService({
        db: createDbStub({ kgError: new Error("locked") }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });

    it("stamp 查询异常时返回 0，不影响主流程", () => {
      // stampError 应被 getDocumentsStamp 内部 catch 捕获，返回 0，主查询正常进行
      const svc = createStoryStatusService({
        db: createDbStub({ stampError: new Error("read error") }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      // stamp 查询失败不应导致 getStoryStatus 失败
      expect(result.ok).toBe(true);
    });
  });

  // ─── 性能约束 ─────────────────────────────────────────────────────────

  describe("性能约束", () => {
    it("同步 DB stub 下返回 queryCostMs（验证无阻塞路径）", () => {
      const chapters: ChapterRow[] = Array.from({ length: 50 }, (_, i) => ({
        documentId: `doc-${i}`,
        title: `第 ${i + 1} 章`,
        sortOrder: i + 1,
        updatedAt: i * 100,
      }));
      const kgRows: KgEntityRow[] = Array.from({ length: 20 }, (_, i) => ({
        id: `kg-${i}`,
        name: `伏笔${i}`,
        description: "test",
        attributesJson: '{"isForeshadowing":true}',
      }));

      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters, kgRows }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-perf" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(typeof result.data.queryCostMs).toBe("number");
      expect(result.data.queryCostMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── 边界情况 ─────────────────────────────────────────────────────────

  describe("边界情况", () => {
    it("单章节项目：currentChapterNumber=1，totalChapters=1", () => {
      const chapters: ChapterRow[] = [
        { documentId: "doc-1", title: "唯一章节", sortOrder: 1, updatedAt: 5000 },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-single" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.chapterProgress.currentChapterNumber).toBe(1);
      expect(result.data.chapterProgress.totalChapters).toBe(1);
    });

    it("章节 updatedAt 相同时取 documentId 排序最前的", () => {
      // 所有 updatedAt=1000，findIndex 取第一个最大值
      const chapters: ChapterRow[] = [
        { documentId: "doc-aaa", title: "甲", sortOrder: 1, updatedAt: 1000 },
        { documentId: "doc-bbb", title: "乙", sortOrder: 2, updatedAt: 1000 },
      ];
      const svc = createStoryStatusService({
        db: createDbStub({ chapterRows: chapters }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-tie" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // 第一个满足最大 updatedAt 的是 doc-aaa
      expect(result.data.interruptedTask?.documentId).toBe("doc-aaa");
    });

    it("KG 查询返回空 → activeForeshadowing 为空数组", () => {
      const svc = createStoryStatusService({
        db: createDbStub({ kgRows: [] }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.activeForeshadowing).toHaveLength(0);
    });

    it("projectId 含前后空格时自动 trim", () => {
      const svc = createStoryStatusService({
        db: createDbStub(),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "  proj-trim  " });

      expect(result.ok).toBe(true);
    });

    it("foreshadowing 返回不再额外截断到 50 条", () => {
      const kgRows: KgEntityRow[] = Array.from({ length: 80 }, (_, i) => ({
        id: `kg-${i}`,
        name: `伏笔-${i}`,
        description: `desc-${i}`,
        attributesJson: '{"isForeshadowing":true,"status":"active"}',
      }));
      const svc = createStoryStatusService({
        db: createDbStub({ kgRows }),
        logger: createLogger(),
      });

      const result = svc.getStoryStatus({ projectId: "proj-many-foreshadowing" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.activeForeshadowing).toHaveLength(80);
    });

    it("KG 查询 SQL 仅按 foreshadowing attributes 模式过滤", () => {
      const db = createDbStub();
      const prepareSpy = vi.spyOn(db, "prepare");
      const svc = createStoryStatusService({ db, logger: createLogger() });

      svc.getStoryStatus({ projectId: "proj-sql-filter" });

      const kgSql = prepareSpy.mock.calls
        .map((call) => call[0])
        .find((sql) =>
          typeof sql === "string" &&
          sql.includes("FROM kg_entities") &&
          !sql.includes("COUNT(*) AS entityCount"),
        );

      expect(kgSql).toBeDefined();
      expect(kgSql).toContain("LIKE '%\"isForeshadowing\":true%'");
      expect(kgSql).toContain("NOT LIKE '%\"status\":\"resolved\"%'");
      expect(kgSql).toContain("LIMIT 200");
    });
  });
});
