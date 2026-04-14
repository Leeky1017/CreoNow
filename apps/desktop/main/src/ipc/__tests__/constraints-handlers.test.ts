import { describe, it, expect, beforeEach, vi } from "vitest";

import type { IpcMain } from "electron";
import type { IpcResponse } from "@shared/types/ipc-generated";

import { registerConstraintsIpcHandlers } from "../constraints";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("../../services/context/contextFs", () => ({
  ensureCreonowDirStructure: vi.fn().mockReturnValue({ ok: true, data: true }),
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createMockLogger() {
  return { logPath: "", info: vi.fn(), error: vi.fn() };
}

function createMockDb(projectRoot = "/project/root") {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({ rootPath: projectRoot }),
    }),
  };
}

type Harness = {
  handlers: Map<string, Handler>;
  invoke: <T>(channel: string, payload: unknown) => Promise<IpcResponse<T>>;
  logger: ReturnType<typeof createMockLogger>;
};

function createHarness(args?: { db?: unknown; useNullDb?: boolean }): Harness {
  const handlers = new Map<string, Handler>();
  const logger = createMockLogger();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const dbValue = args?.useNullDb ? null : (args?.db ?? createMockDb());

  registerConstraintsIpcHandlers({
    ipcMain,
    db: dbValue as never,
    logger,
  });

  return {
    handlers,
    logger,
    invoke: async <T>(channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({}, payload) as Promise<IpcResponse<T>>;
    },
  };
}

describe("registerConstraintsIpcHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handler registration", () => {
    it("should register all 5 constraint channels", () => {
      const { handlers } = createHarness();
      expect(handlers.has("constraints:policy:list")).toBe(true);
      expect(handlers.has("constraints:policy:create")).toBe(true);
      expect(handlers.has("constraints:policy:update")).toBe(true);
      expect(handlers.has("constraints:policy:delete")).toBe(true);
      expect(handlers.has("constraints:policy:get")).toBe(true);
    });

    it("should register legacy set handler", () => {
      const { handlers } = createHarness();
      expect(handlers.has("constraints:policy:set")).toBe(true);
    });
  });

  describe("constraints:policy:list", () => {
    it("should return DB_ERROR when database is null", async () => {
      const { invoke } = createHarness({ useNullDb: true });
      const result = await invoke("constraints:policy:list", {
        projectId: "proj-1",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
    });

    it("should reject non-object payload", async () => {
      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:list", "not-an-object");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should reject missing projectId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:list", {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should reject empty projectId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:list", {
        projectId: "  ",
      });
      expect(result.ok).toBe(false);
    });

    it("should return NOT_FOUND when project does not exist", async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        }),
      };
      const { invoke } = createHarness({ db });
      const result = await invoke("constraints:policy:list", {
        projectId: "missing-project",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should return empty constraints for new project (ENOENT)", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke<{ constraints: unknown[] }>(
        "constraints:policy:list",
        { projectId: "proj-1" },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.constraints).toEqual([]);
      }
    });

    it("should return parsed V2 constraints from file", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "保持中文",
            source: "user",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke<{ constraints: Array<{ id: string }> }>(
        "constraints:policy:list",
        { projectId: "proj-1" },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.constraints).toHaveLength(1);
        expect(result.data.constraints[0].id).toBe("c1");
      }
    });
  });

  describe("constraints:policy:create", () => {
    it("should reject empty constraint text", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
        constraint: { text: "  " },
      });
      expect(result.ok).toBe(false);
    });

    it("should reject non-user source", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
        constraint: { text: "rule", source: "kg" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_SCOPE_VIOLATION");
      }
    });

    it("should reject negative priority", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
        constraint: { text: "rule", priority: -5 },
      });
      expect(result.ok).toBe(false);
    });

    it("should create constraint successfully", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);
      (fsMock.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { invoke } = createHarness();
      const result = await invoke<{ constraint: { id: string; text: string } }>(
        "constraints:policy:create",
        {
          projectId: "proj-1",
          constraint: { text: "保持中文写作" },
        },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.constraint.text).toBe("保持中文写作");
        expect(result.data.constraint.id).toBeTruthy();
      }
    });

    it("should log write failure context and preserve IO_ERROR on create", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      const writeError = new Error("EACCES: permission denied");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);
      (fsMock.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(writeError);

      const { invoke, logger } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
        constraint: { text: "保持中文写作" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
      }
      expect(logger.error).toHaveBeenCalledWith(
        "constraints_file_write_failed",
        expect.objectContaining({
          path: expect.stringContaining("constraints.json"),
          message: writeError.message,
        }),
      );
    });

    it("should reject duplicate constraint", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "保持中文",
            source: "user",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
        constraint: { text: "保持中文" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONSTRAINT_CONFLICT");
      }
    });

    it("should reject missing constraint object", async () => {
      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:create", {
        projectId: "proj-1",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  describe("constraints:policy:update", () => {
    it("should reject empty constraintId", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:update", {
        projectId: "proj-1",
        constraintId: "  ",
        patch: { text: "new" },
      });
      expect(result.ok).toBe(false);
    });

    it("should reject empty patch", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:update", {
        projectId: "proj-1",
        constraintId: "c1",
        patch: {},
      });
      expect(result.ok).toBe(false);
    });

    it("should reject patch with empty text", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "original",
            source: "user",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:update", {
        projectId: "proj-1",
        constraintId: "c1",
        patch: { text: "  " },
      });
      expect(result.ok).toBe(false);
    });

    it("should return CONSTRAINT_NOT_FOUND for unknown constraint", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:update", {
        projectId: "proj-1",
        constraintId: "nonexistent",
        patch: { text: "updated" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONSTRAINT_NOT_FOUND");
      }
    });

    it("should reject updating KG constraint", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "KG rule",
            source: "kg",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:update", {
        projectId: "proj-1",
        constraintId: "c1",
        patch: { text: "modified" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_SCOPE_VIOLATION");
      }
    });
  });

  describe("constraints:policy:delete", () => {
    it("should return CONSTRAINT_NOT_FOUND for unknown constraint", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(enoent);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:delete", {
        projectId: "proj-1",
        constraintId: "ghost",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONSTRAINT_NOT_FOUND");
      }
    });

    it("should reject deleting KG constraint", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "KG rule",
            source: "kg",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:delete", {
        projectId: "proj-1",
        constraintId: "c1",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_SCOPE_VIOLATION");
      }
    });

    it("should delete user constraint successfully", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "user rule",
            source: "user",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );
      (fsMock.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { invoke } = createHarness();
      const result = await invoke<{ deletedConstraintId: string }>(
        "constraints:policy:delete",
        { projectId: "proj-1", constraintId: "c1" },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.deletedConstraintId).toBe("c1");
      }
    });
  });

  describe("constraints:policy:get (legacy)", () => {
    it("should return legacy format (V1)", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      const store = {
        version: 2,
        items: [
          {
            id: "c1",
            text: "user rule",
            source: "user",
            priority: 100,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
          {
            id: "c2",
            text: "kg rule",
            source: "kg",
            priority: 50,
            updatedAt: "2024-01-01T00:00:00.000Z",
            degradable: false,
          },
        ],
      };
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(store),
      );

      const { invoke } = createHarness();
      const result = await invoke<{
        constraints: { version: number; items: string[] };
      }>("constraints:policy:get", { projectId: "proj-1" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.constraints.version).toBe(1);
        // Only user items in legacy
        expect(result.data.constraints.items).toEqual(["user rule"]);
      }
    });
  });

  describe("constraints:policy:set (legacy)", () => {
    it("should reject invalid legacy constraints schema", async () => {
      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:set", {
        projectId: "proj-1",
        constraints: { version: 99, items: [] },
      });
      expect(result.ok).toBe(false);
    });

    it("should accept valid legacy constraints", async () => {
      const fsMock = (await import("node:fs/promises")).default;
      (fsMock.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { invoke } = createHarness();
      const result = await invoke("constraints:policy:set", {
        projectId: "proj-1",
        constraints: { version: 1, items: ["规则一", "规则二"] },
      });
      expect(result.ok).toBe(true);
    });
  });
});
