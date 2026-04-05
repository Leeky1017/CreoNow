/**
 * ProjectManager P3 测试 — 项目 CRUD 与多文档管理
 * Spec: openspec/specs/project-management/spec.md — P3: 项目 CRUD 与多文档管理
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 ProjectConfig CRUD、ProjectStyleConfig 管理、多文档组织、
 * 项目生命周期、删除级联、事件发射、错误码、dispose 清理。
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import type {
  ProjectManager,
  ProjectConfig,
  ProjectStyleConfig,
  ProjectGoals,
  ProjectDocument,
} from "../projectManager";
import { createProjectManager } from "../projectManager";

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

interface MockParticipant {
  name: string;
  bind?: Mock;
  unbind?: Mock;
  timeoutMs?: number;
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

function makeStyleConfig(overrides: Partial<ProjectStyleConfig> = {}): ProjectStyleConfig {
  return {
    narrativePerson: "third-limited",
    genre: "都市悬疑",
    languageStyle: "简洁克制，短句为主",
    tone: "冷峻",
    targetAudience: "18-30 岁网文读者",
    ...overrides,
  };
}

function makeGoals(overrides: Partial<ProjectGoals> = {}): ProjectGoals {
  return {
    targetWordCount: 100000,
    targetChapterCount: 30,
    ...overrides,
  };
}

function makeProjectConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    id: "proj-1",
    name: "暗流",
    type: "novel",
    description: "一部都市悬疑小说",
    stage: "draft",
    lifecycleStatus: "active",
    style: makeStyleConfig(),
    goals: makeGoals(),
    defaultSkillSetId: null,
    knowledgeGraphId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeProjectDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: "doc-1",
    projectId: "proj-1",
    title: "第一章",
    type: "chapter",
    order: 1,
    parentId: null,
    status: "draft",
    wordCount: 3000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeSeedProjects(): ProjectConfig[] {
  return [
    makeProjectConfig(),
    makeProjectConfig({
      id: "proj-2",
      name: "星际迷航",
      description: "一部科幻冒险小说",
    }),
    makeProjectConfig({
      id: "proj-active",
      name: "活跃项目",
      lifecycleStatus: "active",
    }),
    makeProjectConfig({
      id: "proj-archived",
      name: "旧项目",
      lifecycleStatus: "archived",
    }),
  ];
}

function makeSeedDocuments(): ProjectDocument[] {
  return [
    makeProjectDocument(),
    makeProjectDocument({
      id: "doc-2",
      title: "第二章",
      order: 2,
      wordCount: 1800,
    }),
    makeProjectDocument({
      id: "doc-note-1",
      type: "note",
      title: "角色笔记",
      order: 3,
      wordCount: 300,
    }),
  ];
}

function createManager(args: {
  db: MockDb;
  eventBus: MockEventBus;
  participants?: MockParticipant[];
  flushPendingAutosave?: Mock;
  persistActiveProjectId?: Mock;
  permissionProbe?: Mock;
}): ProjectManager {
  return createProjectManager({
    db: args.db as any,
    eventBus: args.eventBus as any,
    initialProjects: makeSeedProjects(),
    initialDocuments: makeSeedDocuments(),
    switchParticipants: args.participants as any,
    flushPendingAutosave: args.flushPendingAutosave as any,
    persistActiveProjectId: args.persistActiveProjectId as any,
    permissionProbe: args.permissionProbe as any,
  });
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ProjectManager P3", () => {
  let db: MockDb;
  let eventBus: MockEventBus;
  let manager: ProjectManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T00:00:00Z"));
    db = createMockDb();
    eventBus = createMockEventBus();
    manager = createManager({ db, eventBus });
  });

  afterEach(() => {
    manager.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── ProjectConfig CRUD ──────────────────────────────────────────

  describe("create project", () => {
    it("创建项目时持久化完整 ProjectConfig", async () => {
      const config = makeProjectConfig({ id: "proj-new-1", name: "新建项目一" });
      const result = await manager.createProject(config);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("proj-new-1");
    });

    it("创建项目时 ProjectStyleConfig 一并持久化", async () => {
      const config = makeProjectConfig({
        id: "proj-new-2",
        name: "新建项目二",
        style: makeStyleConfig({ genre: "校园推理", tone: "温暖" }),
      });
      const result = await manager.createProject(config);

      expect(result.success).toBe(true);
    });

    it("创建项目后发射 project-config-updated 事件", async () => {
      await manager.createProject(
        makeProjectConfig({ id: "proj-new-3", name: "事件项目" }),
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "project-config-updated",
          projectId: "proj-new-3",
          changedFields: expect.arrayContaining(["name", "style", "goals"]),
        }),
      );
    });

    it("创建项目时自动创建默认空白章节", async () => {
      const result = await manager.createProject(
        makeProjectConfig({ id: "proj-new", name: "新项目" }),
      );

      expect(result.success).toBe(true);
      const docs = await manager.listDocuments("proj-new");
      expect(docs.success).toBe(true);
      expect(docs.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            projectId: "proj-new",
            type: "chapter",
            title: "未命名章节",
            wordCount: 0,
          }),
        ]),
      );
    });
  });

  describe("read project", () => {
    it("读取已存在的项目配置", async () => {
      const result = await manager.getProject("proj-1");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("proj-1");
      expect(result.data?.name).toBe("暗流");
      expect(result.data?.type).toBe("novel");
      expect(result.data?.lifecycleStatus).toBe("active");
      expect(result.data?.knowledgeGraphId).toBeNull();
      expect(typeof result.data?.createdAt).toBe("number");
      expect(typeof result.data?.updatedAt).toBe("number");
    });

    it("读取不存在的项目返回 PROJECT_NOT_FOUND", async () => {
      const result = await manager.getProject("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  describe("update project", () => {
    it("更新项目名称后持久化并返回新配置", async () => {
      const result = await manager.updateProject("proj-1", { name: "暗流 II" });

      expect(result.success).toBe(true);
    });

    it("更新风格设定后即时生效", async () => {
      const result = await manager.updateProject("proj-1", {
        style: makeStyleConfig({ tone: "温暖幽默" }),
      });

      expect(result.success).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "project-config-updated",
          changedFields: expect.arrayContaining(["style"]),
        }),
      );
    });

    it("更新不存在的项目返回 PROJECT_NOT_FOUND", async () => {
      const result = await manager.updateProject("nonexistent", { name: "x" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });

    it("将 goals.targetWordCount 更新为 null 后持久化 null 值", async () => {
      const result = await manager.updateProject("proj-1", {
        goals: { targetWordCount: null, targetChapterCount: 30 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.goals.targetWordCount).toBeNull();
      expect(result.data?.goals.targetChapterCount).toBe(30);
    });

    it("将 goals.targetChapterCount 更新为 null 后持久化 null 值", async () => {
      const result = await manager.updateProject("proj-1", {
        goals: { targetWordCount: 100000, targetChapterCount: null },
      });

      expect(result.success).toBe(true);
      expect(result.data?.goals.targetWordCount).toBe(100000);
      expect(result.data?.goals.targetChapterCount).toBeNull();
    });
  });

  describe("delete project", () => {
    it("删除已归档的项目成功", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
    });

    it("删除未归档项目返回 PROJECT_DELETE_REQUIRES_ARCHIVE", async () => {
      const result = await manager.deleteProject("proj-active");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_DELETE_REQUIRES_ARCHIVE");
    });
  });

  // ── ProjectConfig validation ────────────────────────────────────

  describe("validation", () => {
    it("genre 为空时返回 PROJECT_GENRE_REQUIRED", async () => {
      const config = makeProjectConfig({
        style: makeStyleConfig({ genre: "" }),
      });
      const result = await manager.createProject(config);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_GENRE_REQUIRED");
    });

    it("name 为空时返回 PROJECT_CONFIG_INVALID", async () => {
      const config = makeProjectConfig({ name: "" });
      const result = await manager.createProject(config);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_CONFIG_INVALID");
    });

    it("项目名称冲突时返回 PROJECT_NAME_CONFLICT", async () => {
      await manager.createProject(
        makeProjectConfig({ id: "proj-duplicate-1", name: "同名项目" }),
      );
      const result = await manager.createProject(
        makeProjectConfig({ id: "proj-duplicate-2", name: "同名项目" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NAME_CONFLICT");
    });

    it("项目数量超限时返回 PROJECT_CAPACITY_EXCEEDED", async () => {
      db.prepare.mockImplementation((sql: string) => ({
        run: vi.fn(),
        get: vi.fn().mockReturnValue(
          /COUNT\(\*\)/i.test(sql) ? { count: 2000 } : undefined,
        ),
        all: vi.fn().mockReturnValue([]),
      }));
      const result = await manager.createProject(
        makeProjectConfig({ id: "proj-over-capacity", name: "超限项目" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_CAPACITY_EXCEEDED");
    });
  });

  // ── ProjectStyleConfig management ───────────────────────────────

  describe("style config", () => {
    it("获取项目风格设定", async () => {
      const result = await manager.getStyleConfig("proj-1");

      expect(result.success).toBe(true);
      expect(result.data?.narrativePerson).toBe("third-limited");
      expect(result.data?.genre).toBe("都市悬疑");
    });

    it("风格设定支持所有叙述人称类型", async () => {
      for (const person of ["first", "third-limited", "third-omniscient"] as const) {
        const config = makeProjectConfig({
          id: `proj-${person}`,
          name: `项目-${person}-${Date.now()}`,
          style: makeStyleConfig({ narrativePerson: person }),
        });
        const result = await manager.createProject(config);
        expect(result.success).toBe(true);
      }
    });
  });

  // ── Multi-document management ───────────────────────────────────

  describe("multi-document management", () => {
    it("向项目添加文档", async () => {
      const doc = makeProjectDocument();
      const result = await manager.addDocument(doc);

      expect(result.success).toBe(true);
    });

    it("列出项目内所有文档", async () => {
      const result = await manager.listDocuments("proj-1");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("按类型过滤文档列表", async () => {
      const result = await manager.listDocuments("proj-1", { type: "chapter" });

      expect(result.success).toBe(true);
    });

    it("移除项目内文档", async () => {
      const result = await manager.removeDocument("proj-1", "doc-1");

      expect(result.success).toBe(true);
    });

    it("重新排序文档", async () => {
      const result = await manager.reorderDocuments("proj-1", [
        { id: "doc-2", order: 1 },
        { id: "doc-1", order: 2 },
      ]);

      expect(result.success).toBe(true);
    });

    it("支持文档层级（parentId）", async () => {
      const subDoc = makeProjectDocument({
        id: "doc-sub",
        parentId: "doc-1",
        title: "第一章附录",
        type: "note",
      });
      const result = await manager.addDocument(subDoc);

      expect(result.success).toBe(true);
    });
  });

  // ── Project overview ────────────────────────────────────────────

  describe("project overview", () => {
    it("获取项目统计概览", async () => {
      const result = await manager.getOverview("proj-1");

      expect(result.success).toBe(true);
      expect(result.data?.projectId).toBe("proj-1");
      expect(typeof result.data?.totalWordCount).toBe("number");
      expect(typeof result.data?.documentCount).toBe("number");
      expect(typeof result.data?.chapterCount).toBe("number");
      expect(typeof result.data?.characterCount).toBe("number");
      expect(typeof result.data?.locationCount).toBe("number");
      expect(typeof result.data?.lastEditedAt).toBe("number");
    });
  });

  // ── Project lifecycle ───────────────────────────────────────────

  describe("lifecycle", () => {
    it("active → archived 成功", async () => {
      const result = await manager.archiveProject("proj-1");

      expect(result.success).toBe(true);
    });

    it("archived → deleted 成功", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
    });

    it("active → deleted 被拒绝（需先归档）", async () => {
      const result = await manager.deleteProject("proj-active");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_DELETE_REQUIRES_ARCHIVE");
    });

    it("archived → active 恢复成功", async () => {
      const result = await manager.restoreProject("proj-archived");

      expect(result.success).toBe(true);
    });
  });

  // ── Deletion cascade ───────────────────────────────────────────

  describe("deletion cascade", () => {
    it("删除项目时级联清除 Settings 数据", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
      const stmts = db.prepare.mock.calls.map((c: any) => c[0]);
      expect(stmts.some((s: string) => /settings/i.test(s) && /delete/i.test(s))).toBe(true);
    });

    it("删除项目时级联清除 Memory 数据", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
      const stmts = db.prepare.mock.calls.map((c: any) => c[0]);
      expect(stmts.some((s: string) => /memory/i.test(s) && /delete/i.test(s))).toBe(true);
    });

    it("删除项目时级联清除 FTS 索引", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
      const stmts = db.prepare.mock.calls.map((c: any) => c[0]);
      expect(stmts.some((s: string) => /fts|search|index/i.test(s) && /delete|drop/i.test(s))).toBe(true);
    });

    it("删除项目时级联清除版本历史", async () => {
      const result = await manager.deleteProject("proj-archived");

      expect(result.success).toBe(true);
      const stmts = db.prepare.mock.calls.map((c: any) => c[0]);
      expect(stmts.some((s: string) => /version/i.test(s) && /delete/i.test(s))).toBe(true);
    });
  });

  // ── Events ──────────────────────────────────────────────────────

  describe("events", () => {
    it("项目配置更新时发射 project-config-updated 事件", async () => {
      await manager.updateProject("proj-1", { name: "暗流 III" });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "project-config-updated",
          projectId: "proj-1",
          changedFields: expect.arrayContaining(["name"]),
        }),
      );
    });

    it("事件包含准确的 timestamp", async () => {
      const fixedTime = Date.now();
      await manager.updateProject("proj-1", { stage: "revision" });

      const event = eventBus.emit.mock.calls[0]?.[0];
      expect(event?.timestamp).toBe(fixedTime);
    });
  });

  // ── Error codes (spec L549-552) ─────────────────────────────────

  describe("additional error codes", () => {
    it("生命周期写入失败时返回 PROJECT_LIFECYCLE_WRITE_FAILED", async () => {
      db.prepare.mockImplementationOnce(() => {
        throw new Error("disk write failure");
      });

      const result = await manager.archiveProject("proj-1");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_LIFECYCLE_WRITE_FAILED");
    });

    it("清除权限不足时返回 PROJECT_PURGE_PERMISSION_DENIED", async () => {
      const restrictedManager = createManager({
        db,
        eventBus,
        permissionProbe: vi.fn().mockRejectedValue(
          Object.assign(new Error("permission denied"), { code: "EACCES" }),
        ),
      });
      const result = await restrictedManager.purgeProject("proj-archived", {
        outputPath: "/restricted/path",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_PURGE_PERMISSION_DENIED");
      restrictedManager.dispose();
    });

    it("项目切换超时时返回 PROJECT_SWITCH_TIMEOUT", async () => {
      const timeoutManager = createManager({
        db,
        eventBus,
        participants: [
          {
            name: "settings",
            unbind: vi.fn().mockRejectedValue(new Error("switch timeout")),
          },
        ],
      });
      const result = await timeoutManager.switchProject("proj-2");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_SWITCH_TIMEOUT");
      timeoutManager.dispose();
    });
  });

  // ── Project switch (spec L657-663) ─────────────────────────────

  describe("project switch", () => {
    it("切换项目时执行 unbind → persist → bind 顺序", async () => {
      const steps: string[] = [];
      const boundManager = createManager({
        db,
        eventBus,
        flushPendingAutosave: vi.fn().mockImplementation(async (projectId: string) => {
          steps.push(`flush:${projectId}`);
        }),
        persistActiveProjectId: vi.fn().mockImplementation(async (projectId: string) => {
          steps.push(`persist:${projectId}`);
        }),
        participants: [
          {
            name: "settings",
            unbind: vi.fn().mockImplementation(async (projectId: string) => {
              steps.push(`unbind:${projectId}`);
            }),
            bind: vi.fn().mockImplementation(async (projectId: string) => {
              steps.push(`bind:${projectId}`);
            }),
          },
        ],
      });
      const result = await boundManager.switchProject("proj-2");

      expect(result.success).toBe(true);
      expect(steps).toEqual([
        "flush:proj-1",
        "unbind:proj-1",
        "persist:proj-2",
        "bind:proj-2",
      ]);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "project-switched",
          fromProjectId: "proj-1",
          toProjectId: "proj-2",
        }),
      );
      boundManager.dispose();
    });

    it("并发 switchProject 串行执行且同目标幂等", async () => {
      const steps: string[] = [];
      const serialManager = createManager({
        db,
        eventBus,
        participants: [
          {
            name: "memory",
            unbind: vi.fn().mockImplementation(async (projectId: string) => {
              steps.push(`unbind:${projectId}`);
            }),
            bind: vi.fn().mockImplementation(async (projectId: string) => {
              steps.push(`bind:${projectId}`);
            }),
          },
        ],
      });

      const first = serialManager.switchProject("proj-2");
      const second = serialManager.switchProject("proj-2");
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      expect(steps).toEqual(["unbind:proj-1", "bind:proj-2"]);
      serialManager.dispose();
    });
  });

  describe("project existence gates", () => {
    it("不存在的项目 documents:list 返回 PROJECT_NOT_FOUND", async () => {
      const result = await manager.listDocuments("missing-project");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });

    it("不存在的项目 overview:get 返回 PROJECT_NOT_FOUND", async () => {
      const result = await manager.getOverview("missing-project");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用方法抛出错误", async () => {
      manager.dispose();

      await expect(manager.getProject("proj-1")).rejects.toThrow();
    });

    it("dispose 可重复调用不报错", () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
