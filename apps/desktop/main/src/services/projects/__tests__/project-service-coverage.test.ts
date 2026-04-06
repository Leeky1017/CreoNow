/**
 * projectService — vitest 覆盖
 *
 * 验证 CRUD、导航、生命周期、列表、统计等核心行为。
 * 全部外部依赖（DB、fs、contextFs、templateService）均通过 mock 隔离。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";

// ── mock modules ───────────────────────────────────────────────────

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    cpSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  cpSync: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "mock-uuid-1234"),
}));

vi.mock("@shared/hashUtils", () => ({
  hashJson: vi.fn(() => "mock-hash"),
}));

vi.mock("@shared/timeUtils", () => ({
  nowTs: vi.fn(() => 1000),
}));

vi.mock("../../db/paths", () => ({
  redactUserDataPath: vi.fn((_base: string, p: string) => p),
}));

vi.mock("../context/contextFs", () => ({
  ensureCreonowDirStructure: vi.fn(() => ({ ok: true, data: undefined })),
  getCreonowRootPath: vi.fn((root: string) => `${root}/.creonow`),
}));

vi.mock("./templateService", () => ({
  resolveTemplateSeedDocuments: vi.fn(() => ({ ok: true, data: [] })),
}));

import { createProjectService } from "../projectService";

// ── DB stub ────────────────────────────────────────────────────────

type SqlHandler = {
  run: (...args: unknown[]) => { changes: number };
  get: (...args: unknown[]) => Record<string, unknown> | undefined;
  all: (...args: unknown[]) => Record<string, unknown>[];
};

function makeProjectRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    projectId: "proj-1",
    name: "Test Project",
    rootPath: "/userData/projects/proj-1",
    type: "novel",
    description: "desc",
    stage: "outline",
    targetWordCount: null,
    targetChapterCount: null,
    narrativePerson: "first",
    languageStyle: "",
    targetAudience: "",
    defaultSkillSetId: null,
    knowledgeGraphId: null,
    updatedAt: 1000,
    archivedAt: null,
    ...overrides,
  };
}

function createMockDb(overrides?: {
  getProject?: Record<string, unknown> | undefined;
  countRow?: { count: number };
  statsRow?: { total: number; active: number; archived: number };
  projectStatsRows?: Array<{ projectId: string; wordCount: number; targetWordCount: number | null }>;
  listRows?: Record<string, unknown>[];
  settingsRow?: { value_json: string } | undefined;
  runChanges?: number;
  throwOnPrepare?: Error;
  throwOnRun?: Error;
  allDocRows?: Record<string, unknown>[];
}): Database.Database & { __executedRuns: Array<{ sql: string; args: unknown[] }> } {
  const getProject = overrides?.getProject;
  const countRow = overrides?.countRow ?? { count: 0 };
  const statsRow = overrides?.statsRow ?? { total: 1, active: 1, archived: 0 };
  const projectStatsRows = overrides?.projectStatsRows ?? [];
  const listRows = overrides?.listRows ?? [];
  const projectRowsById = new Map<string, Record<string, unknown>>();
  for (const row of listRows) {
    const projectId = row.projectId;
    if (typeof projectId === "string") {
      projectRowsById.set(projectId, row);
    }
  }
  if (getProject && typeof getProject.projectId === "string") {
    projectRowsById.set(getProject.projectId, getProject);
  }
  const settingsRow = overrides?.settingsRow;
  const runChanges = overrides?.runChanges ?? 1;
  const throwOnPrepare = overrides?.throwOnPrepare;
  const throwOnRun = overrides?.throwOnRun;
  const allDocRows = overrides?.allDocRows ?? [];
  const executedRuns: Array<{ sql: string; args: unknown[] }> = [];

  const handler: SqlHandler = {
    run: (..._args: unknown[]) => {
      if (throwOnRun) throw throwOnRun;
      return { changes: runChanges };
    },
    get: (..._args: unknown[]) => {
      return undefined;
    },
    all: (..._args: unknown[]) => {
      return [];
    },
  };

  const db = {
    prepare: (sql: string) => {
      if (throwOnPrepare) throw throwOnPrepare;

      // project by ID
      if (sql.includes("FROM projects WHERE project_id")) {
        return {
          ...handler,
          get: (...args: unknown[]) => {
            const requestedProjectId = typeof args[0] === "string" ? args[0] : null;
            if (requestedProjectId !== null) {
              return projectRowsById.get(requestedProjectId);
            }
            return getProject;
          },
        };
      }

      // stats aggregate (must check before generic COUNT)
      if (sql.includes("SUM(CASE")) {
        return {
          ...handler,
          get: () => statsRow,
        };
      }

      // per-project stats rows
      if (sql.includes("LEFT JOIN documents d ON d.project_id = p.project_id")) {
        return {
          ...handler,
          all: () => projectStatsRows,
        };
      }

      // count (capacity check)
      if (sql.includes("COUNT(*)") && sql.includes("projects")) {
        return {
          ...handler,
          get: () => countRow,
        };
      }

      // list projects
      if (sql.includes("FROM projects") && sql.includes("ORDER BY updated_at DESC")) {
        return {
          ...handler,
          all: () => {
            const includeArchived = !sql.includes("WHERE archived_at IS NULL");
            if (includeArchived) {
              return listRows;
            }
            return listRows.filter((row) => row.archivedAt == null);
          },
        };
      }

      // settings read
      if (sql.includes("FROM settings WHERE scope")) {
        return {
          ...handler,
          get: () => settingsRow,
        };
      }

      // documents read
      if (sql.includes("FROM documents WHERE project_id")) {
        return {
          ...handler,
          all: () => allDocRows,
        };
      }

      return handler;
    },
    transaction: vi.fn((fn: () => void) => {
      return () => fn();
    }),
  } as unknown as Database.Database;

  const originalPrepare = db.prepare.bind(db);
  db.prepare = ((sql: string) => {
    const statement = originalPrepare(sql) as SqlHandler;
    return {
      ...statement,
      run: (...args: unknown[]) => {
        executedRuns.push({ sql, args });
        return statement.run(...args);
      },
    };
  }) as Database.Database["prepare"];

  return Object.assign(db, { __executedRuns: executedRuns });
}

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

function makeService(dbOverrides?: Parameters<typeof createMockDb>[0]) {
  const db = createMockDb(dbOverrides);
  const logger = createLogger();
  const removeProjectRoot = vi.fn();
  const switchKg = vi.fn();
  const switchMem = vi.fn();

  const svc = createProjectService({
    db,
    userDataDir: "/userData",
    logger,
    now: () => 2000,
    switchKnowledgeGraphContext: switchKg,
    switchMemoryContext: switchMem,
    removeProjectRoot,
  });

  return { svc, db, logger, removeProjectRoot, switchKg, switchMem };
}

// ── tests ──────────────────────────────────────────────────────────

describe("ProjectService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────

  describe("create", () => {
    it("正常创建返回 projectId 和 rootPath", () => {
      const { svc } = makeService();
      const result = svc.create({ name: "My Novel" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.projectId).toBe("mock-uuid-1234");
      expect(result.data.rootPath).toContain("projects");
    });

    it("空名称使用 Untitled 作为默认", () => {
      const { svc, db } = makeService();
      const result = svc.create({});

      expect(result.ok).toBe(true);
      const projectInsert = db.__executedRuns.find((entry) =>
        entry.sql.includes("INSERT INTO projects"),
      );
      expect(projectInsert?.args[1]).toBe("Untitled");
    });

    it("名称超过 120 字符时返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.create({ name: "a".repeat(121) });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("无效的 type 返回 PROJECT_METADATA_INVALID_ENUM", () => {
      const { svc } = makeService();
      const result = svc.create({ name: "Test", type: "blog" as never });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_METADATA_INVALID_ENUM");
    });

    it("项目数量达上限返回 PROJECT_CAPACITY_EXCEEDED", () => {
      const { svc } = makeService({ countRow: { count: 2000 } });
      const result = svc.create({ name: "Over Limit" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_CAPACITY_EXCEEDED");
    });

    it("DB transaction 异常返回 DB_ERROR", () => {
      const { svc } = makeService({ throwOnRun: new Error("insert fail") });
      const result = svc.create({ name: "Fail" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DB_ERROR");
    });
  });

  // ── createAiAssistDraft ────────────────────────────────────────

  describe("createAiAssistDraft", () => {
    it("正常 prompt 返回草稿结构", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "一个关于探险的故事" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.name).toBe("AI 辅助项目");
      expect(result.data.type).toBe("novel");
      expect(result.data.chapterOutlines).toHaveLength(5);
      expect(result.data.characters).toHaveLength(3);
    });

    it("空 prompt 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "  " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("含 '剧本' 的 prompt 返回 screenplay 类型", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "写一个剧本" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.type).toBe("screenplay");
    });

    it("含 '自媒体' 的 prompt 返回 media 类型", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "自媒体文案" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.type).toBe("media");
    });

    it("含 '限流' 的 prompt 返回 RATE_LIMITED", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "限流测试" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("RATE_LIMITED");
    });

    it("含 'timeout' 的 prompt 返回 RATE_LIMITED", () => {
      const { svc } = makeService();
      const result = svc.createAiAssistDraft({ prompt: "timeout test" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("RATE_LIMITED");
    });
  });

  // ── rename ─────────────────────────────────────────────────────

  describe("rename", () => {
    it("正常改名返回新名称和时间戳", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.rename({ projectId: "proj-1", name: "New Name" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.name).toBe("New Name");
      expect(result.data.projectId).toBe("proj-1");
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.rename({ projectId: "  ", name: "x" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("空名称返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.rename({ projectId: "proj-1", name: "  " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在（changes=0）返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: makeProjectRow(), runChanges: 0 });
      const result = svc.rename({ projectId: "proj-1", name: "x" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  // ── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("正常更新 metadata 返回 { updated: true }", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.update({ projectId: "proj-1", patch: { description: "updated desc" } });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.updated).toBe(true);
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.update({ projectId: "  ", patch: {} });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.update({ projectId: "nonexistent", patch: {} });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });

    it("无效 stage 返回 PROJECT_METADATA_INVALID_ENUM", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.update({
        projectId: "proj-1",
        patch: { stage: "invalid" as never },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_METADATA_INVALID_ENUM");
    });

    it("无效 narrativePerson 返回 PROJECT_METADATA_INVALID_ENUM", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.update({
        projectId: "proj-1",
        patch: { narrativePerson: "second" as never },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_METADATA_INVALID_ENUM");
    });
  });

  // ── list ───────────────────────────────────────────────────────

  describe("list", () => {
    it("返回项目列表", () => {
      const rows = [makeProjectRow(), makeProjectRow({ projectId: "proj-2", name: "P2" })];
      const { svc } = makeService({ listRows: rows });
      const result = svc.list();

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(2);
    });

    it("includeArchived=true 时含归档项目，默认列表仍过滤归档项目", () => {
      const rows = [
        makeProjectRow(),
        makeProjectRow({ projectId: "proj-2", archivedAt: 999 }),
      ];
      const { svc } = makeService({ listRows: rows });

      const activeOnlyResult = svc.list();
      expect(activeOnlyResult.ok).toBe(true);
      if (!activeOnlyResult.ok) return;
      expect(activeOnlyResult.data.items).toHaveLength(1);
      expect(activeOnlyResult.data.items[0].projectId).toBe("proj-1");
      expect(activeOnlyResult.data.items[0]).not.toHaveProperty("archivedAt");

      const includeArchivedResult = svc.list({ includeArchived: true });
      expect(includeArchivedResult.ok).toBe(true);
      if (!includeArchivedResult.ok) return;
      expect(includeArchivedResult.data.items).toHaveLength(2);
      expect(includeArchivedResult.data.items.map((item) => item.projectId)).toEqual(
        expect.arrayContaining(["proj-1", "proj-2"]),
      );

      const archivedItem = includeArchivedResult.data.items.find((item) => item.projectId === "proj-2");
      expect(archivedItem).toEqual(expect.objectContaining({ archivedAt: 999 }));
    });

    it("空列表返回空数组", () => {
      const { svc } = makeService({ listRows: [] });
      const result = svc.list();

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(0);
    });
  });

  // ── stats ──────────────────────────────────────────────────────

  describe("stats", () => {
    it("返回项目统计", () => {
      const { svc } = makeService({
        statsRow: { total: 5, active: 3, archived: 2 },
        projectStatsRows: [
          { projectId: "proj-1", wordCount: 32450, targetWordCount: 50000 },
          { projectId: "proj-2", wordCount: 0, targetWordCount: null },
        ],
      });
      const result = svc.stats();

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({
        total: 5,
        active: 3,
        archived: 2,
        totalWordCount: 32450,
        overallProgressPercent: 65,
        perProject: [
          { projectId: "proj-1", wordCount: 32450, targetWordCount: 50000, progressPercent: 65 },
          { projectId: "proj-2", wordCount: 0, targetWordCount: null, progressPercent: 0 },
        ],
      });
    });
  });

  // ── getCurrent / setCurrent ────────────────────────────────────

  describe("getCurrent", () => {
    it("有当前项目时返回 projectId 和 rootPath", () => {
      const { svc } = makeService({
        settingsRow: { value_json: JSON.stringify("proj-1") },
        getProject: makeProjectRow(),
      });
      const result = svc.getCurrent();

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.projectId).toBe("proj-1");
    });

    it("无当前项目设置返回 NOT_FOUND", () => {
      const { svc } = makeService({ settingsRow: undefined });
      const result = svc.getCurrent();

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("setCurrent", () => {
    it("正常设置返回 projectId 和 rootPath", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.setCurrent({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.projectId).toBe("proj-1");
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.setCurrent({ projectId: "" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.setCurrent({ projectId: "nonexistent" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  // ── switchProject ──────────────────────────────────────────────

  describe("switchProject", () => {
    it("正常切换返回 currentProjectId 和 switchedAt", () => {
      const { svc } = makeService({ getProject: makeProjectRow() });
      const result = svc.switchProject({
        projectId: "proj-1",
        fromProjectId: "proj-0",
        operatorId: "user-1",
        traceId: "trace-1",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.currentProjectId).toBe("proj-1");
      expect(result.data.switchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.switchProject({
        projectId: "  ",
        fromProjectId: "proj-0",
        operatorId: "user-1",
        traceId: "trace-1",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("空 operatorId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.switchProject({
        projectId: "proj-1",
        fromProjectId: "proj-0",
        operatorId: "  ",
        traceId: "trace-1",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("目标项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.switchProject({
        projectId: "nonexistent",
        fromProjectId: "proj-0",
        operatorId: "user-1",
        traceId: "trace-1",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });

    it("切换时调用 switchKnowledgeGraphContext", () => {
      const { svc, switchKg } = makeService({ getProject: makeProjectRow() });
      svc.switchProject({
        projectId: "proj-1",
        fromProjectId: "proj-0",
        operatorId: "user-1",
        traceId: "trace-1",
      });

      expect(switchKg).toHaveBeenCalledWith({
        fromProjectId: "proj-0",
        toProjectId: "proj-1",
        traceId: "trace-1",
      });
    });

    it("切换时调用 switchMemoryContext", () => {
      const { svc, switchMem } = makeService({ getProject: makeProjectRow() });
      svc.switchProject({
        projectId: "proj-1",
        fromProjectId: "proj-0",
        operatorId: "user-1",
        traceId: "trace-1",
      });

      expect(switchMem).toHaveBeenCalledWith({
        fromProjectId: "proj-0",
        toProjectId: "proj-1",
        traceId: "trace-1",
      });
    });
  });

  // ── lifecycle: archive / restore / purge / get ─────────────────

  describe("lifecycleArchive", () => {
    it("active 项目归档成功", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: null }) });
      const result = svc.lifecycleArchive({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("archived");
      expect(result.data.archivedAt).toBeDefined();
    });

    it("已归档项目重复归档返回幂等结果", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: 500 }) });
      const result = svc.lifecycleArchive({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("archived");
      expect(result.data.archivedAt).toBe(500);
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.lifecycleArchive({ projectId: "  " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.lifecycleArchive({ projectId: "nonexistent" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("lifecycleRestore", () => {
    it("archived 项目恢复成功", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: 500 }) });
      const result = svc.lifecycleRestore({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("active");
    });

    it("active 项目恢复返回幂等结果", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: null }) });
      const result = svc.lifecycleRestore({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("active");
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.lifecycleRestore({ projectId: "  " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });
  });

  describe("lifecyclePurge", () => {
    it("archived 项目清除成功", () => {
      const { svc, removeProjectRoot } = makeService({
        getProject: makeProjectRow({
          archivedAt: 500,
          rootPath: "/userData/projects/proj-1",
        }),
      });
      const result = svc.lifecyclePurge({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("deleted");
      expect(removeProjectRoot).toHaveBeenCalled();
    });

    it("active 项目直接清除被拒绝（PROJECT_DELETE_REQUIRES_ARCHIVE）", () => {
      const { svc } = makeService({
        getProject: makeProjectRow({ archivedAt: null }),
      });
      const result = svc.lifecyclePurge({ projectId: "proj-1" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_DELETE_REQUIRES_ARCHIVE");
    });

    it("项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.lifecyclePurge({ projectId: "nonexistent" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.lifecyclePurge({ projectId: "" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rootPath 在沙箱外时返回 PROJECT_PURGE_PERMISSION_DENIED", () => {
      const { svc } = makeService({
        getProject: makeProjectRow({
          archivedAt: 500,
          rootPath: "/some/other/path",
        }),
      });
      const result = svc.lifecyclePurge({ projectId: "proj-1" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_PURGE_PERMISSION_DENIED");
    });

    it("removeProjectRoot EACCES 时返回 PROJECT_PURGE_PERMISSION_DENIED", () => {
      const eaccesErr = Object.assign(new Error("permission denied"), { code: "EACCES" });
      const removeProjectRoot = vi.fn(() => { throw eaccesErr; });

      const db = createMockDb({
        getProject: makeProjectRow({
          archivedAt: 500,
          rootPath: "/userData/projects/proj-1",
        }),
      });

      const svc = createProjectService({
        db,
        userDataDir: "/userData",
        logger: createLogger(),
        now: () => 2000,
        removeProjectRoot,
      });

      const result = svc.lifecyclePurge({ projectId: "proj-1" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PROJECT_PURGE_PERMISSION_DENIED");
    });
  });

  describe("lifecycleGet", () => {
    it("active 项目返回 state=active", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: null }) });
      const result = svc.lifecycleGet({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("active");
    });

    it("archived 项目返回 state=archived", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: 999 }) });
      const result = svc.lifecycleGet({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.state).toBe("archived");
    });

    it("空 projectId 返回 INVALID_ARGUMENT", () => {
      const { svc } = makeService();
      const result = svc.lifecycleGet({ projectId: "  " });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 NOT_FOUND", () => {
      const { svc } = makeService({ getProject: undefined });
      const result = svc.lifecycleGet({ projectId: "nonexistent" });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  // ── archive (compat wrapper) ───────────────────────────────────

  describe("archive (compat)", () => {
    it("archived=true 归档项目", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: null }) });
      const result = svc.archive({ projectId: "proj-1", archived: true });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.archived).toBe(true);
    });

    it("archived=false 恢复项目", () => {
      const { svc } = makeService({ getProject: makeProjectRow({ archivedAt: 999 }) });
      const result = svc.archive({ projectId: "proj-1", archived: false });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.archived).toBe(false);
    });
  });

  // ── delete (compat wrapper) ────────────────────────────────────

  describe("delete (compat)", () => {
    it("archived 项目删除成功", () => {
      const { svc } = makeService({
        getProject: makeProjectRow({
          archivedAt: 500,
          rootPath: "/userData/projects/proj-1",
        }),
      });
      const result = svc.delete({ projectId: "proj-1" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.deleted).toBe(true);
    });
  });
});
