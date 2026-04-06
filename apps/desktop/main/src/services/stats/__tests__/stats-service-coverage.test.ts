/**
 * statsService — vitest 全覆盖
 *
 * 验证 increment / getToday / getRange 的行为：
 * - happy path（正常写入、读取、聚合）
 * - DB 错误返回 DB_ERROR
 * - 数据正规化（负数、NaN、非整数）
 * - 空范围返回零汇总
 */
import { describe, it, expect, vi } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createStatsService } from "../statsService";

// ── helpers ────────────────────────────────────────────────────────

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

type StatsRow = {
  date: string;
  wordsWritten: number;
  writingSeconds: number;
  skillsUsed: number;
  documentsCreated: number;
};

function createDbStub(args?: {
  runError?: Error;
  getRow?: StatsRow | undefined;
  getError?: Error;
  allRows?: StatsRow[];
  allError?: Error;
}): Database.Database {
  const runError = args?.runError;
  const getRow = args?.getRow;
  const getError = args?.getError;
  const allRows = args?.allRows ?? [];
  const allError = args?.allError;

  return {
    prepare: (sql: string) => {
      if (sql.includes("INSERT INTO stats_daily")) {
        return {
          run: (..._params: unknown[]) => {
            if (runError) throw runError;
            return { changes: 1 };
          },
        };
      }
      if (sql.includes("FROM stats_daily WHERE date = ?")) {
        return {
          get: (..._params: unknown[]) => {
            if (getError) throw getError;
            return getRow;
          },
        };
      }
      if (sql.includes("FROM stats_daily WHERE date >= ?")) {
        return {
          all: (..._params: unknown[]) => {
            if (allError) throw allError;
            return allRows;
          },
        };
      }
      return {
        run: () => ({ changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
    },
  } as unknown as Database.Database;
}

const TS_2025_06_15 = new Date("2025-06-15T10:30:00Z").getTime();

// ── tests ──────────────────────────────────────────────────────────

describe("StatsService", () => {
  // ── increment ──────────────────────────────────────────────────

  describe("increment", () => {
    it("正常写入后返回 { updated: true, date }", () => {
      const svc = createStatsService({ db: createDbStub(), logger: createLogger() });
      const result = svc.increment({ ts: TS_2025_06_15, delta: { wordsWritten: 42, writingSeconds: 300 } });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.updated).toBe(true);
      expect(result.data.date).toBe("2025-06-15");
    });

    it("只传部分 delta 字段时其余默认为 0", () => {
      const svc = createStatsService({ db: createDbStub(), logger: createLogger() });
      const result = svc.increment({ ts: TS_2025_06_15, delta: { wordsWritten: 5 } });

      expect(result.ok).toBe(true);
    });

    it("delta 为空对象时仍然成功", () => {
      const svc = createStatsService({ db: createDbStub(), logger: createLogger() });
      const result = svc.increment({ ts: TS_2025_06_15, delta: {} });

      expect(result.ok).toBe(true);
    });

    it("DB 异常返回 DB_ERROR", () => {
      const svc = createStatsService({
        db: createDbStub({ runError: new Error("disk full") }),
        logger: createLogger(),
      });
      const result = svc.increment({ ts: TS_2025_06_15, delta: { wordsWritten: 10 } });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });

    it("DB 异常时 logger.error 被调用", () => {
      const logger = createLogger();
      const svc = createStatsService({
        db: createDbStub({ runError: new Error("io error") }),
        logger,
      });
      svc.increment({ ts: TS_2025_06_15, delta: { wordsWritten: 1 } });

      expect(logger.error).toHaveBeenCalledWith(
        "stats_increment_failed",
        expect.objectContaining({ code: "DB_ERROR" }),
      );
    });

    it("UTC 日期边界正确（UTC 午夜前后）", () => {
      const svc = createStatsService({ db: createDbStub(), logger: createLogger() });
      const beforeMidnight = new Date("2025-06-15T23:59:59Z").getTime();
      const afterMidnight = new Date("2025-06-16T00:00:01Z").getTime();

      const r1 = svc.increment({ ts: beforeMidnight, delta: { wordsWritten: 1 } });
      const r2 = svc.increment({ ts: afterMidnight, delta: { wordsWritten: 1 } });

      expect(r1.ok && r1.data.date).toBe("2025-06-15");
      expect(r2.ok && r2.data.date).toBe("2025-06-16");
    });
  });

  // ── getToday ───────────────────────────────────────────────────

  describe("getToday", () => {
    it("无数据时返回当日零汇总", () => {
      const svc = createStatsService({
        db: createDbStub({ getRow: undefined }),
        logger: createLogger(),
      });
      const result = svc.getToday({ ts: TS_2025_06_15 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.date).toBe("2025-06-15");
      expect(result.data.summary).toEqual({
        wordsWritten: 0,
        writingSeconds: 0,
        skillsUsed: 0,
        documentsCreated: 0,
      });
    });

    it("有数据时返回当日汇总", () => {
      const row: StatsRow = {
        date: "2025-06-15",
        wordsWritten: 150,
        writingSeconds: 3600,
        skillsUsed: 5,
        documentsCreated: 2,
      };
      const svc = createStatsService({
        db: createDbStub({ getRow: row }),
        logger: createLogger(),
      });
      const result = svc.getToday({ ts: TS_2025_06_15 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.summary.wordsWritten).toBe(150);
      expect(result.data.summary.writingSeconds).toBe(3600);
      expect(result.data.summary.skillsUsed).toBe(5);
      expect(result.data.summary.documentsCreated).toBe(2);
    });

    it("负值被规整为 0（asNonNegativeInt）", () => {
      const row: StatsRow = {
        date: "2025-06-15",
        wordsWritten: -10,
        writingSeconds: -1,
        skillsUsed: -5,
        documentsCreated: -3,
      };
      const svc = createStatsService({
        db: createDbStub({ getRow: row }),
        logger: createLogger(),
      });
      const result = svc.getToday({ ts: TS_2025_06_15 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.summary.wordsWritten).toBe(0);
      expect(result.data.summary.writingSeconds).toBe(0);
    });

    it("DB 异常返回 DB_ERROR", () => {
      const svc = createStatsService({
        db: createDbStub({ getError: new Error("corrupt") }),
        logger: createLogger(),
      });
      const result = svc.getToday({ ts: TS_2025_06_15 });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });
  });

  // ── getRange ───────────────────────────────────────────────────

  describe("getRange", () => {
    it("多日数据正确聚合", () => {
      const rows: StatsRow[] = [
        { date: "2025-06-14", wordsWritten: 100, writingSeconds: 600, skillsUsed: 2, documentsCreated: 1 },
        { date: "2025-06-15", wordsWritten: 200, writingSeconds: 900, skillsUsed: 3, documentsCreated: 0 },
      ];
      const svc = createStatsService({
        db: createDbStub({ allRows: rows }),
        logger: createLogger(),
      });
      const result = svc.getRange({ from: "2025-06-14", to: "2025-06-15" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.from).toBe("2025-06-14");
      expect(result.data.to).toBe("2025-06-15");
      expect(result.data.days).toHaveLength(2);
      expect(result.data.summary.wordsWritten).toBe(300);
      expect(result.data.summary.writingSeconds).toBe(1500);
      expect(result.data.summary.skillsUsed).toBe(5);
      expect(result.data.summary.documentsCreated).toBe(1);
    });

    it("空范围返回零汇总", () => {
      const svc = createStatsService({
        db: createDbStub({ allRows: [] }),
        logger: createLogger(),
      });
      const result = svc.getRange({ from: "2025-01-01", to: "2025-01-01" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.days).toHaveLength(0);
      expect(result.data.summary).toEqual({
        wordsWritten: 0,
        writingSeconds: 0,
        skillsUsed: 0,
        documentsCreated: 0,
      });
    });

    it("单日范围返回该日数据", () => {
      const rows: StatsRow[] = [
        { date: "2025-06-15", wordsWritten: 42, writingSeconds: 120, skillsUsed: 1, documentsCreated: 0 },
      ];
      const svc = createStatsService({
        db: createDbStub({ allRows: rows }),
        logger: createLogger(),
      });
      const result = svc.getRange({ from: "2025-06-15", to: "2025-06-15" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.days).toHaveLength(1);
      expect(result.data.summary.wordsWritten).toBe(42);
    });

    it("DB 异常返回 DB_ERROR", () => {
      const svc = createStatsService({
        db: createDbStub({ allError: new Error("timeout") }),
        logger: createLogger(),
      });
      const result = svc.getRange({ from: "2025-06-14", to: "2025-06-15" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });

    it("含非有限数值行时被规整为 0", () => {
      const rows: StatsRow[] = [
        { date: "2025-06-15", wordsWritten: NaN, writingSeconds: Infinity, skillsUsed: -1, documentsCreated: 1.7 },
      ];
      const svc = createStatsService({
        db: createDbStub({ allRows: rows }),
        logger: createLogger(),
      });
      const result = svc.getRange({ from: "2025-06-15", to: "2025-06-15" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.summary.wordsWritten).toBe(0);
      expect(result.data.summary.writingSeconds).toBe(0);
      expect(result.data.summary.skillsUsed).toBe(0);
      expect(result.data.summary.documentsCreated).toBe(1);
    });
  });
});
