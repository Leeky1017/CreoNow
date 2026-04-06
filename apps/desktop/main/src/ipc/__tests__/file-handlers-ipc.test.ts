/**
 * Tests for file.ts IPC handlers: document CRUD, save with size check,
 * and operation handlers (getcurrent, setcurrent, reorder, updatestatus, delete).
 *
 * Validates channel registration, payload validation, DB guards,
 * size boundary enforcement, and service delegation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

const mocks = vi.hoisted(() => {
  return {
    createDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { documentId: "doc-new" },
    }),
    listDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { items: [{ documentId: "doc-1", title: "Chapter 1" }] },
    }),
    readDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: {
        documentId: "doc-1",
        projectId: "proj-1",
        type: "chapter",
        title: "Chapter 1",
        status: "draft",
        sortOrder: 0,
        contentJson: '{"type":"doc","content":[]}',
        contentText: "Hello world",
        contentMd: "Hello world",
        contentHash: "abc123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
    updateDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { updated: true },
    }),
    saveDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { updatedAt: Date.now(), contentHash: "def456" },
    }),
    getCurrentDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { documentId: "doc-1" },
    }),
    setCurrentDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { documentId: "doc-2" },
    }),
    reorderDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { updated: true },
    }),
    updateStatusDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { updated: true, status: "completed" },
    }),
    deleteDocMock: vi.fn().mockReturnValue({
      ok: true,
      data: { deleted: true },
    }),
    statsIncrementMock: vi.fn().mockReturnValue({ ok: true, data: {} }),
  };
});

vi.mock("../../services/documents/documentService", () => ({
  createDocumentService: vi.fn(() => ({
    create: mocks.createDocMock,
    list: mocks.listDocMock,
    read: mocks.readDocMock,
    update: mocks.updateDocMock,
    save: mocks.saveDocMock,
    getCurrent: mocks.getCurrentDocMock,
    setCurrent: mocks.setCurrentDocMock,
    reorder: mocks.reorderDocMock,
    updateStatus: mocks.updateStatusDocMock,
    delete: mocks.deleteDocMock,
  })),
}));
vi.mock("../../services/documents/documentCoreService", () => ({
  MAX_DOCUMENT_SIZE_BYTES: 5_242_880,
}));
vi.mock("../../services/documents/derive", () => ({
  deriveContent: vi.fn().mockReturnValue({
    ok: true,
    data: { contentText: "Hello world", contentMd: "Hello world" },
  }),
}));
vi.mock("../../services/stats/statsService", () => ({
  createStatsService: vi.fn(() => ({
    increment: mocks.statsIncrementMock,
  })),
}));
vi.mock("../../services/embedding/embeddingQueue", () => ({
  createEmbeddingQueue: vi.fn(() => ({
    enqueue: vi.fn(),
    dispose: vi.fn(),
  })),
}));

const { registerFileIpcHandlers } = await import("../file");

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

  const db = dbNull
    ? null
    : ({
        prepare: vi.fn(() => ({
          run: vi.fn(() => ({ changes: 0 })),
          get: vi.fn(() => ({ contentText: "previous text" })),
          all: vi.fn(() => []),
        })),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      } as never);

  registerFileIpcHandlers({
    ipcMain,
    db,
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
  };
}

// ── Channel Registration ──

describe("file IPC channel registration", () => {
  it("注册所有预期通道", () => {
    const harness = createHarness();
    const expectedChannels = [
      "file:document:create",
      "file:document:list",
      "file:document:read",
      "file:document:update",
      "file:document:save",
      "file:document:getcurrent",
      "file:document:setcurrent",
      "file:document:reorder",
      "file:document:updatestatus",
      "file:document:delete",
    ];
    for (const ch of expectedChannels) {
      expect(harness.handlers.has(ch), `missing channel: ${ch}`).toBe(true);
    }
  });
});

// ── DB Not Ready Guards ──

describe("file IPC DB-not-ready guards", () => {
  const channels = [
    "file:document:create",
    "file:document:list",
    "file:document:read",
    "file:document:update",
    "file:document:getcurrent",
    "file:document:setcurrent",
    "file:document:reorder",
    "file:document:updatestatus",
    "file:document:delete",
  ];

  for (const channel of channels) {
    it(`${channel} → DB_ERROR when DB null`, async () => {
      const harness = createHarness(true);
      const res = await harness.invoke(channel, {
        projectId: "proj-1",
        documentId: "doc-1",
        contentJson: "{}",
        actor: "user",
        reason: "manual-save",
        orderedDocumentIds: [],
        status: "draft",
        title: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  }
});

// ── Document CRUD ──

describe("file:document:create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常创建文档", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ documentId: string }>(
      "file:document:create",
      { projectId: "proj-1", title: "New Chapter" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.documentId).toBe("doc-new");
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:create", {
      projectId: "   ",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("返回文档列表", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ items: unknown[] }>(
      "file:document:list",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.items).toHaveLength(1);
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:list", {
      projectId: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("读取文档内容", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ documentId: string }>(
      "file:document:read",
      { projectId: "proj-1", documentId: "doc-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.documentId).toBe("doc-1");
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:read", {
      projectId: "",
      documentId: "doc-1",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("空 documentId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:read", {
      projectId: "proj-1",
      documentId: "  ",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新文档元数据", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ updated: boolean }>(
      "file:document:update",
      { projectId: "proj-1", documentId: "doc-1", title: "Renamed Chapter" },
    );
    expect(res.ok).toBe(true);
  });

  it("空 documentId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:update", {
      projectId: "proj-1",
      documentId: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

// ── Document Save with Size Check ──

describe("file:document:save", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常保存文档", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ updatedAt: number }>(
      "file:document:save",
      {
        projectId: "proj-1",
        documentId: "doc-1",
        contentJson: JSON.stringify({ type: "doc", content: [] }),
        actor: "user",
        reason: "manual-save",
      },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.updatedAt).toBeDefined();
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:save", {
      projectId: "",
      documentId: "doc-1",
      contentJson: "{}",
      actor: "user",
      reason: "manual-save",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("超过 5MB 大小限制 → DOCUMENT_SIZE_EXCEEDED", async () => {
    const harness = createHarness();
    const bigContent = "x".repeat(5_242_881);
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: bigContent,
      actor: "user",
      reason: "manual-save",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("DOCUMENT_SIZE_EXCEEDED");
  });

  it("恰好 5MB → 允许保存", async () => {
    const harness = createHarness();
    const exactContent = "x".repeat(5_242_880);
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: exactContent,
      actor: "user",
      reason: "manual-save",
    });
    // 不检查 ok，因为内容不是合法 JSON
    // 但不应该是 DOCUMENT_SIZE_EXCEEDED
    if (!res.ok) {
      expect(res.error?.code).not.toBe("DOCUMENT_SIZE_EXCEEDED");
    }
  });

  it("大小检查在 DB 检查之前执行", async () => {
    const harness = createHarness(true);
    const bigContent = "x".repeat(5_242_881);
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: bigContent,
      actor: "user",
      reason: "manual-save",
    });
    expect(res.ok).toBe(false);
    // Should be DOCUMENT_SIZE_EXCEEDED, not DB_ERROR
    expect(res.error?.code).toBe("DOCUMENT_SIZE_EXCEEDED");
  });

  it("actor/reason 不匹配 → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: JSON.stringify({ type: "doc", content: [] }),
      actor: "user",
      reason: "autosave",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
    expect(res.error?.message).toContain("actor/reason");
  });

  it("非法 JSON → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: "{not valid json",
      actor: "user",
      reason: "manual-save",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("auto/autosave 组合有效", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: JSON.stringify({ type: "doc", content: [] }),
      actor: "auto",
      reason: "autosave",
    });
    expect(res.ok).toBe(true);
  });

  it("ai/ai-accept 组合有效", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:save", {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: JSON.stringify({ type: "doc", content: [] }),
      actor: "ai",
      reason: "ai-accept",
    });
    expect(res.ok).toBe(true);
  });
});

// ── Document Operation Handlers ──

describe("file:document:getcurrent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("返回当前文档", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ documentId: string }>(
      "file:document:getcurrent",
      { projectId: "proj-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.documentId).toBe("doc-1");
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:getcurrent", {
      projectId: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:setcurrent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("设置当前文档", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ documentId: string }>(
      "file:document:setcurrent",
      { projectId: "proj-1", documentId: "doc-2" },
    );
    expect(res.ok).toBe(true);
  });

  it("空 documentId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:setcurrent", {
      projectId: "proj-1",
      documentId: "  ",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:reorder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("重排文档顺序", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ updated: boolean }>(
      "file:document:reorder",
      { projectId: "proj-1", orderedDocumentIds: ["doc-2", "doc-1"] },
    );
    expect(res.ok).toBe(true);
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:reorder", {
      projectId: "",
      orderedDocumentIds: [],
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:updatestatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新文档状态", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ updated: boolean; status: string }>(
      "file:document:updatestatus",
      { projectId: "proj-1", documentId: "doc-1", status: "completed" },
    );
    expect(res.ok).toBe(true);
  });

  it("空 documentId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:updatestatus", {
      projectId: "proj-1",
      documentId: "",
      status: "draft",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });
});

describe("file:document:delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("删除文档", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ deleted: boolean }>(
      "file:document:delete",
      { projectId: "proj-1", documentId: "doc-1" },
    );
    expect(res.ok).toBe(true);
    expect(res.data?.deleted).toBe(true);
  });

  it("空 projectId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("file:document:delete", {
      projectId: "  ",
      documentId: "doc-1",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("service 错误 → 传递错误", async () => {
    mocks.deleteDocMock.mockReturnValueOnce({
      ok: false,
      error: { code: "DOCUMENT_NOT_FOUND", message: "Not found" },
    });
    const harness = createHarness();
    const res = await harness.invoke("file:document:delete", {
      projectId: "proj-1",
      documentId: "doc-gone",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("DOCUMENT_NOT_FOUND");
  });
});
