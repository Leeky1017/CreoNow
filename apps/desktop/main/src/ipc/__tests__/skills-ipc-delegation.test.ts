import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";
import { registerSkillIpcHandlers } from "../skills";

const mockSkillService = {
  list: vi.fn().mockReturnValue({
    ok: true,
    data: { items: [{ id: "sk-1", name: "Tone", scope: "builtin" }] },
  }),
  read: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "sk-1", content: "skill content" },
  }),
  write: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "sk-1", scope: "global", written: true },
  }),
  toggle: vi.fn().mockReturnValue({
    ok: true,
    data: { id: "sk-1", enabled: true },
  }),
  createCustom: vi.fn().mockReturnValue({
    ok: true,
    data: {
      skill: {
        id: "custom-1",
        name: "My Skill",
        description: "desc",
        promptTemplate: "template",
        inputType: "text",
        contextRules: {},
        scope: "global",
        enabled: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    },
  }),
  updateCustom: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "custom-1", scope: "global" },
  }),
  listCustom: vi.fn().mockReturnValue({
    ok: true,
    data: { items: [] },
  }),
  deleteCustom: vi.fn().mockReturnValue({
    ok: true,
    data: { id: "custom-1", deleted: true },
  }),
};

vi.mock("../../services/skills/skillService", () => ({
  createSkillService: vi.fn(() => mockSkillService),
}));

vi.mock("../dbError", () => ({
  createDbNotReadyError: vi
    .fn()
    .mockReturnValue({ code: "DB_ERROR", message: "Database not ready" }),
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const EXPECTED_CHANNELS = [
  "skill:registry:list",
  "skill:registry:read",
  "skill:registry:write",
  "skill:registry:toggle",
  "skill:custom:create",
  "skill:custom:update",
  "skill:custom:list",
  "skill:custom:delete",
] as const;

function createMockEvent() {
  return { sender: { id: 1, send: vi.fn() } };
}

function createHarness(opts?: { db?: unknown }) {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: vi.fn((channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    }),
  } as unknown as IpcMain;

  const logger = {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn().mockReturnValue({
            get: vi.fn(),
            all: vi.fn(),
            run: vi.fn(),
          }),
        });

  registerSkillIpcHandlers({
    ipcMain,
    db: db as never,
    userDataDir: "/test-user",
    builtinSkillsDir: "/test-builtin",
    logger: logger as never,
  });

  return {
    invoke: async (
      channel: string,
      payload?: unknown,
    ): Promise<{
      ok: boolean;
      data?: unknown;
      error?: { code: string; message: string };
    }> => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(createMockEvent(), payload)) as {
        ok: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      };
    },
    handlers,
    logger,
  };
}

describe("skills IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Channel registration ──

  it("registers all expected channels", () => {
    const { handlers } = createHarness();
    for (const ch of EXPECTED_CHANNELS) {
      expect(handlers.has(ch), `missing handler for ${ch}`).toBe(true);
    }
  });

  it("channel count matches expected", () => {
    const { handlers } = createHarness();
    expect(handlers.size).toBe(EXPECTED_CHANNELS.length);
  });

  // ── DB_ERROR when db is null ──

  describe("returns DB_ERROR when db is null", () => {
    it.each([...EXPECTED_CHANNELS])("%s → DB_ERROR", async (channel) => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke(channel, {
        id: "sk-1",
        name: "test",
        description: "d",
        promptTemplate: "t",
        inputType: "text",
        contextRules: {},
        scope: "global",
        content: "c",
        enabled: true,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  });

  // ── Registry handlers ──

  describe("skill:registry:list", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:list", undefined);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-boolean includeDisabled", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:list", {
        includeDisabled: "yes",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns skills list on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:list", {});
      expect(res.ok).toBe(true);
      const data = res.data as { items: unknown[] };
      expect(data.items).toHaveLength(1);
    });

    it("propagates service error", async () => {
      mockSkillService.list.mockReturnValueOnce({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "list failed" },
      });
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:list", {});
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("skill:registry:read", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:read", null);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-string id", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:read", { id: 42 });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns skill content on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:read", { id: "sk-1" });
      expect(res.ok).toBe(true);
      const data = res.data as { id: string; content: string };
      expect(data.id).toBe("sk-1");
    });
  });

  describe("skill:registry:write", () => {
    it("rejects non-string id", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:write", {
        id: 42,
        content: "text",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-string content", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:write", {
        id: "sk-1",
        content: 42,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("writes skill on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:write", {
        id: "sk-1",
        content: "new content",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("skill:registry:toggle", () => {
    it("rejects non-boolean enabled", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:toggle", {
        id: "sk-1",
        enabled: "yes",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-string id", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:toggle", {
        id: 42,
        enabled: true,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("toggles skill on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:toggle", {
        id: "sk-1",
        enabled: false,
      });
      expect(res.ok).toBe(true);
    });

    it("supports legacy skillId field", async () => {
      const { invoke, logger } = createHarness();
      const res = await invoke("skill:registry:toggle", {
        skillId: "sk-1",
        enabled: true,
      });
      expect(res.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        "deprecated_field",
        expect.objectContaining({ field: "skillId" }),
      );
    });

    it("rejects non-string skillId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:registry:toggle", {
        skillId: 123,
        enabled: true,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── Custom skill handlers ──

  describe("skill:custom:create", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:create", "bad");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("creates custom skill on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:create", {
        name: "My Skill",
        description: "desc",
        promptTemplate: "template",
        inputType: "text",
        contextRules: {},
        scope: "global",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { skill: { id: string } };
      expect(data.skill.id).toBe("custom-1");
    });
  });

  describe("skill:custom:update", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:update", null);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("updates custom skill on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:update", {
        id: "custom-1",
        name: "Updated",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("skill:custom:list", () => {
    it("returns custom skills list", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:list");
      expect(res.ok).toBe(true);
      const data = res.data as { items: unknown[] };
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe("skill:custom:delete", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:delete", "bad");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-string id", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:delete", { id: 42 });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("deletes custom skill on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("skill:custom:delete", { id: "custom-1" });
      expect(res.ok).toBe(true);
      const data = res.data as { deleted: boolean };
      expect(data.deleted).toBe(true);
    });
  });
});
