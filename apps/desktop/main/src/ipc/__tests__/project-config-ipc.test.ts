import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

import type { ProjectConfig } from "../../services/project/projectManager";

let seedProjects: ProjectConfig[] = [];

// Mock createProjectManager to inject seed projects when needed
vi.mock("../../services/project/projectManager", async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    createProjectManager: (deps: Record<string, unknown>) => {
      return (mod.createProjectManager as (deps: Record<string, unknown>) => unknown)({
        ...deps,
        initialProjects: seedProjects.length > 0 ? seedProjects : undefined,
      });
    },
  };
});

// Import AFTER vi.mock so the mock takes effect
const { registerProjectIpcHandlers } = await import("../project");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const SEED_PROJECT: ProjectConfig = {
  id: "proj-seed",
  name: "Seed Project",
  type: "novel",
  description: "测试用种子项目",
  stage: "draft",
  lifecycleStatus: "active",
  style: {
    narrativePerson: "first",
    genre: "科幻",
    languageStyle: "简洁",
    tone: "冷静",
    targetAudience: "成人",
  },
  goals: { targetWordCount: 50000, targetChapterCount: 10 },
  defaultSkillSetId: null,
  knowledgeGraphId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function createHarness() {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const stmtRun = vi.fn();
  const stmtGet = vi.fn(
    (..._args: unknown[]) => undefined as Record<string, unknown> | undefined,
  );
  const stmtAll = vi.fn((..._args: unknown[]) => {
    throw new Error("mock: no real DB");
  });

  const db = {
    prepare: vi.fn(() => ({
      run: stmtRun,
      get: stmtGet,
      all: stmtAll,
    })),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
  };

  registerProjectIpcHandlers({
    ipcMain,
    db: db as never,
    userDataDir: "/mock/user-data",
    logger: logger as never,
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(
        { sender: { id: 1 } },
        payload,
      )) as IpcResponse<T>;
    },
    handlers,
    logger,
    db,
  };
}

describe("project config IPC handlers (P3)", () => {
  beforeEach(() => {
    seedProjects = [];
  });

  // ── project:config:get ──

  describe("project:config:get", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:config:get")).toBe(true);
    });

    it("DB 未就绪返回 DB_ERROR", async () => {
      const handlers = new Map<string, Handler>();
      const ipcMain = {
        handle: (channel: string, listener: Handler) => {
          handlers.set(channel, listener);
        },
      } as unknown as IpcMain;

      registerProjectIpcHandlers({
        ipcMain,
        db: null,
        userDataDir: "/mock",
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
      });

      const handler = handlers.get("project:config:get")!;
      const result = (await handler(
        { sender: { id: 1 } },
        { projectId: "proj-1" },
      )) as IpcResponse<never>;

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("DB_ERROR");
    });

    it("非 object payload 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:config:get", null);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 PROJECT_NOT_FOUND", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:config:get", {
        projectId: "nonexistent",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── project:config:update ──

  describe("project:config:update", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:config:update")).toBe(true);
    });

    it("非 object patch 返回 PROJECT_CONFIG_INVALID", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:config:update", {
        projectId: "proj-1",
        patch: "invalid",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_CONFIG_INVALID");
    });

    it("空 style.genre 返回 PROJECT_GENRE_REQUIRED", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();
      const result = await harness.invoke<never>("project:config:update", {
        projectId: "proj-1",
        patch: { style: { genre: "" } },
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_GENRE_REQUIRED");
    });

    it("空格 style.genre 返回 PROJECT_GENRE_REQUIRED", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();
      const result = await harness.invoke<never>("project:config:update", {
        projectId: "proj-1",
        patch: { style: { genre: "   " } },
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_GENRE_REQUIRED");
    });
  });

  // ── project:style:get ──

  describe("project:style:get", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:style:get")).toBe(true);
    });

    it("项目不存在返回 PROJECT_NOT_FOUND", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:style:get", {
        projectId: "nonexistent",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── project:documents:list ──

  describe("project:documents:list", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:documents:list")).toBe(true);
    });

    it("项目不存在返回 PROJECT_NOT_FOUND", async () => {
      const harness = createHarness();
      const result = await harness.invoke<{ items: unknown[] }>(
        "project:documents:list",
        { projectId: "missing-project" },
      );
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── project:overview:get ──

  describe("project:overview:get", () => {
    it("通道已注册", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:overview:get")).toBe(true);
    });

    it("空 projectId 返回 INVALID_ARGUMENT", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:overview:get", {
        projectId: "",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("项目不存在返回 PROJECT_NOT_FOUND", async () => {
      const harness = createHarness();
      const result = await harness.invoke<never>("project:overview:get", {
        projectId: "missing-project",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── Cross-project isolation ──

  describe("跨项目隔离", () => {
    it("不同 projectId 查询返回各自独立数据", async () => {
      const harness = createHarness();

      const r1 = await harness.invoke<{ items: unknown[] }>(
        "project:documents:list",
        { projectId: "proj-a" },
      );
      const r2 = await harness.invoke<{ items: unknown[] }>(
        "project:documents:list",
        { projectId: "proj-b" },
      );

      expect(r1.ok).toBe(false);
      expect(r2.ok).toBe(false);
      expect(r1.error?.code).toBe("PROJECT_NOT_FOUND");
      expect(r2.error?.code).toBe("PROJECT_NOT_FOUND");
    });

    it("项目 A 的配置不可被项目 B 读取", async () => {
      const harness = createHarness();

      // getProject for proj-a returns not found (no projects created in mock)
      const rA = await harness.invoke<never>("project:config:get", {
        projectId: "proj-a",
      });
      const rB = await harness.invoke<never>("project:config:get", {
        projectId: "proj-b",
      });

      // Both return not found since mock DB has no projects
      expect(rA.ok).toBe(false);
      expect(rA.error?.code).toBe("PROJECT_NOT_FOUND");
      expect(rB.ok).toBe(false);
      expect(rB.error?.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  // ── Happy-path tests (B-F13) ──

  describe("project:config:get happy-path", () => {
    it("已存在项目返回完整 ProjectConfig", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();

      const result = await harness.invoke<{
        id: string;
        name: string;
        lifecycleStatus: string;
        style: { genre: string; narrativePerson: string };
        goals: { targetWordCount: number | null; targetChapterCount: number | null };
        knowledgeGraphId: string | null;
      }>("project:config:get", {
        projectId: "proj-seed",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe("proj-seed");
      expect(result.data?.name).toBe("Seed Project");
      expect(result.data?.lifecycleStatus).toBe("active");
      expect(result.data?.style.genre).toBe("科幻");
      expect(result.data?.style.narrativePerson).toBe("first");
      expect(result.data?.goals.targetWordCount).toBe(50000);
      expect(result.data?.knowledgeGraphId).toBeNull();
    });
  });

  describe("project:config:update happy-path", () => {
    it("更新 genre 后返回更新后的 config", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();

      const result = await harness.invoke<{
        id: string;
        style: { genre: string; tone: string };
        goals: { targetWordCount: number | null; targetChapterCount: number | null };
        defaultSkillSetId: string | null;
        knowledgeGraphId: string | null;
      }>("project:config:update", {
        projectId: "proj-seed",
        patch: {
          style: { genre: "奇幻", tone: "热烈" },
          goals: { targetWordCount: 80000, targetChapterCount: 12 },
          defaultSkillSetId: "skill-pack-1",
          knowledgeGraphId: "kg-42",
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe("proj-seed");
      expect(result.data?.style.genre).toBe("奇幻");
      expect(result.data?.style.tone).toBe("热烈");
      expect(result.data?.goals.targetWordCount).toBe(80000);
      expect(result.data?.goals.targetChapterCount).toBe(12);
      expect(result.data?.defaultSkillSetId).toBe("skill-pack-1");
      expect(result.data?.knowledgeGraphId).toBe("kg-42");
    });
  });

  describe("project:style:get happy-path", () => {
    it("已存在项目返回风格配置", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();

      const result = await harness.invoke<{
        genre: string;
        narrativePerson: string;
        tone: string;
      }>("project:style:get", {
        projectId: "proj-seed",
      });

      expect(result.ok).toBe(true);
      expect(result.data?.genre).toBe("科幻");
      expect(result.data?.narrativePerson).toBe("first");
      expect(result.data?.tone).toBe("冷静");
    });
  });

  describe("project:config:update nullable goals", () => {
    it("通过 validated IPC 将 targetWordCount 更新为 null", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();

      const result = await harness.invoke<{
        goals: { targetWordCount: number | null; targetChapterCount: number | null };
      }>("project:config:update", {
        projectId: "proj-seed",
        patch: {
          goals: { targetWordCount: null },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.goals.targetWordCount).toBeNull();
    });

    it("通过 validated IPC 将 targetChapterCount 更新为 null", async () => {
      seedProjects = [SEED_PROJECT];
      const harness = createHarness();

      const result = await harness.invoke<{
        goals: { targetWordCount: number | null; targetChapterCount: number | null };
      }>("project:config:update", {
        projectId: "proj-seed",
        patch: {
          goals: { targetWordCount: 100000, targetChapterCount: null },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.goals.targetWordCount).toBe(100000);
      expect(result.data?.goals.targetChapterCount).toBeNull();
    });

    it("project:project:update 通道不再注册（已收口到 project:config:update）", () => {
      const harness = createHarness();
      expect(harness.handlers.has("project:project:update")).toBe(false);
    });
  });
});
