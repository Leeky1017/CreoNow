/**
 * Tests for project.ts IPC handlers: CRUD, lifecycle, and session binding.
 *
 * Validates channel registration, DB-not-ready guards, and service delegation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

const mocks = vi.hoisted(() => {
  return {
    createMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-new", rootPath: "/mock/projects/proj-new" },
    }),
    listMock: vi.fn().mockReturnValue({
      ok: true,
      data: { items: [{ projectId: "proj-1", name: "Test" }] },
    }),
    statsMock: vi.fn().mockReturnValue({
      ok: true,
      data: { total: 2, active: 1, archived: 1 },
    }),
    renameMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", name: "Renamed", updatedAt: Date.now() },
    }),
    duplicateMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-dup", rootPath: "/mock/projects/dup", name: "Copy" },
    }),
    getCurrentMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", rootPath: "/mock/projects/proj-1" },
    }),
    setCurrentMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-2", rootPath: "/mock/projects/proj-2" },
    }),
    deleteMock: vi.fn().mockReturnValue({ ok: true, data: { deleted: true } }),
    lifecycleArchiveMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", state: "archived", archivedAt: Date.now() },
    }),
    lifecycleRestoreMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", state: "active" },
    }),
    lifecyclePurgeMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", state: "deleted" },
    }),
    lifecycleGetMock: vi.fn().mockReturnValue({
      ok: true,
      data: { projectId: "proj-1", state: "active" },
    }),
    createAiAssistDraftMock: vi.fn().mockReturnValue({
      ok: true,
      data: {
        name: "AI Draft",
        type: "novel",
        description: "A novel",
        chapterOutlines: [],
        characters: [],
      },
    }),
    switchProjectMock: vi.fn().mockReturnValue({
      ok: true,
      data: { currentProjectId: "proj-2", switchedAt: new Date().toISOString() },
    }),
  };
});

vi.mock("../../services/projects/projectService", () => ({
  createProjectService: vi.fn(() => ({
    create: mocks.createMock,
    list: mocks.listMock,
    stats: mocks.statsMock,
    rename: mocks.renameMock,
    duplicate: mocks.duplicateMock,
    getCurrent: mocks.getCurrentMock,
    setCurrent: mocks.setCurrentMock,
    delete: mocks.deleteMock,
    switchProject: mocks.switchProjectMock,
    lifecycleArchive: mocks.lifecycleArchiveMock,
    lifecycleRestore: mocks.lifecycleRestoreMock,
    lifecyclePurge: mocks.lifecyclePurgeMock,
    lifecycleGet: mocks.lifecycleGetMock,
    createAiAssistDraft: mocks.createAiAssistDraftMock,
  })),
}));
vi.mock("../../services/project/projectManager", async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    createProjectManager: vi.fn(() => ({
      getProject: vi.fn().mockReturnValue(null),
      listDocuments: vi.fn().mockReturnValue({ ok: true, data: { items: [] } }),
      getProjectOverview: vi.fn().mockReturnValue({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } }),
      updateProjectConfig: vi.fn().mockReturnValue({ ok: true, data: {} }),
    })),
  };
});

const { registerProjectIpcHandlers } = await import("../project");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness(dbNull = false) {
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

  const bindMock = vi.fn();
  const projectSessionBinding = {
    bind: bindMock,
    resolveProjectId: vi.fn().mockReturnValue("proj-1"),
  };

  const db = dbNull
    ? null
    : ({
        prepare: vi.fn(() => ({
          run: vi.fn(() => ({ changes: 0 })),
          get: vi.fn(),
          all: vi.fn(() => []),
        })),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      } as never);

  registerProjectIpcHandlers({
    ipcMain,
    db,
    userDataDir: "/mock/user-data",
    logger: logger as never,
    projectSessionBinding: projectSessionBinding as never,
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
    bindMock,
  };
}

// ── Channel Registration ──

describe("project IPC channel registration", () => {
  it("注册所有预期通道", () => {
    const harness = createHarness();
    const expectedChannels = [
      "project:project:create",
      "project:project:createaiassist",
      "project:project:list",
      "project:project:stats",
      "project:project:rename",
      "project:project:duplicate",
      "project:project:getcurrent",
      "project:project:setcurrent",
      "project:project:switch",
      "project:project:delete",
      "project:lifecycle:archive",
      "project:lifecycle:restore",
      "project:lifecycle:purge",
      "project:lifecycle:get",
    ];
    for (const ch of expectedChannels) {
      expect(harness.handlers.has(ch), `missing channel: ${ch}`).toBe(true);
    }
  });
});

// ── DB Not Ready Guards ──

describe("project IPC DB-not-ready guards", () => {
  const channels = [
    "project:project:create",
    "project:project:list",
    "project:project:stats",
    "project:project:rename",
    "project:project:duplicate",
    "project:project:getcurrent",
    "project:project:setcurrent",
    "project:project:delete",
    "project:lifecycle:archive",
    "project:lifecycle:restore",
    "project:lifecycle:purge",
    "project:lifecycle:get",
  ];

  for (const channel of channels) {
    it(`${channel} → DB_ERROR when DB null`, async () => {
      const harness = createHarness(true);
      const res = await harness.invoke(channel, { projectId: "proj-1", name: "Test" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  }
});

// ── CRUD Handlers ──

describe("project:project:create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常创建项目", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ projectId: string }>(
      "project:project:create",
      { name: "My Novel", type: "novel" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.projectId).toBe("proj-new");
  });

  it("service 返回错误 → 传递错误", async () => {
    mocks.createMock.mockReturnValueOnce({
      ok: false,
      error: { code: "INVALID_ARGUMENT", message: "Name required" },
    });
    const harness = createHarness();
    const res = await harness.invoke("project:project:create", {});
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("project:project:list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("返回项目列表", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ items: unknown[] }>(
      "project:project:list",
      {},
    );
    expect(res.ok).toBe(true);
    expect(res.data?.items).toHaveLength(1);
  });
});

describe("project:project:stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("返回统计信息", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ total: number }>(
      "project:project:stats",
    );
    expect(res.ok).toBe(true);
    expect(res.data?.total).toBe(2);
  });
});

describe("project:project:rename", () => {
  beforeEach(() => vi.clearAllMocks());

  it("重命名成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ name: string }>(
      "project:project:rename",
      { projectId: "proj-1", name: "New Name" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.name).toBe("Renamed");
  });
});

describe("project:project:duplicate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("复制项目成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ projectId: string }>(
      "project:project:duplicate",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.projectId).toBe("proj-dup");
  });
});

// ── Session Binding ──

describe("project:project:getcurrent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("返回当前项目并绑定 session", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ projectId: string }>(
      "project:project:getcurrent",
    );
    expect(res.ok).toBe(true);
    expect(res.data?.projectId).toBe("proj-1");
    expect(harness.bindMock).toHaveBeenCalledWith({
      webContentsId: 1,
      projectId: "proj-1",
    });
  });
});

describe("project:project:setcurrent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("设置当前项目并绑定 session", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ projectId: string }>(
      "project:project:setcurrent",
      { projectId: "proj-2" },
    );
    expect(res.ok).toBe(true);
    expect(harness.bindMock).toHaveBeenCalledWith({
      webContentsId: 1,
      projectId: "proj-2",
    });
  });
});

// ── Lifecycle Handlers ──

describe("project:lifecycle:archive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("归档项目成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ state: string }>(
      "project:lifecycle:archive",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.state).toBe("archived");
  });
});

describe("project:lifecycle:restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("恢复项目成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ state: string }>(
      "project:lifecycle:restore",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.state).toBe("active");
  });
});

describe("project:lifecycle:purge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("清除项目成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ state: string }>(
      "project:lifecycle:purge",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.state).toBe("deleted");
  });
});

describe("project:lifecycle:get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("获取生命周期状态成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ state: string }>(
      "project:lifecycle:get",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.state).toBe("active");
  });
});

describe("project:project:delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("删除项目成功", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ deleted: boolean }>(
      "project:project:delete",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.deleted).toBe(true);
  });

  it("service 错误 → 传递错误", async () => {
    mocks.deleteMock.mockReturnValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "Project not found" },
    });
    const harness = createHarness();
    const res = await harness.invoke("project:project:delete", {
      projectId: "nope",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("NOT_FOUND");
  });
});

describe("project:project:createaiassist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AI 辅助创建草稿", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ name: string }>(
      "project:project:createaiassist",
      { prompt: "A sci-fi novel about AI" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.name).toBe("AI Draft");
  });
});
